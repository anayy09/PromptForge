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
    // A strong reasoning LLM structures coding prompts better than a code
    // specialist. Codestral is a code model, not a prompt enhancer.
    defaultRewriterId: "gpt-oss-120b",
    rules: `Rewrite as a clear engineering task a strong code model can act on directly. Pin down what to build, fix, or review; the language, framework, or versions when they change the answer; and the input/output behavior the user expects. Surface constraints and edge cases the user implied but did not state, as requirements to handle rather than solutions. Say whether the response should be code only or code plus a short explanation when that matters. Keep every hard requirement and any pasted code verbatim. Skip persona filler; the task itself carries the context. Do not solve the task; only specify it.`,
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
    rules: `Rewrite as a well-scoped research task. Sharpen it to one clear question, and draw the scope boundary (time range, populations, disciplines, what to exclude) where the original leaves it fuzzy. Distinguish what should be reported as evidence from what should be argued or analyzed, and say what balance the user wants. State the expected shape of the answer (structured review, comparison, argued position) and how sources should be handled only when it changes the work. Rigor should come from precision, not from stacking academic jargon onto an everyday question. Preserve the author's phrasing where it is already precise.`,
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
    defaultRewriterId: "gemma-4-31b-it",
    rules: `Turn a vague ask into a concrete one while keeping it human. Make the deliverable unmistakable, and add audience, length, format, or tone only when they genuinely change what a good answer looks like; leave out whichever the task does not need. If the ask has an implicit situation (an email has a recipient and a goal; a plan has dates and constraints), draw that out into the prompt. Everyday requests should still read like everyday requests, just sharper; do not dress a simple question up as a formal specification. Keep the user's voice.`,
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
    rules: `Rewrite as a clinical documentation or analysis task using ONLY the data the user provided. Do NOT add clinical facts, findings, values, or history the user did not state; structure and clarify what is there. Ask the target model for the clinically useful shape (a structured summary, a handoff note, an organized differential-reasoning request) without turning the prompt into a rigid form. Require the target model to state uncertainty where the data is thin, and keep a non-diagnostic, informational-use directive in the prompt. Never phrase the task as a request for definitive diagnosis or treatment; the reader is a clinician who retains judgment.`,
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
    rules: `Make the input modality explicit (image, video, audio, or a chart/table image) and make the job on that media concrete: what to extract, describe, or compare, and what to ignore. Ask for observations grounded in what is actually present rather than speculation, and for the model to say when something is unreadable or absent instead of guessing. Give the output a structure (table, list, sections) only when the extraction genuinely benefits from one; a description task can just be well-directed prose.`,
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
    defaultRewriterId: "gemma-4-31b-it",
    rules: `Expand into a vivid, concrete visual description for a FLUX-style diffusion model. Build a coherent scene: subject and its specifics first, then composition and framing, lighting, style or medium, palette, and finishing detail (lens, texture, atmosphere). Flowing descriptive language and comma-separated detail both work; every word should be something visible in the frame. Concrete nouns and specific adjectives over abstractions ("weathered copper kettle" beats "beautiful vintage object"); no backstory, emotions, or narration the image cannot show. Add a one-line negative-prompt suggestion listing what to avoid. Respect the user's chosen subject and style completely; enrich, never replace.`,
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
    defaultRewriterId: "gpt-oss-120b",
    rules: `Rewrite as a task brief an autonomous agent can execute without guessing. State the goal and what "done" looks like in verifiable terms. Name the tools, data, or access the agent should use when the user implied them; if unknown, describe capabilities generically rather than inventing specific tool names. Break the work into stages only as far as the task genuinely decomposes; over-specified steps make agents brittle. Cover the failure paths that matter (what to do when a step fails, when to stop and report) and ask for structured or JSON output only where downstream code will consume it. The brief should read like instructions to a competent operator, not a state machine.`,
    starters: [
      "build an agent that triages my inbox",
      "automate scraping a site and saving to csv",
      "an assistant that books meetings across calendars",
    ],
  },
};

export const CATEGORY_ORDER: AppCategory[] = [
  "general",
  "research",
  "data-viz-multimodal",
  "medical",
  "coding",
  "agentic",
  "image-gen",
];

export function getCategory(id: AppCategory): CategoryDef {
  return CATEGORIES[id];
}
