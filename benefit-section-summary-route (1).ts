import { NextRequest, NextResponse } from "next/server";
import { benefitSectionSummaryPrompt } from "@/src/prompts";
import { generateText } from "ai";
import { getModel } from "@/src/model-provider";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      section?: "ailment" | "exclusions" | "copay" | "maternity";
      rawText?: string;
    };

    const section = body?.section;
    const rawText = (body?.rawText ?? "").trim();

    if (!section || !rawText) {
      return NextResponse.json({ summary: `No ${section ?? "section"} information available.` });
    }

    const { text } = await generateText({
      model: getModel({ provider: "openrouter", modelName: "anthropic/claude-sonnet-4-5" }),
      prompt: benefitSectionSummaryPrompt(section, rawText),
    });

    return NextResponse.json({ summary: text.trim() });
  } catch (e) {
    console.error("[benefit-section-summary] error:", e);
    return NextResponse.json({ summary: "Summary unavailable." }, { status: 500 });
  }
}
