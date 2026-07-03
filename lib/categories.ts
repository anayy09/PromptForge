import type { AppCategory } from "./registry";

/**
 * A category is data, not a class hierarchy. Each entry
 * carries both the rewrite behavior (defaultRewriterId + rules injected into
 * the meta-prompt) and the UI-facing metadata used by the picker and library.
 */
export interface CategoryDef {
  id: AppCategory;
  label: string;
  /** ASCII marker used in place of an icon, per the terminal aesthetic. */
  glyph: string;
  /** Which signature accent this category reads in: fire vs. metal. */
  tone: "ember" | "steel";
  /** One-line description shown under the label. Terse, technical. */
  blurb: string;
  /** What tier of target model the enhanced prompt is written for. */
  targetNote: string;
  defaultRewriterId: string;
  /** Category-specific rewrite rules injected into the meta-prompt. */
  rules: string;
  /** Rough example prompts users can load to see the enhancer work. */
  starters: string[];
}

export const CATEGORIES: Record<AppCategory, CategoryDef> = {
  coding: {
    id: "coding",
    label: "Coding",
    glyph: "{ }",
    tone: "ember",
    blurb: "Software tasks, refactors, debugging, code review.",
    targetNote: "Written for any code model or general LLM.",
    defaultRewriterId: "codestral-22b",
    rules: `Rewrite as a precise engineering task. Force: target language and version, exact input/output contract, constraints, edge cases, runtime/dependencies, and whether to return code only or code plus explanation. Keep any hard requirements verbatim. Do not solve the task; only specify it.`,
    starters: [
      "write a function to debounce another function",
      "fix my react component that re-renders too much",
      "review this SQL query for performance",
    ],
  },
  research: {
    id: "research",
    label: "Research",
    glyph: "[R]",
    tone: "steel",
    blurb: "Literature synthesis, methodology, academic analysis.",
    targetNote: "Written for a frontier general LLM.",
    defaultRewriterId: "gpt-oss-120b",
    rules: `Rewrite as a rigorous research task. Force: a single clear question, explicit scope boundaries, requested output format (structured review vs. argument vs. analysis), citation expectation, and rigor level. Separate facts requested from analysis requested. Preserve the author's phrasing where possible; add scaffolding, do not rewrite intent.`,
    starters: [
      "summarize the debate on remote work productivity",
      "help me design a survey methodology for user churn",
      "compare transformer and state-space models for me",
    ],
  },
  general: {
    id: "general",
    label: "General",
    glyph: "( )",
    tone: "steel",
    blurb: "Everyday chat, drafting, explanation, planning.",
    targetNote: "Written for any general LLM.",
    defaultRewriterId: "llama-3.3-70b-instruct",
    rules: `Tighten a vague ask into a concrete deliverable. Force: output format, audience, length, and success criteria. Make minimal changes to the user's wording; add structure, do not replace their voice.`,
    starters: [
      "help me write an email declining a meeting",
      "explain quantum computing",
      "plan a 3 day trip to lisbon",
    ],
  },
  medical: {
    id: "medical",
    label: "Medical",
    glyph: "[+]",
    tone: "ember",
    blurb: "Clinical framing, EHR summarization, imaging analysis.",
    targetNote: "Written for a medical LLM. Framing only, never diagnosis.",
    defaultRewriterId: "medgemma-27b-it",
    rules: `Rewrite as a clinical analysis or summarization task using ONLY the data the user provided. Do NOT add clinical facts, findings, values, or history the user did not state. Require the target model to state uncertainty and to include a non-diagnostic, informational-use directive. Never phrase the task as a request for definitive diagnosis or treatment. Frame the reader as a clinician who retains judgment.`,
    starters: [
      "summarize this discharge note for a patient handoff",
      "structure a differential-reasoning prompt from these symptoms",
      "reformat these lab values into a clinical summary request",
    ],
  },
  "data-viz-multimodal": {
    id: "data-viz-multimodal",
    label: "Multimodal",
    glyph: "[#]",
    tone: "steel",
    blurb: "Prompts over image, video, or audio input.",
    targetNote: "Written for a multimodal LLM.",
    defaultRewriterId: "gemma-4-31b-it",
    rules: `Make the input modality explicit (image, video, audio, or a chart/table image). Specify exactly what to extract from the media, what to ignore, and the structure of the output. Ask for grounded observations tied to the media rather than open speculation.`,
    starters: [
      "describe what's happening in this video",
      "extract the data from this chart image into a table",
      "transcribe and summarize this audio clip",
    ],
  },
  "image-gen": {
    id: "image-gen",
    label: "Image Gen",
    glyph: "[*]",
    tone: "ember",
    blurb: "Text-to-image prompts, FLUX-style diffusion.",
    targetNote: "Rewrites text; the target is a FLUX diffusion model.",
    defaultRewriterId: "llama-3.3-70b-instruct",
    rules: `Expand into a dense, comma-structured text-to-image prompt for a FLUX-style diffusion model. Cover subject, composition, lighting, style, medium, color, and detail/lens. Add a short negative-prompt suggestion. Keep it concrete and visual; avoid abstract adjectives and narrative sentences.`,
    starters: [
      "a cozy reading nook",
      "logo for a coffee roastery",
      "cyberpunk street at night",
    ],
  },
  agentic: {
    id: "agentic",
    label: "Agentic",
    glyph: "[>]",
    tone: "ember",
    blurb: "Tool-use, multi-step workflows, structured output.",
    targetNote: "Written for an agentic-capable LLM.",
    defaultRewriterId: "nemotron-3-super-120b-a12b",
    rules: `Rewrite as an agentic task specification. Force: the goal, available tools (use placeholders if unknown), stepwise decomposition, stop conditions, error handling, and a strict output schema. Prefer structured/JSON output where the task allows. Define what "done" means.`,
    starters: [
      "build an agent that triages my inbox",
      "automate scraping a site and saving to csv",
      "an assistant that books meetings across calendars",
    ],
  },
};

export const CATEGORY_ORDER: AppCategory[] = [
  "coding",
  "general",
  "research",
  "agentic",
  "image-gen",
  "data-viz-multimodal",
  "medical",
];

export function getCategory(id: AppCategory): CategoryDef {
  return CATEGORIES[id];
}
