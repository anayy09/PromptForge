import { describe, it, expect } from "vitest";
import {
  getAll,
  getById,
  getRewriters,
  getCheapestRewriter,
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

  it("cheapest rewriter is the lowest combined price", () => {
    const cheapest = getCheapestRewriter();
    expect(cheapest?.id).toBe("gpt-oss-20b");
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
