import models from "@/data/models.json";

/**
 * The model registry is the single source of truth.
 * Never hardcode model IDs, paths, or costs in components; read them from here.
 */
export type RegistryModel = (typeof models)[number];

export type AppCategory =
  | "coding"
  | "research"
  | "general"
  | "medical"
  | "data-viz-multimodal"
  | "image-gen"
  | "agentic";

// Categories whose models emit text and are therefore valid *rewriters*.
// Image / TTS / ASR / embedding models are targets only, never rewriters.
const TEXT_OUTPUT_CATEGORIES = new Set(["Code", "General LLM", "Medical LLM"]);

export function getAll(): RegistryModel[] {
  return models as RegistryModel[];
}

export function getById(id: string): RegistryModel | undefined {
  return (models as RegistryModel[]).find((m) => m.id === id);
}

/** Rewriters must emit text. Enforced here so no caller can bypass it. */
export function getRewriters(): RegistryModel[] {
  return (models as RegistryModel[]).filter(
    (m) => TEXT_OUTPUT_CATEGORIES.has(m.category) && m.outputModalities.includes("Text"),
  );
}

/** Cheapest text rewriter, used as a fallback when a default is missing. */
export function getCheapestRewriter(): RegistryModel | undefined {
  return getRewriters()
    .filter((m) => m.costInput != null)
    .sort((a, b) => (a.costInput! + (a.costOutput ?? 0)) - (b.costInput! + (b.costOutput ?? 0)))[0];
}

/** Valid *target* models per app category. */
export function getTargetsForCategory(cat: AppCategory): RegistryModel[] {
  const all = models as RegistryModel[];
  switch (cat) {
    case "image-gen":
      return all.filter((m) => m.category === "Image Generation");
    case "medical":
      return all.filter((m) => m.category === "Medical LLM" || m.category === "General LLM");
    case "data-viz-multimodal":
      return all.filter((m) => m.inputModalities.length > 1); // multimodal input
    default:
      return getRewriters();
  }
}

/**
 * Estimated USD cost for a call. Returns null when the model has no input
 * price (e.g. image/audio models priced per unit, shown as "-" in source).
 */
export function costFor(id: string, inTok: number, outTok: number): number | null {
  const m = getById(id);
  if (!m || m.costInput == null) return null;
  const out = m.costOutput ?? 0;
  return (inTok / 1e6) * m.costInput + (outTok / 1e6) * out;
}

/** Human-readable price label, e.g. "$0.06 / $0.24 per MTok". */
export function priceLabel(id: string): string {
  const m = getById(id);
  if (!m || m.costInput == null) return "usage-priced";
  const out = m.costOutput == null ? "-" : `$${m.costOutput.toFixed(2)}`;
  return `$${m.costInput.toFixed(2)} / ${out} per MTok`;
}
