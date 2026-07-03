import { describe, it, expect } from "vitest";
import {
  getAll,
  getById,
  getRewriters,
  getCheapestRewriter,
  getTargetsForCategory,
  costFor,
} from "@/lib/registry";

describe("registry filters", () => {
  it("loads models", () => {
    expect(getAll().length).toBeGreaterThan(10);
  });

  it("rewriters only include text-output LLMs", () => {
    const rw = getRewriters();
    expect(rw.length).toBeGreaterThan(0);
    for (const m of rw) {
      expect(["Code", "General LLM", "Medical LLM"]).toContain(m.category);
      expect(m.outputModalities).toContain("Text");
    }
    // No image / embedding / tts / asr models are rewriters.
    expect(rw.some((m) => m.category === "Image Generation")).toBe(false);
    expect(rw.some((m) => m.category === "Embedding")).toBe(false);
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
