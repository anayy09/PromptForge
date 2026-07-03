import { describe, it, expect } from "vitest";
import { diffWords, diffStats } from "@/lib/diff";

describe("diffWords", () => {
  it("reconstructs both sides from the ops", () => {
    const before = "write a function to sort a list";
    const after = "write a TypeScript function to sort a list of numbers";
    const ops = diffWords(before, after);
    const rebuiltBefore = ops
      .filter((o) => o.type !== "add")
      .map((o) => o.text)
      .join("");
    const rebuiltAfter = ops
      .filter((o) => o.type !== "del")
      .map((o) => o.text)
      .join("");
    expect(rebuiltBefore).toBe(before);
    expect(rebuiltAfter).toBe(after);
  });

  it("counts added and removed words", () => {
    const ops = diffWords("a b c", "a x c");
    const stats = diffStats(ops);
    expect(stats.added).toBe(1);
    expect(stats.removed).toBe(1);
  });

  it("handles identical input with no changes", () => {
    const ops = diffWords("same text", "same text");
    expect(ops.every((o) => o.type === "eq")).toBe(true);
    expect(diffStats(ops)).toEqual({ added: 0, removed: 0 });
  });
});
