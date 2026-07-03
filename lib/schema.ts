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

export const EnhanceRequestSchema = z.object({
  rawPrompt: z.string().min(1, "Prompt is empty").max(20000, "Prompt is too long"),
  category: z.enum(CATEGORY_IDS),
  rewriterId: z.string().optional(),
  targetId: z.string().optional(),
  knobs: KnobsSchema.optional(),
  variants: z.boolean().optional(),
});
export type EnhanceRequest = z.infer<typeof EnhanceRequestSchema>;

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

export interface EnhanceResponse extends ModelOutput {
  variants?: string[];
  model: { id: string; name: string; path: string };
  target?: { id: string; name: string } | null;
  usage: { promptTokens: number; completionTokens: number } | null;
  cost: number | null;
  costApproximate: boolean;
  category: (typeof CATEGORY_IDS)[number];
}
