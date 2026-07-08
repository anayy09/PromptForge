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

// Categories whose models are valid *rewriters* (prompt enhancers). Code
// specialists like Codestral are deliberately excluded: they are tuned for
// writing code, not for the meta task of rewriting prompts. They remain
// selectable as *targets* (see getTargetsForCategory). Image / TTS / ASR /
// embedding models are targets only, never rewriters.
const TEXT_OUTPUT_CATEGORIES = new Set(["General LLM", "Medical LLM"]);

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

// Categories usable as conversational chat models (they answer, in text). This
// is the Chat product's model pool — broader than rewriters because a code
// specialist is a fine chat model even though it is a poor prompt rewriter.
const CHAT_CATEGORIES = new Set(["General LLM", "Medical LLM", "Code"]);

/**
 * Text-output conversational models for the Chat product. `visionOnly` narrows
 * to models that also accept image input (used by Phase 3's vision mode).
 */
export function getChatModels(opts?: { visionOnly?: boolean }): RegistryModel[] {
  return (models as RegistryModel[]).filter((m) => {
    if (!CHAT_CATEGORIES.has(m.category)) return false;
    if (!m.outputModalities.includes("Text")) return false;
    if (opts?.visionOnly && !m.inputModalities.includes("Image")) return false;
    return true;
  });
}

/** Text-to-image models (FLUX) for the Chat product's image-generation mode. */
export function getImageModels(): RegistryModel[] {
  return (models as RegistryModel[]).filter((m) => m.category === "Image Generation");
}

/** First available text-to-speech model, or undefined if the registry has none. */
export function getSpeechModel(): RegistryModel | undefined {
  return (models as RegistryModel[]).find((m) => m.category.startsWith("TTS"));
}

/** First available speech-to-text model, or undefined if the registry has none. */
export function getTranscribeModel(): RegistryModel | undefined {
  return (models as RegistryModel[]).find((m) => m.category.startsWith("ASR"));
}

/** Whether a model accepts image input (used to gate vision attachments). */
export function supportsVision(id: string): boolean {
  const m = getById(id);
  return !!m && m.inputModalities.includes("Image");
}

/** Whether a model produces images (used to switch Chat into generate mode). */
export function isImageModel(id: string): boolean {
  return getById(id)?.category === "Image Generation";
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
    case "coding":
      // Code prompts can target code specialists (Codestral) or general LLMs.
      // Codestral is a valid target here even though it is not a rewriter.
      return all.filter((m) => m.category === "Code" || m.category === "General LLM");
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
