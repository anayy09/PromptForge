import { NextResponse } from "next/server";
import { ImageRequestSchema, type ImageResponse } from "@/lib/schema";
import { generateImage, editImage, isConfigured } from "@/lib/client";
import { getImageModels } from "@/lib/registry";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!isConfigured()) {
    return NextResponse.json({ error: "Endpoint not configured." }, { status: 503 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ImageRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }
  const { modelId, prompt, image: refImage } = parsed.data;

  const model = getImageModels().find((m) => m.id === modelId);
  if (!model) {
    return NextResponse.json({ error: "Unknown or unsupported image model." }, { status: 400 });
  }

  try {
    // When a reference image is provided, use the OpenAI-compatible
    // /v1/images/edits endpoint; otherwise use /v1/images/generations.
    const image = refImage
      ? await editImage(model.id, prompt, refImage)
      : await generateImage(model.id, prompt);
    const body: ImageResponse = { image, model: { id: model.id, name: model.name } };
    return NextResponse.json(body);
  } catch (err) {
    console.error("[image] failed:", err);
    return NextResponse.json(
      { error: "Image generation is not available on this endpoint." },
      { status: 502 },
    );
  }
}
