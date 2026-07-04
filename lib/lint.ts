import type { AppCategory } from "./registry";

/**
 * Deterministic, zero-cost prompt linter. It scores a prompt on structural
 * qualities that correlate with better model output (clear instruction, stated
 * format, constraints, enough context, low vagueness) plus a couple of
 * category-specific checks. It runs instantly client-side, so the same function
 * scores the raw prompt as you type and the forged prompt after, giving a
 * visible before/after quality delta without an API call.
 *
 * This is a heuristic, not a judge model. It rewards the presence of good
 * structure; it cannot assess semantic quality. Keep the checks explainable.
 */

export interface LintCheck {
  id: string;
  label: string;
  pass: boolean;
  weight: number;
  /** Actionable hint shown when the check fails. */
  hint: string;
}

export type LintGrade = "weak" | "fair" | "strong";

export interface LintResult {
  score: number; // 0-100
  grade: LintGrade;
  checks: LintCheck[];
}

const INSTRUCTION_VERBS =
  /\b(write|create|build|make|generate|explain|describe|summari[sz]e|analy[sz]e|compare|list|outline|draft|design|implement|fix|debug|refactor|review|translate|convert|extract|classify|plan|rewrite|improve|evaluate|calculate|derive|prove|recommend|suggest)\b/i;

const FORMAT_HINTS =
  /\b(json|table|bullet|list|steps?|markdown|csv|code|paragraphs?|outline|email|essay|report|summary|schema|yaml|xml|word[s]?|sentences?|headings?|format)\b/i;

const CONSTRAINT_HINTS =
  /\b(must|should|only|avoid|do not|don't|limit|within|no more than|at least|fewer than|under|max|maximum|min|minimum|audience|tone|constraint|require[ds]?|exclude|include|keep it|concise)\b/i;

// Vague filler that signals an under-specified prompt.
const VAGUE_TERMS =
  /\b(something|some stuff|stuff|things?|good|nice|better|kind of|sort of|etc\.?|and so on|whatever|anything|somehow|make it (good|better|nice))\b/i;

const CODE_LANGS =
  /\b(javascript|typescript|python|java|kotlin|swift|rust|go(?:lang)?|c\+\+|c#|ruby|php|scala|sql|html|css|react|next\.?js|vue|svelte|node|bash|shell|dockerfile|graphql)\b/i;

const IMG_DESCRIPTORS =
  /\b(lighting|composition|style|photoreal|cinematic|palette|lens|angle|foreground|background|render|4k|8k|bokeh|minimalist|vector|watercolor|oil|studio|golden hour|wide shot|close-?up)\b/i;

function wordCount(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

function baseChecks(text: string): LintCheck[] {
  const words = wordCount(text);
  const hasQuestion = /\?/.test(text);

  return [
    {
      id: "actionable",
      label: "Clear instruction",
      pass: INSTRUCTION_VERBS.test(text) || hasQuestion,
      weight: 3,
      hint: "State the action explicitly (e.g. summarize, build, compare) or pose a direct question.",
    },
    {
      id: "length",
      label: "Enough detail",
      pass: words >= 8,
      weight: 2,
      hint: "Add context. Very short prompts leave the model guessing.",
    },
    {
      id: "format",
      label: "Output format",
      pass: FORMAT_HINTS.test(text),
      weight: 2,
      hint: "Say what shape the answer should take (list, table, JSON, email, length).",
    },
    {
      id: "constraints",
      label: "Constraints / scope",
      pass: CONSTRAINT_HINTS.test(text),
      weight: 2,
      hint: "Add boundaries: audience, tone, length limit, what to include or avoid.",
    },
    {
      id: "specifics",
      label: "Concrete specifics",
      pass: /\d/.test(text) || /["'`]/.test(text) || /[A-Z][a-z]{2,}/.test(text.slice(1)),
      weight: 1,
      hint: "Ground it with specifics: numbers, names, or quoted material.",
    },
    {
      id: "unambiguous",
      label: "Low vagueness",
      pass: !VAGUE_TERMS.test(text),
      weight: 2,
      hint: "Replace vague filler (\"something good\", \"stuff\", \"etc\") with concrete asks.",
    },
  ];
}

function categoryChecks(text: string, category: AppCategory): LintCheck[] {
  switch (category) {
    case "coding":
      return [
        {
          id: "code-lang",
          label: "Language / stack named",
          pass: CODE_LANGS.test(text),
          weight: 2,
          hint: "Name the language, version, and framework so the code fits your runtime.",
        },
      ];
    case "image-gen":
      return [
        {
          id: "img-visual",
          label: "Visual descriptors",
          pass: IMG_DESCRIPTORS.test(text),
          weight: 2,
          hint: "Add visual detail: subject, composition, lighting, style, palette, lens.",
        },
      ];
    case "research":
      return [
        {
          id: "research-scope",
          label: "Question + scope",
          pass: /\?/.test(text) && CONSTRAINT_HINTS.test(text),
          weight: 2,
          hint: "Pose one clear question and bound the scope (include / exclude).",
        },
      ];
    default:
      return [];
  }
}

export function lintPrompt(text: string, category: AppCategory): LintResult {
  const checks = [...baseChecks(text), ...categoryChecks(text, category)];
  const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
  const gained = checks.reduce((s, c) => s + (c.pass ? c.weight : 0), 0);
  const score = totalWeight === 0 ? 0 : Math.round((gained / totalWeight) * 100);
  const grade: LintGrade = score >= 75 ? "strong" : score >= 45 ? "fair" : "weak";
  return { score, grade, checks };
}
