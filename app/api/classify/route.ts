import { NextResponse } from "next/server";
import { ClassifyRequestSchema, type ClassifyResponse } from "@/lib/schema";
import { callClassifier, isConfigured } from "@/lib/client";
import { CATEGORIES } from "@/lib/categories";
import { getById, getCheapestRewriter, getRewriters } from "@/lib/registry";

export const runtime = "nodejs";

// Auto-route uses a cheap, fast model. Prefer these; fall back to the cheapest
// available rewriter so the feature works on any registry.
const CLASSIFIER_PREFERENCE = ["gpt-oss-20b", "nemotron-3-nano-30b-a3b", "mistral-7b-instruct"];

function pickClassifier(): string | null {
  const valid = new Set(getRewriters().map((m) => m.id));
  for (const id of CLASSIFIER_PREFERENCE) if (valid.has(id)) return id;
  return getCheapestRewriter()?.id ?? null;
}

export async function POST(req: Request) {
  if (!isConfigured()) {
    return NextResponse.json(
      { error: "Endpoint not configured. Set MODEL_API_BASE_URL and MODEL_API_KEY." },
      { status: 503 },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ClassifyRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const modelId = pickClassifier();
  if (!modelId || !getById(modelId)) {
    return NextResponse.json({ error: "No classifier model available." }, { status: 503 });
  }

  try {
    const { output } = await callClassifier(modelId, parsed.data.rawPrompt);
    const body: ClassifyResponse = {
      ...output,
      suggestedRewriterId: CATEGORIES[output.category].defaultRewriterId,
    };
    return NextResponse.json(body);
  } catch (err) {
    // Never leak the key or endpoint (hard rule #4).
    console.error("[classify] failed:", err);
    return NextResponse.json({ error: "Auto-route failed. Pick a category manually." }, { status: 502 });
  }
}
