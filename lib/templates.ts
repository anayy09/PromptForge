import type { AppCategory } from "./registry";

/**
 * Reusable prompt structures. These are scaffolds a user loads into the forge
 * as a starting point, then fills in and enhances. Organization is a first-class
 * feature, so templates carry category + tags for discovery.
 *
 * Placeholders use <angle brackets> so they're obvious to fill in. The forge
 * still improves them; a template is a head start, not a finished prompt.
 */
export interface PromptTemplate {
  id: string;
  category: AppCategory;
  title: string;
  description: string;
  tags: string[];
  body: string;
}

export const TEMPLATES: PromptTemplate[] = [
  // ---- coding ----
  {
    id: "code-feature",
    category: "coding",
    title: "Implement a feature",
    description: "A precise engineering task with contract and constraints.",
    tags: ["implementation", "contract"],
    body: `Implement <feature> in <language/version>.
Input: <what it receives>
Output: <what it returns>
Constraints: <perf, memory, style, dependencies>
Edge cases to handle: <list>
Return <code only | code + brief explanation>.`,
  },
  {
    id: "code-debug",
    category: "coding",
    title: "Debug an issue",
    description: "Give the model the symptom, context, and what you have tried.",
    tags: ["debugging"],
    body: `I have a bug in <language/framework>.
Symptom: <what happens>
Expected: <what should happen>
Relevant code:
<paste code>
What I have tried: <list>
Diagnose the likely cause and propose a minimal fix. Explain the root cause before the fix.`,
  },
  {
    id: "code-review",
    category: "coding",
    title: "Review code",
    description: "Structured review with severity and concrete fixes.",
    tags: ["review", "quality"],
    body: `Review this <language> code for correctness, security, and readability.
<paste code>
Return findings as: severity (high/med/low), the issue, and a concrete fix. Do not rewrite the whole file; point to lines.`,
  },

  // ---- research ----
  {
    id: "research-review",
    category: "research",
    title: "Structured literature review",
    description: "A scoped synthesis with an explicit output format.",
    tags: ["synthesis", "academic"],
    body: `Question: <single clear question>
Scope: include <...>, exclude <...>
Produce a structured review covering: key positions, strongest evidence for each, points of disagreement, and open questions.
Rigor: <undergraduate | graduate | expert>. Note where claims need citation. Separate established facts from your analysis.`,
  },
  {
    id: "research-method",
    category: "research",
    title: "Design a methodology",
    description: "Turn a research goal into a defensible method.",
    tags: ["methodology"],
    body: `Goal: <what I want to learn>
Constraints: <sample, time, budget, ethics>
Propose a methodology: design, variables, data collection, and analysis plan. Flag threats to validity and how to mitigate them.`,
  },

  // ---- general ----
  {
    id: "general-deliverable",
    category: "general",
    title: "Concrete deliverable",
    description: "Tighten a vague ask into a specific output.",
    tags: ["writing", "format"],
    body: `Task: <what you want>
Audience: <who reads it>
Format: <email | outline | table | post>
Length: <constraint>
Tone: <neutral | warm | formal>
Success looks like: <criteria>`,
  },
  {
    id: "general-explain",
    category: "general",
    title: "Explain a concept",
    description: "Explanation calibrated to a level and format.",
    tags: ["explanation"],
    body: `Explain <concept> to <audience/level>.
Use <an analogy | a worked example | first principles>.
Keep it under <length>. End with the one thing most people get wrong.`,
  },

  // ---- medical ----
  {
    id: "medical-summary",
    category: "medical",
    title: "Summarize clinical notes",
    description: "Framing-only summary using provided data. Non-diagnostic.",
    tags: ["summarization", "ehr"],
    body: `Summarize the following clinical information for a <handoff | patient-friendly | problem list> summary.
Use ONLY the data provided; do not infer findings that are not stated.
<paste notes / values>
State uncertainty where the data is incomplete. This is informational and not a diagnosis; the clinician retains judgment.`,
  },
  {
    id: "medical-differential",
    category: "medical",
    title: "Structure differential reasoning",
    description: "Organize a reasoning request around provided findings.",
    tags: ["reasoning"],
    body: `Given only these findings: <list>
Organize a structured reasoning prompt that asks for: the most consistent explanations, what each would predict, and what additional data would discriminate between them.
Do not assert a diagnosis. Frame for a clinician reader; note uncertainty and that this is not medical advice.`,
  },

  // ---- data-viz-multimodal ----
  {
    id: "mm-extract",
    category: "data-viz-multimodal",
    title: "Extract from an image/chart",
    description: "Grounded extraction into a structured output.",
    tags: ["image", "extraction"],
    body: `You are given <an image | a chart | a table screenshot>.
Extract <what: values, labels, trends> into <a table | JSON with fields ...>.
Only report what is visible; mark anything ambiguous as uncertain. Ignore <irrelevant elements>.`,
  },
  {
    id: "mm-describe",
    category: "data-viz-multimodal",
    title: "Describe a video/audio clip",
    description: "Scoped description tied to the media.",
    tags: ["video", "audio"],
    body: `You are given <a video | an audio clip>.
Describe <what happens | who speaks | key events> with timestamps.
Focus on <aspect>; do not speculate beyond what is present. Output as a timestamped list.`,
  },

  // ---- image-gen ----
  {
    id: "img-scene",
    category: "image-gen",
    title: "Photoreal scene",
    description: "Dense, comma-structured FLUX prompt scaffold.",
    tags: ["photoreal", "flux"],
    body: `<subject>, <composition/framing>, <lighting>, <color palette>, <style/medium>, <lens/detail>, high detail
Negative: <what to avoid: text, extra limbs, watermark>`,
  },
  {
    id: "img-logo",
    category: "image-gen",
    title: "Logo / mark",
    description: "Clean vector-style mark prompt.",
    tags: ["logo", "brand"],
    body: `<subject> logo, <style: flat/geometric/line>, <1-2 colors>, on <background>, centered, simple, scalable, no gradients
Negative: photorealism, text, clutter, drop shadow`,
  },

  // ---- agentic ----
  {
    id: "agent-spec",
    category: "agentic",
    title: "Agent task spec",
    description: "Goal, tools, steps, stop conditions, output schema.",
    tags: ["agent", "tools"],
    body: `Goal: <the outcome>
Available tools: <tool: what it does> (use placeholders if unknown)
Steps: decompose into an ordered plan.
Stop when: <success condition>. On failure: <fallback>.
Output schema (JSON): { <field>: <type> }
Prefer structured output. Ask before any irreversible action.`,
  },
  {
    id: "agent-pipeline",
    category: "agentic",
    title: "Automation pipeline",
    description: "Multi-step workflow with checkpoints.",
    tags: ["automation", "workflow"],
    body: `Automate: <task>
Trigger: <what starts it>
Steps: <1> -> <2> -> <3>, with a checkpoint after <step>.
Inputs: <...>  Outputs: <...>
Handle errors by <retry/skip/alert>. Log <what> at each step.`,
  },
];

export function templatesForCategory(cat: AppCategory): PromptTemplate[] {
  return TEMPLATES.filter((t) => t.category === cat);
}

export const ALL_TEMPLATE_TAGS = Array.from(
  new Set(TEMPLATES.flatMap((t) => t.tags)),
).sort();
