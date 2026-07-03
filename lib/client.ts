import "server-only";
import OpenAI from "openai";
import { ModelOutputSchema, type ModelOutput } from "./schema";
import { stricterReminder } from "./meta-prompt";

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
      model: modelName, // endpoint keys by registry `id` (e.g. codestral-22b), NOT `path`
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
