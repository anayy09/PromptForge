import { NextResponse } from "next/server";
import { OptimizeRequestSchema, type OptimizeResponse } from "@/lib/schema";
import { buildMetaPrompt } from "@/lib/meta-prompt";
import { callOptimize, isConfigured } from "@/lib/client";
import { CATEGORIES } from "@/lib/categories";
import { getAll, getById, getRewriters } from "@/lib/registry";

export const runtime = "nodejs";
// Best-of-N fans out several rewrites + target runs + a judge. Runs are
// parallelized, but this is the most call-heavy route; keep N small.
export const maxDuration = 60;

const TARGET_PREFERENCE = ["llama-3.3-70b-instruct", "gpt-oss-120b", "mistral-small-3.1"];
const JUDGE_PREFERENCE = ["gpt-oss-120b", "nemotron-3-super-120b-a12b", "llama-3.3-70b-instruct"];

const isTextModel = (id: string): boolean =>
  !!getById(id)?.outputModalities.includes("Text");

function firstTextModel(pref: string[], exclude?: string): string | null {
  for (const id of pref) if (id !== exclude && isTextModel(id)) return id;
  const any = getAll().find((m) => m.id !== exclude && m.outputModalities.includes("Text"));
  return any?.id ?? null;
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

  const parsed = OptimizeRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }
  const { rawPrompt, category, knobs, targetId, candidates } = parsed.data;

  // Resolve rewriter (must be a valid text rewriter; no codestral etc.).
  const rewriterId = parsed.data.rewriterId ?? CATEGORIES[category].defaultRewriterId;
  if (!getRewriters().some((m) => m.id === rewriterId)) {
    return NextResponse.json({ error: `${rewriterId} is not a valid rewriter.` }, { status: 400 });
  }

  // Resolve a text target (image/multimodal targets cannot be run-and-judged).
  let resolvedTarget: string | null;
  if (targetId) {
    if (!isTextModel(targetId)) {
      return NextResponse.json(
        { error: "Optimization can only run against text-output target models." },
        { status: 400 },
      );
    }
    resolvedTarget = targetId;
  } else {
    resolvedTarget = firstTextModel(TARGET_PREFERENCE);
  }
  if (!resolvedTarget) {
    return NextResponse.json({ error: "No text target model available." }, { status: 503 });
  }

  const judgeId = firstTextModel(JUDGE_PREFERENCE, resolvedTarget);
  if (!judgeId) {
    return NextResponse.json({ error: "No judge model available." }, { status: 503 });
  }

  const target = getById(resolvedTarget)!;
  const judge = getById(judgeId)!;
  const { system, user } = buildMetaPrompt(category, rawPrompt, knobs ?? {}, target.name);

  try {
    const r = await callOptimize(
      system,
      user,
      rewriterId,
      resolvedTarget,
      judgeId,
      rawPrompt,
      candidates ?? 3,
    );
    if (r.candidates.length === 0) {
      return NextResponse.json({ error: "No candidates were produced." }, { status: 502 });
    }
    const body: OptimizeResponse = {
      best: r.candidates[0],
      candidates: r.candidates,
      reasoning: r.reasoning,
      target: { id: target.id, name: target.name },
      judge: { id: judge.id, name: judge.name },
      usage: r.usage,
      cost: r.cost,
      costApproximate: false,
    };
    return NextResponse.json(body);
  } catch (err) {
    console.error("[optimize] failed:", err);
    return NextResponse.json({ error: "Optimization failed. Try again." }, { status: 502 });
  }
}
