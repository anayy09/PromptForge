import { describe, it, expect, vi } from "vitest";

// Mock the endpoint client so no live call is made. Returns a fixed, valid ModelOutput + usage.
vi.mock("@/lib/client", () => ({
  isConfigured: () => true,
  callRewriter: vi.fn(async () => ({
    output: { enhancedPrompt: "REWRITTEN PROMPT", changes: [], assumptions: [] },
    usage: { promptTokens: 100, completionTokens: 50 },
  })),
  callVariants: vi.fn(async () => ["ALT A", "ALT B"]),
  callReflexion: vi.fn(async () => ({
    output: { enhancedPrompt: "REFLEXED PROMPT", changes: [], assumptions: [] },
    usage: { promptTokens: 300, completionTokens: 150 },
    trace: [{ critique: "too vague" }, { critique: "tightened scope" }],
  })),
  callEnsemble: vi.fn(async (ids: string[]) => ({
    output: { enhancedPrompt: "MERGED PROMPT", changes: [], assumptions: [] },
    usage: { promptTokens: 400, completionTokens: 200 },
    cost: 0.0123,
    contributors: ids.map((id) => ({ id, name: id })),
    judge: { id: "gpt-oss-120b", name: "gpt-oss-120b" },
    rationale: "combined the clearest structure",
  })),
}));

import { POST } from "@/app/api/enhance/route";
import { CATEGORIES } from "@/lib/categories";
import { CATEGORY_IDS } from "@/lib/schema";

function req(body: unknown) {
  return new Request("http://localhost/api/enhance", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/enhance", () => {
  for (const category of CATEGORY_IDS) {
    it(`returns a valid parsed shape for ${category}`, async () => {
      const res = await POST(req({ rawPrompt: "do a thing", category }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.enhancedPrompt).toBe("REWRITTEN PROMPT");
      // Uses the category's default rewriter when none is given.
      expect(json.model.id).toBe(CATEGORIES[category].defaultRewriterId);
      expect(json.category).toBe(category);
      expect(typeof json.cost).toBe("number");
      expect(json.costApproximate).toBe(false);
    });
  }

  it("rejects an empty prompt", async () => {
    const res = await POST(req({ rawPrompt: "", category: "coding" }));
    expect(res.status).toBe(400);
  });

  it("rejects an unknown category", async () => {
    const res = await POST(req({ rawPrompt: "x", category: "nope" }));
    expect(res.status).toBe(400);
  });

  it("rejects a non-text model as rewriter", async () => {
    // FLUX is an image model; it must not be usable as a rewriter.
    const res = await POST(req({ rawPrompt: "x", category: "coding", rewriterId: "flux.1-dev" }));
    expect(res.status).toBe(400);
  });

  it("includes variants when requested", async () => {
    const res = await POST(req({ rawPrompt: "x", category: "coding", variants: true }));
    const json = await res.json();
    expect(json.variants).toEqual(["ALT A", "ALT B"]);
  });

  it("runs reflexion mode and returns the critique trace", async () => {
    const res = await POST(req({ rawPrompt: "x", category: "coding", mode: "reflexion", rounds: 2 }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.enhancedPrompt).toBe("REFLEXED PROMPT");
    expect(json.method.mode).toBe("reflexion");
    expect(json.method.rounds).toHaveLength(2);
  });

  it("runs ensemble mode with contributors and its own summed cost", async () => {
    const res = await POST(req({ rawPrompt: "x", category: "coding", mode: "ensemble" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.enhancedPrompt).toBe("MERGED PROMPT");
    expect(json.method.mode).toBe("ensemble");
    expect(json.method.contributors.length).toBeGreaterThanOrEqual(2);
    expect(json.cost).toBe(0.0123);
  });
});
