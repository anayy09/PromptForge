import { describe, it, expect, vi } from "vitest";

// Mock the endpoint client so no live call is made. Returns a fixed, valid ModelOutput + usage.
vi.mock("@/lib/client", () => ({
  isConfigured: () => true,
  callRewriter: vi.fn(async () => ({
    output: { enhancedPrompt: "REWRITTEN PROMPT", changes: [], assumptions: [] },
    usage: { promptTokens: 100, completionTokens: 50 },
  })),
  callVariants: vi.fn(async () => ["ALT A", "ALT B"]),
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
});
