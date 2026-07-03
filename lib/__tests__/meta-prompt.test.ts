import { describe, it, expect } from "vitest";
import { buildMetaPrompt, META_INVARIANTS } from "@/lib/meta-prompt";
import { CATEGORIES } from "@/lib/categories";
import { CATEGORY_IDS } from "@/lib/schema";

describe("buildMetaPrompt", () => {
  it("keeps the invariant clauses for every category", () => {
    for (const cat of CATEGORY_IDS) {
      const { system, user } = buildMetaPrompt(cat, "do a thing");
      // Intent preservation clause.
      expect(system).toContain(META_INVARIANTS.intentClause);
      // Rewrite-not-answer clause.
      expect(system).toContain(META_INVARIANTS.rewriteNotAnswer);
      // Strict JSON contract.
      expect(system).toContain(META_INVARIANTS.jsonKey);
      // Category-specific rules are present.
      expect(system).toContain(CATEGORIES[cat].rules.slice(0, 24));
      // The user message carries the raw prompt.
      expect(user).toContain("do a thing");
    }
  });

  it("medical prompt forbids inventing clinical facts", () => {
    const { system } = buildMetaPrompt("medical", "summarize");
    expect(system.toLowerCase()).toContain("do not add clinical facts");
    expect(system.toLowerCase()).toContain("non-diagnostic");
  });

  it("injects knobs when provided", () => {
    const { system } = buildMetaPrompt("general", "x", {
      strictness: "high",
      preserveWording: true,
    });
    expect(system).toContain("Restructuring aggressiveness: high");
    expect(system.toLowerCase()).toContain("preserve the user's wording");
  });

  it("mentions the target model when given", () => {
    const { system } = buildMetaPrompt("image-gen", "a cat", {}, "FLUX.1-dev");
    expect(system).toContain("FLUX.1-dev");
  });
});
