import { NextResponse } from "next/server";
import { ImageRequestSchema, type ImageResponse } from "@/lib/schema";
import { generateImage, isConfigured } from "@/lib/client";
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
  const { modelId, prompt } = parsed.data;

  const model = getImageModels().find((m) => m.id === modelId);
  if (!model) {
    return NextResponse.json({ error: "Unknown or unsupported image model." }, { status: 400 });
  }

  try {
    const image = await generateImage(model.id, prompt);
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
