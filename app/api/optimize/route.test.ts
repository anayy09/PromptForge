import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/client", () => ({
  isConfigured: () => true,
  isModelAvailable: () => true,
  availableOf: <T,>(list: T) => list,
  resolveAvailableRewriter: (id: string) => id,
  configuredSources: () => ['navigator', 'openrouter'],
  callOptimize: vi.fn(async () => ({
    candidates: [
      { prompt: "BEST PROMPT", output: "best answer", score: 9 },
      { prompt: "OK PROMPT", output: "ok answer", score: 6 },
    ],
    reasoning: "the first was clearer",
    usage: { promptTokens: 900, completionTokens: 500 },
    cost: 0.004,
  })),
}));

import { POST } from "@/app/api/optimize/route";

function req(body: unknown) {
  return new Request("http://localhost/api/optimize", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/optimize", () => {
  it("returns the ranked candidates with a best pick", async () => {
    const res = await POST(req({ rawPrompt: "do a thing", category: "coding" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.best.prompt).toBe("BEST PROMPT");
    expect(json.candidates).toHaveLength(2);
    expect(json.judge.id).not.toBe(json.target.id);
  });

  it("rejects a non-text target", async () => {
    const res = await POST(req({ rawPrompt: "x", category: "coding", targetId: "flux.1-dev" }));
    expect(res.status).toBe(400);
  });

  it("rejects codestral as the rewriter (not a valid rewriter)", async () => {
    const res = await POST(req({ rawPrompt: "x", category: "coding", rewriterId: "codestral-22b" }));
    expect(res.status).toBe(400);
  });
});
