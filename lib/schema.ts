import { z } from "zod";

/**
 * Zod schemas for the API boundary. Validate all model
 * JSON output before use, and never render unvalidated output as the result.
 */

export const CATEGORY_IDS = [
  "coding",
  "research",
  "general",
  "medical",
  "data-viz-multimodal",
  "image-gen",
  "agentic",
] as const;

export const KnobsSchema = z.object({
  strictness: z.enum(["low", "medium", "high"]).optional(),
  verbosity: z.enum(["terse", "normal", "detailed"]).optional(),
  tone: z.enum(["neutral", "formal", "terse"]).optional(),
  preserveWording: z.boolean().optional(),
});
export type Knobs = z.infer<typeof KnobsSchema>;

// Forge mode. `single` is the classic one-model rewrite. `ensemble` fans out to
// several rewriters in parallel and has a judge model synthesize the best.
// `reflexion` has one model critique and improve its own rewrite over N rounds.
export const ForgeModeSchema = z.enum(["single", "ensemble", "reflexion"]);
export type ForgeMode = z.infer<typeof ForgeModeSchema>;

export const EnhanceRequestSchema = z.object({
  rawPrompt: z.string().min(1, "Prompt is empty").max(20000, "Prompt is too long"),
  category: z.enum(CATEGORY_IDS),
  rewriterId: z.string().optional(),
  targetId: z.string().optional(),
  knobs: KnobsSchema.optional(),
  variants: z.boolean().optional(),
  mode: ForgeModeSchema.optional(),
  // Optional explicit ensemble roster; when absent the route picks a default set.
  ensembleIds: z.array(z.string()).min(2).max(5).optional(),
  // Reflexion critique/improve rounds (in addition to the initial rewrite).
  rounds: z.number().int().min(1).max(3).optional(),
});
export type EnhanceRequest = z.infer<typeof EnhanceRequestSchema>;

// Auto-route: classify a raw prompt into a category so the UI can pick it.
export const ClassifyRequestSchema = z.object({
  rawPrompt: z.string().min(1, "Prompt is empty").max(20000, "Prompt is too long"),
});
export type ClassifyRequest = z.infer<typeof ClassifyRequestSchema>;

// What the classifier model must return (validated before use).
export const ClassifyOutputSchema = z.object({
  category: z.enum(CATEGORY_IDS),
  confidence: z.number().min(0).max(1).default(0.5),
  reason: z.string().default(""),
});
export type ClassifyOutput = z.infer<typeof ClassifyOutputSchema>;

export interface ClassifyResponse extends ClassifyOutput {
  // The category's default rewriter, resolved server-side for convenience.
  suggestedRewriterId: string;
}

/**
 * Proving Ground: the ONLY surface that actually runs a prompt against a target
 * model. It is deliberately separate from the rewriter/meta-prompt path so hard
 * rule #2 ("the enhancer never answers") is never violated by the enhancer. This
 * is an explicit, opt-in evaluation of raw vs. enhanced output.
 */
export const EvalRequestSchema = z.object({
  rawPrompt: z.string().min(1).max(20000),
  enhancedPrompt: z.string().min(1).max(20000),
  category: z.enum(CATEGORY_IDS),
  targetId: z.string().optional(),
});
export type EvalRequest = z.infer<typeof EvalRequestSchema>;

// What the judge model returns comparing the two outputs.
export const EvalJudgeSchema = z.object({
  winner: z.enum(["raw", "enhanced", "tie"]),
  reasoning: z.string().default(""),
  rawScore: z.number().min(0).max(10).default(0),
  enhancedScore: z.number().min(0).max(10).default(0),
});
export type EvalJudgeOutput = z.infer<typeof EvalJudgeSchema>;

export interface EvalResponse extends EvalJudgeOutput {
  rawOutput: string;
  enhancedOutput: string;
  target: { id: string; name: string };
  judge: { id: string; name: string };
  usage: { promptTokens: number; completionTokens: number } | null;
  cost: number | null;
  costApproximate: boolean;
}

/**
 * Auto-optimize: forge several candidate rewrites, run each against the target,
 * and let a judge rank them empirically. Returns the tested winner plus the
 * leaderboard. Like the Proving Ground it runs prompts, so it lives entirely
 * outside the enhancer path (hard rule #2).
 */
export const OptimizeRequestSchema = z.object({
  rawPrompt: z.string().min(1).max(20000),
  category: z.enum(CATEGORY_IDS),
  rewriterId: z.string().optional(),
  targetId: z.string().optional(),
  knobs: KnobsSchema.optional(),
  candidates: z.number().int().min(2).max(4).optional(),
});
export type OptimizeRequest = z.infer<typeof OptimizeRequestSchema>;

export interface OptimizeCandidate {
  prompt: string;
  output: string;
  score: number; // 0-10, from the judge
}

export interface OptimizeResponse {
  best: OptimizeCandidate;
  candidates: OptimizeCandidate[]; // ranked, best first
  reasoning: string;
  target: { id: string; name: string };
  judge: { id: string; name: string };
  usage: { promptTokens: number; completionTokens: number } | null;
  cost: number | null;
  costApproximate: boolean;
}

// The strict contract every rewriter must return.
export const ChangeSchema = z.object({
  what: z.string(),
  why: z.string(),
});
export type Change = z.infer<typeof ChangeSchema>;

export const ModelOutputSchema = z.object({
  enhancedPrompt: z.string().min(1, "Empty enhanced prompt"),
  changes: z.array(ChangeSchema).default([]),
  assumptions: z.array(z.string()).default([]),
});
export type ModelOutput = z.infer<typeof ModelOutputSchema>;

// One reflexion round: the self-critique plus the improved rewrite it produced.
export const ReflexionOutputSchema = ModelOutputSchema.extend({
  critique: z.string().default(""),
});
export type ReflexionRoundOutput = z.infer<typeof ReflexionOutputSchema>;

// The judge/merge step of an ensemble returns a synthesized rewrite plus a short
// rationale for why it combined or picked the candidates the way it did.
export const EnsembleJudgeSchema = ModelOutputSchema.extend({
  rationale: z.string().default(""),
});
export type EnsembleJudgeOutput = z.infer<typeof EnsembleJudgeSchema>;

// Transparency payload attached to ensemble/reflexion results so the UI can show
// how the rewrite was produced (which models contributed, each critique round).
export interface ForgeMethod {
  mode: ForgeMode;
  contributors?: { id: string; name: string }[];
  judge?: { id: string; name: string };
  rationale?: string;
  rounds?: { critique: string }[];
}

export interface EnhanceResponse extends ModelOutput {
  variants?: string[];
  // `path` (the backend model slug) is intentionally omitted: the endpoint
  // identity must not reach the client. The API call keys on `id`, not `path`.
  model: { id: string; name: string };
  target?: { id: string; name: string } | null;
  usage: { promptTokens: number; completionTokens: number } | null;
  cost: number | null;
  costApproximate: boolean;
  category: (typeof CATEGORY_IDS)[number];
  method?: ForgeMethod;
}
