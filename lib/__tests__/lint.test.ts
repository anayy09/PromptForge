import { describe, it, expect } from "vitest";
import { lintPrompt } from "@/lib/lint";

describe("lintPrompt", () => {
  it("scores a vague prompt low", () => {
    const r = lintPrompt("make something good", "general");
    expect(r.score).toBeLessThan(45);
    expect(r.grade).toBe("weak");
    expect(r.checks.find((c) => c.id === "unambiguous")?.pass).toBe(false);
  });

  it("scores a well-specified prompt higher than a vague one", () => {
    const weak = lintPrompt("help me with code", "coding");
    const strong = lintPrompt(
      'Write a TypeScript function that debounces a callback. Input: a function and a delay in ms. Return only the code, no explanation. Must handle rapid calls within 200ms.',
      "coding",
    );
    expect(strong.score).toBeGreaterThan(weak.score);
    expect(strong.checks.find((c) => c.id === "code-lang")?.pass).toBe(true);
  });

  it("applies category-specific checks", () => {
    const img = lintPrompt("a cozy reading nook, warm lighting, cinematic composition", "image-gen");
    expect(img.checks.some((c) => c.id === "img-visual")).toBe(true);
    expect(img.checks.find((c) => c.id === "img-visual")?.pass).toBe(true);
  });

  it("returns a 0-100 score and a grade", () => {
    const r = lintPrompt("Summarize this article in 3 bullet points for a general audience.", "general");
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(["weak", "fair", "strong"]).toContain(r.grade);
  });
});
