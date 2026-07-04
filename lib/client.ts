import "server-only";
import OpenAI from "openai";
import {
  ModelOutputSchema,
  ReflexionOutputSchema,
  EnsembleJudgeSchema,
  ClassifyOutputSchema,
  EvalJudgeSchema,
  type ModelOutput,
  type ClassifyOutput,
  type EvalJudgeOutput,
} from "./schema";
import { stricterReminder } from "./meta-prompt";
import { costFor, getById } from "./registry";

/**
 * Server-only: the `server-only` import makes a client bundle that touches this
 * file fail to build, so the API key can never leak.
 */

// Accept both the documented MODEL_API_* names and the shorthand in .env.
const API_KEY = process.env.MODEL_API_KEY ?? process.env.API_KEY ?? "";
const RAW_BASE = process.env.MODEL_API_BASE_URL ?? process.env.BASE_URL ?? "";

// Normalize to an OpenAI-style base that ends in /v1 (the shorthand BASE_URL in
// .env is the bare host). If a caller already points at /v1 we leave it.
function normalizeBase(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return trimmed;
  return /\/v\d+$/.test(trimmed) ? trimmed : `${trimmed}/v1`;
}

export const BASE_URL = normalizeBase(RAW_BASE);

export function isConfigured(): boolean {
  return Boolean(API_KEY && BASE_URL);
}

let _client: OpenAI | null = null;
function client(): OpenAI {
  if (!_client) {
    _client = new OpenAI({ apiKey: API_KEY, baseURL: BASE_URL });
  }
  return _client;
}

export interface RewriteResult {
  output: ModelOutput;
  usage: { promptTokens: number; completionTokens: number } | null;
}

/**
 * Defensive JSON extraction: strip accidental code fences, then take the first
 * balanced {...} block. `client.ts` strips fences even though the prompt asks
 * for raw JSON.
 */
function extractJson(raw: string): unknown {
  const cleaned = raw.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("No JSON object in model output");
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

function tallyUsage(usage: OpenAI.Completions.CompletionUsage | undefined) {
  return usage
    ? { promptTokens: usage.prompt_tokens ?? 0, completionTokens: usage.completion_tokens ?? 0 }
    : null;
}

/**
 * Call the rewriter and return validated output. On a parse/validation failure
 * we retry once with a stricter instruction, then
 * surface a clean error. Unvalidated output is never returned.
 */
export async function callRewriter(
  modelName: string,
  system: string,
  user: string,
): Promise<RewriteResult> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: system },
    { role: "user", content: user },
  ];

  let lastErr: unknown = null;
  let usage: RewriteResult["usage"] = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await client().chat.completions.create({
      model: modelName, // endpoint keys by registry `id` (e.g. gpt-oss-120b), NOT `path`
      messages,
      temperature: attempt === 0 ? 0.4 : 0.2,
      max_tokens: 2048,
    });
    usage = tallyUsage(res.usage);
    const text = res.choices[0]?.message?.content ?? "";

    try {
      const parsed = ModelOutputSchema.parse(extractJson(text));
      return { output: parsed, usage };
    } catch (err) {
      lastErr = err;
      // Feed the failed attempt back and re-ask more strictly.
      messages.push({ role: "assistant", content: text });
      messages.push({ role: "user", content: stricterReminder() });
    }
  }

  throw new Error(
    `Rewriter returned unparseable output after retry: ${
      lastErr instanceof Error ? lastErr.message : "unknown"
    }`,
  );
}

/**
 * Optional: ask for 2-3 alternative rewrites in one extra call. Off by default
 * to save cost. Returns raw strings; failures degrade to an empty list rather
 * than breaking the main result.
 */
export async function callVariants(
  modelName: string,
  system: string,
  user: string,
  primary: string,
): Promise<string[]> {
  try {
    const res = await client().chat.completions.create({
      model: modelName,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
        {
          role: "user",
          content: `You already produced this rewrite:\n"""\n${primary}\n"""\nProduce 2 meaningfully different alternative rewrites of the SAME prompt (different structure or emphasis, same intent). Return ONLY a JSON array of strings, e.g. ["...", "..."]. Do not answer the prompt.`,
        },
      ],
      temperature: 0.8,
      max_tokens: 2048,
    });
    const text = res.choices[0]?.message?.content ?? "";
    const cleaned = text.replace(/```(?:json)?/gi, "").trim();
    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");
    if (start === -1 || end === -1) return [];
    const arr = JSON.parse(cleaned.slice(start, end + 1));
    return Array.isArray(arr) ? arr.filter((s) => typeof s === "string").slice(0, 3) : [];
  } catch {
    return [];
  }
}

const CLASSIFY_INSTRUCTION = `You are a router for a prompt-enhancement tool. Read the user's raw prompt and classify which category best fits, so the tool can select the right rewriter. Categories:
- coding: software tasks, refactors, debugging, code review.
- research: literature synthesis, methodology, academic analysis.
- general: everyday chat, drafting, explanation, planning.
- medical: clinical framing, EHR summarization, imaging analysis.
- data-viz-multimodal: prompts over image, video, or audio input.
- image-gen: text-to-image / diffusion prompts.
- agentic: tool-use, multi-step autonomous workflows, structured output.

Do NOT answer or rewrite the prompt. Return ONLY a JSON object:
{ "category": "one of the ids above", "confidence": 0.0-1.0, "reason": "a short phrase" }`;

/**
 * Auto-route: classify a raw prompt into a category with a cheap, fast model.
 * Returns validated output; retries once on a parse failure, then throws. The
 * caller resolves the category's default rewriter from the registry.
 */
export async function callClassifier(
  modelName: string,
  rawPrompt: string,
): Promise<{ output: ClassifyOutput; usage: Usage | null }> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: CLASSIFY_INSTRUCTION },
    { role: "user", content: `Classify this prompt:\n"""\n${rawPrompt}\n"""` },
  ];

  let lastErr: unknown = null;
  let usage: Usage | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await client().chat.completions.create({
      model: modelName,
      messages,
      temperature: 0,
      max_tokens: 200,
    });
    usage = tallyUsage(res.usage);
    const text = res.choices[0]?.message?.content ?? "";
    try {
      return { output: ClassifyOutputSchema.parse(extractJson(text)), usage };
    } catch (err) {
      lastErr = err;
      messages.push({ role: "assistant", content: text });
      messages.push({
        role: "user",
        content: `That was not valid. Return ONLY the JSON object: { "category": "...", "confidence": 0-1, "reason": "..." } with category being one of the listed ids.`,
      });
    }
  }
  throw new Error(
    `Classifier returned unparseable output: ${lastErr instanceof Error ? lastErr.message : "unknown"}`,
  );
}

/**
 * Run a prompt against a target model to get its genuine answer. This is used
 * ONLY by the Proving Ground (callEval), never by the rewriter path. Here we
 * intentionally send the prompt with no meta-prompt, because the point is to see
 * what the target actually produces for the raw vs. enhanced prompt.
 */
async function runTarget(
  modelName: string,
  prompt: string,
): Promise<{ text: string; usage: Usage | null }> {
  const res = await client().chat.completions.create({
    model: modelName,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 1024,
  });
  return { text: res.choices[0]?.message?.content ?? "", usage: tallyUsage(res.usage) };
}

export interface EvalResult extends EvalJudgeOutput {
  rawOutput: string;
  enhancedOutput: string;
  usage: Usage;
  cost: number | null;
}

/**
 * Proving Ground: run the raw and enhanced prompts against the same target in
 * parallel, then a judge model scores which output better serves the user's
 * intent. Returns both outputs plus the verdict. Cost is summed across the two
 * target runs and the judge call.
 */
export async function callEval(
  targetId: string,
  judgeId: string,
  rawPrompt: string,
  enhancedPrompt: string,
): Promise<EvalResult> {
  const [rawRun, enhancedRun] = await Promise.all([
    runTarget(targetId, rawPrompt),
    runTarget(targetId, enhancedPrompt),
  ]);

  let usage = zeroUsage();
  let cost = 0;
  let anyCost = false;
  for (const u of [rawRun.usage, enhancedRun.usage]) {
    if (!u) continue;
    usage = {
      promptTokens: usage.promptTokens + u.promptTokens,
      completionTokens: usage.completionTokens + u.completionTokens,
    };
    const c = costFor(targetId, u.promptTokens, u.completionTokens);
    if (c != null) { cost += c; anyCost = true; }
  }

  // Judge compares the two answers against the original intent. Labeled A/B to
  // keep the judge from anchoring on the words "raw"/"enhanced".
  const judgeSystem = `You are an impartial evaluator. You are given a user's goal and two AI responses to it, A and B. Decide which response better serves the user's goal: more accurate, complete, useful, and well-structured. Ignore the order of A and B. Do NOT answer the goal yourself. Return ONLY JSON:
{ "winner": "A" | "B" | "tie", "scoreA": 0-10, "scoreB": 0-10, "reasoning": "one or two sentences" }`;

  const judgeUser = `User goal:\n"""\n${rawPrompt}\n"""\n\nResponse A:\n"""\n${rawRun.text}\n"""\n\nResponse B:\n"""\n${enhancedRun.text}\n"""`;

  const res = await client().chat.completions.create({
    model: judgeId,
    messages: [
      { role: "system", content: judgeSystem },
      { role: "user", content: judgeUser },
    ],
    temperature: 0,
    max_tokens: 400,
  });
  usage = addUsage(usage, res.usage);
  const jc = costFor(judgeId, res.usage?.prompt_tokens ?? 0, res.usage?.completion_tokens ?? 0);
  if (jc != null) { cost += jc; anyCost = true; }

  // Map A/B back to raw/enhanced. Default to "tie" if the judge fails to parse.
  let verdict: EvalJudgeOutput = { winner: "tie", reasoning: "", rawScore: 0, enhancedScore: 0 };
  try {
    const raw = extractJson(res.choices[0]?.message?.content ?? "") as {
      winner?: string;
      scoreA?: number;
      scoreB?: number;
      reasoning?: string;
    };
    const winner = raw.winner === "A" ? "raw" : raw.winner === "B" ? "enhanced" : "tie";
    verdict = EvalJudgeSchema.parse({
      winner,
      reasoning: raw.reasoning ?? "",
      rawScore: raw.scoreA ?? 0,
      enhancedScore: raw.scoreB ?? 0,
    });
  } catch {
    verdict.reasoning = "The judge response could not be parsed.";
  }

  return {
    ...verdict,
    rawOutput: rawRun.text,
    enhancedOutput: enhancedRun.text,
    usage,
    cost: anyCost ? cost : null,
  };
}

export interface OptimizeCandidateResult {
  prompt: string;
  output: string;
  score: number;
}
export interface OptimizeRunResult {
  candidates: OptimizeCandidateResult[]; // ranked best-first
  reasoning: string;
  usage: Usage;
  cost: number | null;
}

/**
 * Auto-optimize (best-of-N): forge several candidate rewrites, run each against
 * the target, then a judge ranks the outputs. Returns the candidates ranked by
 * score. Reuses runTarget (the Proving Ground primitive), so this too lives
 * outside the enhancer path. Cost is summed across rewriter, target, and judge.
 */
export async function callOptimize(
  system: string,
  user: string,
  rewriterId: string,
  targetId: string,
  judgeId: string,
  rawPrompt: string,
  k: number,
): Promise<OptimizeRunResult> {
  let usage = zeroUsage();
  let cost = 0;
  let anyCost = false;
  const bill = (id: string, u: Usage | null) => {
    if (!u) return;
    usage = {
      promptTokens: usage.promptTokens + u.promptTokens,
      completionTokens: usage.completionTokens + u.completionTokens,
    };
    const c = costFor(id, u.promptTokens, u.completionTokens);
    if (c != null) { cost += c; anyCost = true; }
  };

  // 1. Generate K distinct candidate prompts (base rewrite + variants).
  const base = await callRewriter(rewriterId, system, user);
  bill(rewriterId, base.usage);
  const prompts = [base.output.enhancedPrompt];
  if (k > 1) {
    const variants = await callVariants(rewriterId, system, user, base.output.enhancedPrompt);
    for (const v of variants) {
      if (prompts.length >= k) break;
      if (!prompts.includes(v)) prompts.push(v);
    }
  }

  // 2. Run every candidate against the target in parallel.
  const runs = await Promise.all(prompts.map((p) => runTarget(targetId, p)));
  runs.forEach((r) => bill(targetId, r.usage));

  // 3. Judge ranks the outputs against the user's goal.
  const roster = runs
    .map((r, i) => `Candidate ${i + 1} output:\n"""\n${r.text}\n"""`)
    .join("\n\n");
  const judgeSystem = `You are an impartial evaluator ranking ${prompts.length} AI outputs that each attempt the same user goal. Score each on how well it serves the goal (accuracy, completeness, usefulness, structure). Do NOT answer the goal yourself. Return ONLY JSON:
{ "scores": [${prompts.map(() => "0-10").join(", ")}], "bestIndex": 0-based index of the best, "reasoning": "one sentence" }`;
  const judgeUser = `User goal:\n"""\n${rawPrompt}\n"""\n\n${roster}`;

  const res = await client().chat.completions.create({
    model: judgeId,
    messages: [
      { role: "system", content: judgeSystem },
      { role: "user", content: judgeUser },
    ],
    temperature: 0,
    max_tokens: 400,
  });
  bill(judgeId, tallyUsage(res.usage));

  let scores = prompts.map(() => 0);
  let reasoning = "";
  try {
    const parsed = extractJson(res.choices[0]?.message?.content ?? "") as {
      scores?: unknown;
      reasoning?: string;
    };
    if (Array.isArray(parsed.scores)) {
      const arr = parsed.scores;
      scores = prompts.map((_, i) => {
        const s = Number(arr[i]);
        return Number.isFinite(s) ? Math.max(0, Math.min(10, s)) : 0;
      });
    }
    reasoning = typeof parsed.reasoning === "string" ? parsed.reasoning : "";
  } catch {
    reasoning = "The judge ranking could not be parsed; candidates are unranked.";
  }

  const candidates: OptimizeCandidateResult[] = prompts
    .map((prompt, i) => ({ prompt, output: runs[i].text, score: scores[i] }))
    .sort((a, b) => b.score - a.score);

  return { candidates, reasoning, usage, cost: anyCost ? cost : null };
}

type Usage = { promptTokens: number; completionTokens: number };
const zeroUsage = (): Usage => ({ promptTokens: 0, completionTokens: 0 });
function addUsage(a: Usage, u: OpenAI.Completions.CompletionUsage | undefined): Usage {
  return {
    promptTokens: a.promptTokens + (u?.prompt_tokens ?? 0),
    completionTokens: a.completionTokens + (u?.completion_tokens ?? 0),
  };
}

const REFLEXION_INSTRUCTION = `Critique the rewrite you just produced. Judge it against the category rules and the user's original intent: what is still ambiguous, missing, over-engineered, or weakly phrased? Then produce an improved rewrite that fixes those specific issues. Do NOT answer the prompt. Return ONLY a JSON object with these keys:
{ "critique": "what was weak and why", "enhancedPrompt": "the improved rewrite", "changes": [{ "what": "", "why": "" }], "assumptions": [] }`;

export interface ReflexionResult {
  output: ModelOutput;
  usage: Usage;
  trace: { critique: string }[];
}

/**
 * Reflexion: one model rewrites, then critiques and improves its own rewrite for
 * `rounds` iterations. Each round feeds the prior JSON back and asks for a
 * self-critique plus a better version. A round that fails to parse stops the
 * loop and keeps the best result so far, so a bad round never breaks the call.
 */
export async function callReflexion(
  modelName: string,
  system: string,
  user: string,
  rounds: number,
): Promise<ReflexionResult> {
  const base = await callRewriter(modelName, system, user);
  let current = base.output;
  let usage = base.usage ?? zeroUsage();
  const trace: { critique: string }[] = [];

  for (let i = 0; i < rounds; i++) {
    const res = await client().chat.completions.create({
      model: modelName,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
        { role: "assistant", content: JSON.stringify(current) },
        { role: "user", content: REFLEXION_INSTRUCTION },
      ],
      temperature: 0.3,
      max_tokens: 2048,
    });
    usage = addUsage(usage, res.usage);
    try {
      const parsed = ReflexionOutputSchema.parse(extractJson(res.choices[0]?.message?.content ?? ""));
      trace.push({ critique: parsed.critique });
      current = {
        enhancedPrompt: parsed.enhancedPrompt,
        changes: parsed.changes,
        assumptions: parsed.assumptions,
      };
    } catch {
      break; // keep best-so-far
    }
  }

  return { output: current, usage, trace };
}

export interface EnsembleResult {
  output: ModelOutput;
  usage: Usage;
  cost: number | null;
  contributors: { id: string; name: string }[];
  judge: { id: string; name: string };
  rationale: string;
}

/**
 * Ensemble: fan out the same meta-prompt to several rewriters in parallel, then
 * a judge model synthesizes the strongest single rewrite from the candidates.
 * Failed candidates are dropped; if only one survives it is returned without a
 * judge call. Cost is summed per-model (each rewriter and the judge is priced
 * from the registry), since an ensemble spans models with different prices.
 */
export async function callEnsemble(
  modelIds: string[],
  system: string,
  user: string,
  judgeId: string,
): Promise<EnsembleResult> {
  const settled = await Promise.allSettled(
    modelIds.map((id) => callRewriter(id, system, user)),
  );

  const candidates: { id: string; output: ModelOutput; usage: Usage | null }[] = [];
  settled.forEach((s, i) => {
    if (s.status === "fulfilled") {
      candidates.push({ id: modelIds[i], output: s.value.output, usage: s.value.usage });
    }
  });
  if (candidates.length === 0) throw new Error("All ensemble rewriters failed");

  let cost = 0;
  let anyCost = false;
  let usage = zeroUsage();
  for (const c of candidates) {
    const u = c.usage ?? zeroUsage();
    usage = { promptTokens: usage.promptTokens + u.promptTokens, completionTokens: usage.completionTokens + u.completionTokens };
    const cc = costFor(c.id, u.promptTokens, u.completionTokens);
    if (cc != null) { cost += cc; anyCost = true; }
  }

  const contributors = candidates.map((c) => ({ id: c.id, name: getById(c.id)?.name ?? c.id }));
  const judgeModel = getById(judgeId);
  const judge = { id: judgeId, name: judgeModel?.name ?? judgeId };

  // Single survivor: no judging needed.
  if (candidates.length === 1) {
    return {
      output: candidates[0].output,
      usage,
      cost: anyCost ? cost : null,
      contributors,
      judge,
      rationale: "Only one rewriter returned a valid result; used it directly.",
    };
  }

  const roster = candidates
    .map((c, i) => `Candidate ${i + 1} (from ${getById(c.id)?.name ?? c.id}):\n"""\n${c.output.enhancedPrompt}\n"""`)
    .join("\n\n");

  const judgeUser = `You are the judge in a prompt-rewriting ensemble. Below are ${candidates.length} independent rewrites of the SAME user prompt, each produced under the system rules above. Synthesize the single strongest rewrite: keep the best structure and phrasing from across the candidates, drop weaknesses, and do not add facts none of them contained. Do NOT answer the prompt.

${roster}

Return ONLY a JSON object:
{ "enhancedPrompt": "the synthesized best rewrite", "changes": [{ "what": "", "why": "" }], "assumptions": [], "rationale": "one sentence on how you combined them" }`;

  const res = await client().chat.completions.create({
    model: judgeId,
    messages: [
      { role: "system", content: system },
      { role: "user", content: judgeUser },
    ],
    temperature: 0.3,
    max_tokens: 2048,
  });
  usage = addUsage(usage, res.usage);
  const jc = costFor(judgeId, res.usage?.prompt_tokens ?? 0, res.usage?.completion_tokens ?? 0);
  if (jc != null) { cost += jc; anyCost = true; }

  try {
    const parsed = EnsembleJudgeSchema.parse(extractJson(res.choices[0]?.message?.content ?? ""));
    return {
      output: {
        enhancedPrompt: parsed.enhancedPrompt,
        changes: parsed.changes,
        assumptions: parsed.assumptions,
      },
      usage,
      cost: anyCost ? cost : null,
      contributors,
      judge,
      rationale: parsed.rationale,
    };
  } catch {
    // Judge failed to parse: fall back to the first valid candidate rather than error.
    return {
      output: candidates[0].output,
      usage,
      cost: anyCost ? cost : null,
      contributors,
      judge,
      rationale: "Judge output was unparseable; fell back to the first candidate.",
    };
  }
}
