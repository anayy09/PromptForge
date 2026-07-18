import { NextResponse } from "next/server";
import { EnhanceRequestSchema, type EnhanceResponse, type ForgeMethod } from "@/lib/schema";
import { buildMetaPrompt } from "@/lib/meta-prompt";
import {
  callRewriter,
  callVariants,
  callReflexion,
  callEnsemble,
  isConfigured,
  isModelAvailable,
  availableOf,
  resolveAvailableRewriter,
} from "@/lib/client";
import { CATEGORIES } from "@/lib/categories";
import { getById, getRewriters, costFor } from "@/lib/registry";
import { estimatePromptTokens, estimateTokens } from "@/lib/tokens";

export const runtime = "nodejs";

// Preferred fillers for an auto-picked ensemble roster: strong, diverse text
// rewriters across both providers. Only rewriters whose provider is configured
// are actually used.
const ENSEMBLE_POOL = [
  "gpt-oss-120b",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "nemotron-3-super-120b-a12b",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "gemma-4-31b-it",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "mistral-small-3.1",
  "llama-3.3-70b-instruct",
];

// Ensemble judge preference: a strong reasoning model from either provider.
const JUDGE_POOL = ["gpt-oss-120b", "nvidia/nemotron-3-ultra-550b-a55b:free"];

/** Build a 3-model ensemble roster seeded with the chosen rewriter. */
function defaultEnsemble(primaryId: string, validIds: Set<string>): string[] {
  const roster = [primaryId];
  for (const id of ENSEMBLE_POOL) {
    if (roster.length >= 3) break;
    if (id !== primaryId && validIds.has(id)) roster.push(id);
  }
  return roster;
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

  const parsed = EnhanceRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }
  const { rawPrompt, category, rewriterId, targetId, knobs, variants, ensembleIds, rounds } =
    parsed.data;
  const mode = parsed.data.mode ?? "single";

  // Resolve rewriter: explicit override, else category default. A default whose
  // provider is not configured falls back to the strongest available rewriter.
  const modelId = rewriterId ?? resolveAvailableRewriter(CATEGORIES[category].defaultRewriterId);
  if (!modelId) {
    return NextResponse.json({ error: "No rewriter model is available." }, { status: 503 });
  }
  const model = getById(modelId);
  if (!model) {
    return NextResponse.json({ error: `Unknown model: ${modelId}` }, { status: 400 });
  }

  // Enforce hard rule #3 at the boundary: only text rewriters may rewrite.
  const validRewriterIds = new Set(getRewriters().map((m) => m.id));
  if (!validRewriterIds.has(modelId)) {
    return NextResponse.json(
      { error: `${model.name} is not a valid rewriter (it does not output text).` },
      { status: 400 },
    );
  }
  // An explicitly picked rewriter must be on a configured provider.
  if (!isModelAvailable(modelId)) {
    return NextResponse.json(
      { error: `${model.name} is not available right now.` },
      { status: 503 },
    );
  }

  const target = targetId ? getById(targetId) : undefined;
  const { system, user } = buildMetaPrompt(category, rawPrompt, knobs ?? {}, target?.name);

  try {
    let output;
    let usage: { promptTokens: number; completionTokens: number } | null = null;
    let precomputedCost: number | null | undefined; // set by ensemble (multi-model)
    let method: ForgeMethod | undefined;

    if (mode === "ensemble") {
      // Roster: explicit (validated) or an auto-picked default seeded with
      // modelId. Only rewriters on configured providers can join.
      const availableRewriterIds = new Set(availableOf(getRewriters()).map((m) => m.id));
      const requested = (ensembleIds ?? []).filter((id) => availableRewriterIds.has(id));
      const roster =
        requested.length >= 2 ? requested.slice(0, 5) : defaultEnsemble(modelId, availableRewriterIds);
      // Judge: a strong general rewriter from either provider, else the primary.
      const judgeId = JUDGE_POOL.find((id) => availableRewriterIds.has(id)) ?? modelId;
      const r = await callEnsemble(roster, system, user, judgeId);
      output = r.output;
      usage = r.usage;
      precomputedCost = r.cost;
      method = { mode, contributors: r.contributors, judge: r.judge, rationale: r.rationale };
    } else if (mode === "reflexion") {
      const r = await callReflexion(model.id, system, user, rounds ?? 2);
      output = r.output;
      usage = r.usage;
      method = { mode, rounds: r.trace };
    } else {
      const r = await callRewriter(model.id, system, user);
      output = r.output;
      usage = r.usage;
    }

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
    // Ensemble spans models with different prices, so it computes its own cost.
    const cost = precomputedCost !== undefined ? precomputedCost : costFor(modelId, promptTokens, completionTokens);

    const body: EnhanceResponse = {
      ...output,
      variants: variantList,
      model: { id: model.id, name: model.name },
      target: target ? { id: target.id, name: target.name } : null,
      usage: usage ?? { promptTokens, completionTokens },
      cost,
      costApproximate,
      category,
      method,
    };
    return NextResponse.json(body);
  } catch (err) {
    // Do not leak the key or raw endpoint errors to the client (hard rule #4).
    console.error("[enhance] failed:", err);
    return NextResponse.json({ error: "Enhancement failed. Try again." }, { status: 502 });
  }
}
