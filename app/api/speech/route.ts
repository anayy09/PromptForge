import { NextResponse } from "next/server";
import { SpeechRequestSchema } from "@/lib/schema";
import { synthesizeSpeech, isConfigured, isModelAvailable } from "@/lib/client";
import { getSpeechModel } from "@/lib/registry";

export const runtime = "nodejs";
export const maxDuration = 60;

// Endpoint-specific default voice for Kokoro. Overridable per request; a bad
// value degrades to a clean 502 rather than crashing.
const DEFAULT_VOICE = "af_sky";

export async function POST(req: Request) {
  if (!isConfigured()) {
    return NextResponse.json({ error: "Endpoint not configured." }, { status: 503 });
  }

  const model = getSpeechModel();
  if (!model || !isModelAvailable(model.id)) {
    return NextResponse.json({ error: "No text-to-speech model available." }, { status: 400 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = SpeechRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  try {
    const audio = await synthesizeSpeech(model.id, parsed.data.text, parsed.data.voice ?? DEFAULT_VOICE);
    return new Response(audio, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[speech] failed:", err);
    return NextResponse.json(
      { error: "Text-to-speech is not available on this endpoint." },
      { status: 502 },
    );
  }
}
