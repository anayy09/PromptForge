import { NextResponse } from "next/server";
import type { TranscribeResponse } from "@/lib/schema";
import { transcribeAudio, isConfigured, isModelAvailable } from "@/lib/client";
import { getTranscribeModel } from "@/lib/registry";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!isConfigured()) {
    return NextResponse.json({ error: "Endpoint not configured." }, { status: 503 });
  }

  const model = getTranscribeModel();
  if (!model || !isModelAvailable(model.id)) {
    return NextResponse.json({ error: "No speech-to-text model available." }, { status: 400 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form-data." }, { status: 400 });
  }

  const file = form.get("audio");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No audio uploaded." }, { status: 400 });
  }
  // Guard against oversized uploads (roughly a few minutes of audio).
  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: "Audio is too long." }, { status: 413 });
  }

  try {
    const text = await transcribeAudio(model.id, file);
    const body: TranscribeResponse = { text };
    return NextResponse.json(body);
  } catch (err) {
    console.error("[transcribe] failed:", err);
    return NextResponse.json(
      { error: "Transcription is not available on this endpoint." },
      { status: 502 },
    );
  }
}
