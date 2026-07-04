import { NextResponse } from "next/server";
import { EvalRequestSchema, type EvalResponse } from "@/lib/schema";
import { callEval, isConfigured } from "@/lib/client";
import { getAll, getById } from "@/lib/registry";

export const runtime = "nodejs";
// Two target runs plus a judge call. On Vercel this can approach the serverless
// time limit; the two target runs execute in parallel to stay within it.
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

  const parsed = EvalRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }
  const { rawPrompt, enhancedPrompt, targetId } = parsed.data;

  // Resolve a text target. A picked target must emit text; image/audio targets
  // cannot be run-and-judged here.
  let resolvedTarget: string | null;
  if (targetId) {
    if (!isTextModel(targetId)) {
      return NextResponse.json(
        { error: "The Proving Ground can only run text-output target models." },
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

  // Judge must differ from the target to avoid self-preference.
  const judgeId = firstTextModel(JUDGE_PREFERENCE, resolvedTarget);
  if (!judgeId) {
    return NextResponse.json({ error: "No judge model available." }, { status: 503 });
  }

  const target = getById(resolvedTarget)!;
  const judge = getById(judgeId)!;

  try {
    const r = await callEval(resolvedTarget, judgeId, rawPrompt, enhancedPrompt);
    const body: EvalResponse = {
      winner: r.winner,
      reasoning: r.reasoning,
      rawScore: r.rawScore,
      enhancedScore: r.enhancedScore,
      rawOutput: r.rawOutput,
      enhancedOutput: r.enhancedOutput,
      target: { id: target.id, name: target.name },
      judge: { id: judge.id, name: judge.name },
      usage: r.usage,
      cost: r.cost,
      costApproximate: false,
    };
    return NextResponse.json(body);
  } catch (err) {
    console.error("[eval] failed:", err);
    return NextResponse.json({ error: "Proving Ground run failed. Try again." }, { status: 502 });
  }
}
