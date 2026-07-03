import { NextResponse } from "next/server";
import { EnhanceRequestSchema, type EnhanceResponse } from "@/lib/schema";
import { buildMetaPrompt } from "@/lib/meta-prompt";
import { callRewriter, callVariants, isConfigured } from "@/lib/client";
import { CATEGORIES } from "@/lib/categories";
import { getById, getRewriters, costFor } from "@/lib/registry";
import { estimatePromptTokens, estimateTokens } from "@/lib/tokens";

export const runtime = "nodejs";

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

  const parsed = EnhanceRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }
  const { rawPrompt, category, rewriterId, targetId, knobs, variants } = parsed.data;

  // Resolve rewriter: explicit override, else category default, else fail clearly.
  const modelId = rewriterId ?? CATEGORIES[category].defaultRewriterId;
  const model = getById(modelId);
  if (!model) {
    return NextResponse.json({ error: `Unknown model: ${modelId}` }, { status: 400 });
  }

  // Enforce hard rule #3 at the boundary: only text rewriters may rewrite.
  if (!getRewriters().some((m) => m.id === modelId)) {
    return NextResponse.json(
      { error: `${model.name} is not a valid rewriter (it does not output text).` },
      { status: 400 },
    );
  }

  const target = targetId ? getById(targetId) : undefined;
  const { system, user } = buildMetaPrompt(category, rawPrompt, knobs ?? {}, target?.name);

  try {
    const { output, usage } = await callRewriter(model.id, system, user);

    let variantList: string[] | undefined;
    if (variants) {
      variantList = await callVariants(model.id, system, user, output.enhancedPrompt);
    }

    // Cost: prefer real usage; fall back to a local estimate and flag it.
    let promptTokens: number;
    let completionTokens: number;
    let costApproximate = false;
    if (usage) {
      promptTokens = usage.promptTokens;
      completionTokens = usage.completionTokens;
    } else {
      promptTokens = estimatePromptTokens(system, user);
      completionTokens = estimateTokens(JSON.stringify(output));
      costApproximate = true;
    }
    const cost = costFor(modelId, promptTokens, completionTokens);

    const body: EnhanceResponse = {
      ...output,
      variants: variantList,
      model: { id: model.id, name: model.name, path: model.path },
      target: target ? { id: target.id, name: target.name } : null,
      usage: usage ?? { promptTokens, completionTokens },
      cost,
      costApproximate,
      category,
    };
    return NextResponse.json(body);
  } catch (err) {
    // Do not leak the key or raw endpoint errors to the client (hard rule #4).
    console.error("[enhance] failed:", err);
    return NextResponse.json({ error: "Enhancement failed. Try again." }, { status: 502 });
  }
}
