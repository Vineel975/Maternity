import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { getModel } from "@/src/model-provider";

export async function POST(request: NextRequest) {
  try {
    const { diagnosis } = (await request.json()) as { diagnosis: string };

    if (!diagnosis?.trim()) {
      return NextResponse.json({ claimType: "other" });
    }

    const { text } = await generateText({
      model: getModel({ provider: "openrouter", modelName: "anthropic/claude-sonnet-4-5" }),
      prompt: `You are a medical claim classifier. Based on the diagnosis text below, classify the claim into one of these types:
- "cataract" — if the diagnosis is about cataract, lens replacement, phacoemulsification, or any eye lens surgery
- "maternity" — if the diagnosis is about pregnancy, delivery, caesarean, C-section, maternity, antenatal, postnatal, obstetric, or childbirth
- "other" — for anything else

Diagnosis: "${diagnosis}"

Reply with ONLY one word: cataract, maternity, or other.`,
    });

    const claimType = text.trim().toLowerCase();
    const valid = ["cataract", "maternity", "other"];
    return NextResponse.json({
      claimType: valid.includes(claimType) ? claimType : "other",
      diagnosis,
    });
  } catch (e) {
    console.error("[classify-claim-type] error:", e);
    return NextResponse.json({ claimType: "other" });
  }
}
