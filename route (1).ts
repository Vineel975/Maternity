/**
 * POST /api/audit/start
 *
 * Fire-and-return endpoint used by the Spectra iframe integration.
 * Unlike /api/audit (which polls until completion), this endpoint
 * uploads the file, creates the Convex job, and immediately returns
 * the jobId. The iframe then navigates to /job/[id]?embedded=1 and
 * Convex real-time subscriptions handle the rest.
 *
 * Request: multipart/form-data
 *   claimId        string   required
 *   medicalBill    PDF file required
 *   tariffBill     PDF file optional
 *   policyWordings string   optional
 *
 * Response (success):
 *   { success: true,  jobId: string, claimId: string }
 *
 * Response (error):
 *   { success: false, error: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { processSinglePdf } from "@/src/extract";
import { fetchModels } from "@tokenlens/fetch";

// Allow up to 2 minutes for large PDF uploads to Convex storage
export const maxDuration = 120;


const CONVEX_URL =
  process.env.CONVEX_URL_PUBLIC ??
  process.env.NEXT_PUBLIC_CONVEX_URL;

async function uploadToConvex(
  convex: ConvexHttpClient,
  buffer: ArrayBuffer,
  mimeType: string,
  retries = 3,
): Promise<Id<"_storage">> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Generate a fresh upload URL for each attempt
      const uploadUrl: string = await convex.mutation(
        api.jobMutations.generateUploadUrl,
        {},
      );

      // 2-minute timeout as per Convex docs for large file uploads
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": mimeType },
        body: buffer,
        signal: AbortSignal.timeout(120_000), // 2 minutes
      });

      if (!uploadResponse.ok) {
        throw new Error(
          `Convex storage upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`,
        );
      }

      const { storageId } = (await uploadResponse.json()) as {
        storageId: Id<"_storage">;
      };
      return storageId;

    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(`[uploadToConvex] Attempt ${attempt}/${retries} failed:`, lastError.message);

      // Don't retry on the last attempt
      if (attempt < retries) {
        // Wait 2s before retrying
        await new Promise((res) => setTimeout(res, 2000));
      }
    }
  }

  throw lastError ?? new Error("Upload failed after all retries");
}

export async function POST(request: NextRequest) {
  // ── 1. Parse multipart form data ──────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { success: false, error: "Request must be multipart/form-data." },
      { status: 400 },
    );
  }

  const claimId = (formData.get("claimId") as string | null)?.trim();
  const medicalBill = formData.get("medicalBill") as File | null;
  const tariffBill = formData.get("tariffBill") as File | null;
  const policyWordings =
    (formData.get("policyWordings") as string | null)?.trim() || undefined;

  // Parse spectraFields sent by Spectra as a multipart JSON string
  let spectraFields: Record<string, unknown> | undefined;
  const spectraFieldsRaw = (formData.get("spectraFields") as string | null)?.trim();
  if (spectraFieldsRaw) {
    try { spectraFields = JSON.parse(spectraFieldsRaw); } catch { /* ignore parse errors */ }
  }

  if (!claimId) {
    return NextResponse.json(
      { success: false, error: "claimId is required." },
      { status: 400 },
    );
  }
  if (!medicalBill || medicalBill.size === 0) {
    return NextResponse.json(
      { success: false, error: "medicalBill (PDF) is required." },
      { status: 400 },
    );
  }
  if (medicalBill.type !== "application/pdf") {
    return NextResponse.json(
      { success: false, error: "medicalBill must be a PDF file." },
      { status: 400 },
    );
  }
  if (tariffBill && tariffBill.size > 0 && tariffBill.type !== "application/pdf") {
    return NextResponse.json(
      { success: false, error: "tariffBill must be a PDF file." },
      { status: 400 },
    );
  }

  const convex = new ConvexHttpClient(CONVEX_URL!);

  // ── 2. Read PDF bytes (already in memory from formData) ───────────────────
  const hospitalBuffer = Buffer.from(await medicalBill.arrayBuffer());
  const hospitalSizeMb = (hospitalBuffer.byteLength / 1024 / 1024).toFixed(2);
  console.log(`[audit/start] Medical bill size: ${hospitalSizeMb} MB`);

  let tariffBuffer: Buffer | undefined;
  if (tariffBill && tariffBill.size > 0) {
    tariffBuffer = Buffer.from(await tariffBill.arrayBuffer());
  }

  // ── 3. Create Convex job (pending) ────────────────────────────────────────
  let jobId: Id<"processJob">;
  try {
    jobId = await convex.mutation(api.jobMutations.createJobAndProcess, {
      claimId,
      hospitalFileName: medicalBill.name || "medical-bill.pdf",
      spectraFields,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: `Failed to create job: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    );
  }

  // ── 4. Process PDF synchronously then return jobId ──────────────────────────
  // Cannot fire-and-forget in Next.js — serverless kills background tasks on response.
  // maxDuration = 120 gives us 2 minutes to process before returning.
  try {
    // Mark job as processing
    await convex.mutation(api.jobMutations.updateJobStatus, {
      jobId,
      status: "processing",
    });

    const modelName = process.env.MODEL_NAME || "google/gemini-3-flash-preview";
    const provider   = process.env.MODEL_PROVIDER || "openrouter";
    const providers  = await fetchModels();
    const claimType  = (spectraFields?.claimType as string) ?? "cataract";

    const { result, totals } = await processSinglePdf({
      fileName: medicalBill.name || "medical-bill.pdf",
      pdfBuffer: hospitalBuffer,
      modelName,
      provider: (provider === "openai" ? "openai" : "openrouter") as "openai" | "openrouter",
      providers,
      claimType: claimType as "cataract" | "maternity" | "other",
    });

    // Save completed result to Convex
    await convex.mutation(api.jobMutations.completeJobWithResult, {
      jobId,
      analysis: result,
      status: "completed",
      successCount: 1,
      errorCount: 0,
      totalCost:                totals.totalCost,
      totalTokens:              totals.totalTokens,
      totalPromptTokens:        totals.totalPromptTokens,
      totalCompletionTokens:    totals.totalCompletionTokens,
    });
  } catch (err) {
    console.error("[audit/start] Processing error:", err);
    await convex.mutation(api.jobMutations.completeJobWithResult, {
      jobId,
      analysis: null,
      status: "error",
      successCount: 0,
      errorCount: 1,
      error: err instanceof Error ? err.message : String(err),
    }).catch(() => {});
  }

  // Return jobId — UI polls Convex for real-time result updates
  return NextResponse.json(
    { success: true, jobId: jobId as string, claimId },
    { status: 200 },
  );
}

// Handle CORS preflight from Spectra
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
