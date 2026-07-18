import { describe, it, expect } from "vitest";
import {
  getAll,
  getById,
  getRewriters,
  strongestOf,
  getTargetsForCategory,
  costFor,
  getChatModels,
  getImageModels,
  getSpeechModel,
  getTranscribeModel,
  supportsVision,
  isImageModel,
} from "@/lib/registry";

describe("registry filters", () => {
  it("loads models", () => {
    expect(getAll().length).toBeGreaterThan(10);
  });

  it("rewriters only include general-purpose text LLMs", () => {
    const rw = getRewriters();
    expect(rw.length).toBeGreaterThan(0);
    for (const m of rw) {
      expect(["General LLM", "Medical LLM"]).toContain(m.category);
      expect(m.outputModalities).toContain("Text");
    }
    // No image / embedding / tts / asr models are rewriters.
    expect(rw.some((m) => m.category === "Image Generation")).toBe(false);
    expect(rw.some((m) => m.category === "Embedding")).toBe(false);
    // Code specialists are targets, not rewriters: Codestral is never a rewriter.
    expect(rw.some((m) => m.id === "codestral-22b")).toBe(false);
    expect(rw.some((m) => m.category === "Code")).toBe(false);
  });

  it("codestral remains selectable as a coding target", () => {
    const targets = getTargetsForCategory("coding");
    expect(targets.some((m) => m.id === "codestral-22b")).toBe(true);
    // General LLMs are also valid coding targets.
    expect(targets.some((m) => m.category === "General LLM")).toBe(true);
  });

  it("strongestOf picks by parameter count, ignoring price", () => {
    const strongest = strongestOf(getRewriters());
    // Nemotron 3 Ultra (550B MoE, OpenRouter free tier) tops the registry.
    expect(strongest?.id).toBe("nvidia/nemotron-3-ultra-550b-a55b:free");
    expect(strongestOf([])).toBeUndefined();
  });

  it("image-gen targets are diffusion models only", () => {
    const t = getTargetsForCategory("image-gen");
    expect(t.length).toBeGreaterThan(0);
    expect(t.every((m) => m.category === "Image Generation")).toBe(true);
  });

  it("multimodal targets accept more than one input modality", () => {
    const t = getTargetsForCategory("data-viz-multimodal");
    expect(t.every((m) => m.inputModalities.length > 1)).toBe(true);
  });
});

describe("dual-provider registry", () => {
  it("every model carries a known source", () => {
    for (const m of getAll()) {
      expect(["navigator", "openrouter"]).toContain(m.source);
    }
    expect(getAll().some((m) => m.source === "openrouter")).toBe(true);
    expect(getAll().some((m) => m.source === "navigator")).toBe(true);
  });

  it("openrouter code specialists are chat/targets, never rewriters", () => {
    const rw = getRewriters();
    expect(rw.some((m) => m.id === "qwen/qwen3-coder:free")).toBe(false);
    expect(getTargetsForCategory("coding").some((m) => m.id === "qwen/qwen3-coder:free")).toBe(true);
    expect(getChatModels().some((m) => m.id === "qwen/qwen3-coder:free")).toBe(true);
  });

  it("deliberately excluded OpenRouter models never ship", () => {
    // Safety-stripped, moderation-classifier, and audio-output models are
    // curated out in scripts/gen-models.mjs; regressions here mean the
    // exclusion list was bypassed.
    const ids = new Set(getAll().map((m) => m.id));
    expect(ids.has("cognitivecomputations/dolphin-mistral-24b-venice-edition:free")).toBe(false);
    expect(ids.has("nvidia/nemotron-3.5-content-safety:free")).toBe(false);
    expect(ids.has("google/lyria-3-pro-preview")).toBe(false);
    expect(ids.has("google/lyria-3-clip-preview")).toBe(false);
  });

  it("free multimodal models join the vision chat pool", () => {
    const vision = getChatModels({ visionOnly: true });
    expect(vision.some((m) => m.id === "google/gemma-4-31b-it:free")).toBe(true);
    expect(vision.some((m) => m.id === "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free")).toBe(true);
  });
});

describe("chat + multimodal helpers", () => {
  it("chat models are text-output conversational models (incl. code specialists)", () => {
    const chat = getChatModels();
    expect(chat.length).toBeGreaterThan(0);
    for (const m of chat) {
      expect(["General LLM", "Medical LLM", "Code"]).toContain(m.category);
      expect(m.outputModalities).toContain("Text");
    }
    // Codestral is a poor rewriter but a fine chat model.
    expect(chat.some((m) => m.id === "codestral-22b")).toBe(true);
    // Image / embedding models never appear in the chat pool.
    expect(chat.some((m) => m.category === "Image Generation")).toBe(false);
    expect(chat.some((m) => m.category === "Embedding")).toBe(false);
  });

  it("vision filter narrows to image-input models", () => {
    const vision = getChatModels({ visionOnly: true });
    expect(vision.length).toBeGreaterThan(0);
    expect(vision.every((m) => m.inputModalities.includes("Image"))).toBe(true);
  });

  it("image models are diffusion models and are flagged by isImageModel", () => {
    const imgs = getImageModels();
    expect(imgs.length).toBeGreaterThan(0);
    expect(imgs.every((m) => m.category === "Image Generation")).toBe(true);
    expect(isImageModel(imgs[0].id)).toBe(true);
    expect(isImageModel("gpt-oss-120b")).toBe(false);
  });

  it("supportsVision reflects image input modality", () => {
    expect(supportsVision("gemma-3-27b-it")).toBe(true); // Text+Image
    expect(supportsVision("gpt-oss-120b")).toBe(false); // Text only (MoE)
    expect(supportsVision("gpt-oss-20b")).toBe(false); // Text only
    expect(supportsVision("nope")).toBe(false);
  });

  it("finds the speech and transcription models", () => {
    expect(getSpeechModel()?.category.startsWith("TTS")).toBe(true);
    expect(getTranscribeModel()?.category.startsWith("ASR")).toBe(true);
  });
});

describe("costFor", () => {
  it("computes blended cost from per-MTok prices", () => {
    const m = getById("gpt-oss-120b")!; // 0.06 in / 0.15 out
    const cost = costFor(m.id, 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(0.06 + 0.15, 6);
  });

  it("returns null when the model has no input price", () => {
    // TTS/ASR models are usage-priced with no per-token cost ("-" in source).
    const unpriced = getAll().find((m) => m.costInput == null)!;
    expect(unpriced).toBeDefined();
    expect(costFor(unpriced.id, 1000, 0)).toBeNull();
  });

  it("returns null for unknown ids", () => {
    expect(costFor("does-not-exist", 1, 1)).toBeNull();
  });
});
