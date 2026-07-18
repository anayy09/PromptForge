import { NextResponse } from "next/server";
import { ClassifyRequestSchema, type ClassifyResponse } from "@/lib/schema";
import { availableOf, callClassifier, isConfigured } from "@/lib/client";
import { CATEGORIES } from "@/lib/categories";
import { getById, getRewriters } from "@/lib/registry";

export const runtime = "nodejs";

// Auto-route uses a small, fast model from whichever provider is configured;
// fall back to any available rewriter so the feature works on any registry.
const CLASSIFIER_PREFERENCE = [
  "gpt-oss-20b",
  "openai/gpt-oss-20b:free",
  "nemotron-3-nano-30b-a3b",
  "nvidia/nemotron-3-nano-30b-a3b:free",
  "mistral-7b-instruct",
];

function pickClassifier(): string | null {
  const available = availableOf(getRewriters());
  const ids = new Set(available.map((m) => m.id));
  for (const id of CLASSIFIER_PREFERENCE) if (ids.has(id)) return id;
  return available[0]?.id ?? null;
}

export async function POST(req: Request) {
  if (!isConfigured()) {
    return NextResponse.json(
      { error: "No model endpoint is configured." },
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
