import { NextResponse } from "next/server";
import type OpenAI from "openai";
import { ChatRequestSchema } from "@/lib/schema";
import { streamChat, isConfigured } from "@/lib/client";
import { getChatModels, supportsVision } from "@/lib/registry";

export const runtime = "nodejs";
export const maxDuration = 60;

// Light system message. Chat ANSWERS the user (unlike the enhancer). Kept minimal
// so the underlying model's own behavior comes through.
const SYSTEM =
  "You are a helpful, concise assistant inside PromptForge. Answer directly and format with Markdown when it helps. If a request is ambiguous, make a reasonable assumption and say so briefly.";

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

  const parsed = ChatRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }
  const { modelId, messages } = parsed.data;

  // Only registry chat models may be used, so this can't become an open proxy to
  // arbitrary backend model names.
  const model = getChatModels().find((m) => m.id === modelId);
  if (!model) {
    return NextResponse.json({ error: "Unknown or unsupported chat model." }, { status: 400 });
  }

  // Vision: when the model accepts image input, fold a user turn's attachments
  // into multimodal content parts. Otherwise images are dropped (text only).
  const vision = supportsVision(model.id);
  const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM },
    ...messages.map((m): OpenAI.Chat.ChatCompletionMessageParam => {
      if (vision && m.role === "user" && m.images?.length) {
        const parts: OpenAI.Chat.ChatCompletionContentPart[] = [];
        if (m.content) parts.push({ type: "text", text: m.content });
        for (const url of m.images) parts.push({ type: "image_url", image_url: { url } });
        return { role: "user", content: parts };
      }
      return { role: m.role, content: m.content };
    }),
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const delta of streamChat(model.id, chatMessages)) {
          controller.enqueue(encoder.encode(delta));
        }
      } catch (err) {
        // Do not leak the key or raw endpoint errors (hard rule #4). Mid-stream
        // we can only append a short notice; the client shows whatever arrived.
        console.error("[chat] stream failed:", err);
        controller.enqueue(encoder.encode("\n\n_(The response was interrupted. Please try again.)_"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
