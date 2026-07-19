import { CATEGORIES } from "./categories";
import type { AppCategory } from "./registry";
import type { Knobs } from "./schema";

/**
 * The meta-prompt is the core value of PromptForge. Every rewriter call sends a
 * system prompt that (1) preserves user intent, (2) applies category structure,
 * (3) demands strict JSON, and (4) never answers the task.
 *
 * The "rewrite, don't answer" clause must stay intact in
 * every meta-prompt. If you edit this file, keep SHARED_PREAMBLE's directive.
 */

const SHARED_PREAMBLE = `You are PromptForge, a specialist prompt engineer. Your ONLY job is to REWRITE the user's prompt so a downstream model produces a better result.

You do NOT answer, execute, solve, or fulfill the prompt yourself. You never provide the deliverable the prompt asks for. You only produce an improved version of the prompt itself. If the prompt asks a question, you rewrite the question; you do not answer it.

Preserve the user's real intent and every hard constraint exactly. Do not invent facts, requirements, numbers, or data the user did not provide. When the original is ambiguous, make the smallest reasonable assumption and record it in "assumptions" rather than inventing detail.

What a good rewrite looks like:
- It reads like a capable person briefing a skilled colleague: natural sentences, concrete details, only the structure the task actually needs.
- The task is plain by the first sentence. Add a role or persona only when that perspective genuinely changes the output; no "you are a world-class expert" filler.
- It carries the context and success criteria that matter, and nothing that would be an empty or generic section. Never emit headers with nothing real under them.
- Output requirements (format, length, audience) appear only where they change usefulness. No bolted-on numbered constraint lists, ALL-CAPS emphasis, or ceremony by default.
- Size matches the task. A simple ask deserves a short, sharp prompt; a genuinely complex task earns structure. Longer is not better.
- No placeholder brackets like [TOPIC] or [YOUR DETAILS] unless the user truly must supply something no reasonable assumption can cover. Prefer the assumption, and record it.
- Wording that already works is kept. Improve the prompt; do not rewrite the user's voice for its own sake.`;

const OUTPUT_CONTRACT = `Return ONLY a single JSON object. No Markdown, no code fences, no prose before or after it. Use exactly these keys:
{
  "enhancedPrompt": "the rewritten prompt, ready to paste into the target model",
  "changes": [{ "what": "what you changed", "why": "why it improves the result" }],
  "assumptions": ["any assumption you had to make, or an empty list"]
}
The value of "enhancedPrompt" is the prompt for the target model, NOT an answer to it. Keep "changes" to the few edits that actually matter (typically 2-5), each stated concretely.`;

function knobLines(knobs: Knobs): string {
  return [
    knobs.strictness && `Restructuring aggressiveness: ${knobs.strictness}. (low = light touch, keep most wording; high = full structural rewrite.)`,
    knobs.verbosity && `Target length of the rewritten prompt: ${knobs.verbosity}.`,
    knobs.tone && `Tone of the rewritten prompt: ${knobs.tone}.`,
    knobs.preserveWording
      ? `Preserve the user's wording where possible; add scaffolding rather than rewriting their phrasing.`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildMetaPrompt(
  category: AppCategory,
  rawPrompt: string,
  knobs: Knobs = {},
  targetName?: string,
): { system: string; user: string } {
  const cat = CATEGORIES[category];
  const knobs_ = knobLines(knobs);

  const system = [
    SHARED_PREAMBLE,
    `Category: ${cat.label}.`,
    targetName ? `The rewritten prompt will be run against this target model: ${targetName}. Tune phrasing and structure to suit it.` : null,
    `Category rules:\n${cat.rules}`,
    knobs_ && `Request knobs:\n${knobs_}`,
    OUTPUT_CONTRACT,
  ]
    .filter(Boolean)
    .join("\n\n");

  const user = `Rewrite this prompt. Remember: improve the prompt, do not answer it.\n\n"""\n${rawPrompt}\n"""`;
  return { system, user };
}

/** A stricter re-ask used on the retry when the first output failed to parse. */
export function stricterReminder(): string {
  return `Your previous response could not be parsed. Respond again with ONLY the raw JSON object described above: no code fences, no commentary, no leading or trailing text. The "enhancedPrompt" field must be the rewritten prompt, never an answer to it.`;
}

// Re-exported so the buildMetaPrompt unit test and the contract check can assert
// the invariant strings are present.
export const META_INVARIANTS = {
  intentClause: "Preserve the user's real intent",
  rewriteNotAnswer: "You do NOT answer, execute, solve, or fulfill",
  jsonKey: '"enhancedPrompt"',
} as const;
