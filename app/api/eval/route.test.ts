import { describe, it, expect, vi } from "vitest";

// Mock the client so no live call is made. callEval returns a fixed verdict.
vi.mock("@/lib/client", () => ({
  isConfigured: () => true,
  callEval: vi.fn(async () => ({
    winner: "enhanced" as const,
    reasoning: "B was more complete",
    rawScore: 6,
    enhancedScore: 9,
    rawOutput: "RAW ANSWER",
    enhancedOutput: "ENHANCED ANSWER",
    usage: { promptTokens: 500, completionTokens: 300 },
    cost: 0.002,
  })),
}));

import { POST } from "@/app/api/eval/route";

function req(body: unknown) {
  return new Request("http://localhost/api/eval", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const base = {
  rawPrompt: "do a thing",
  enhancedPrompt: "Do a specific thing with clear constraints.",
  category: "coding",
};

describe("POST /api/eval", () => {
  it("returns the judged verdict with both outputs", async () => {
    const res = await POST(req(base));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.winner).toBe("enhanced");
    expect(json.rawOutput).toBe("RAW ANSWER");
    expect(json.enhancedOutput).toBe("ENHANCED ANSWER");
    expect(json.target.id).toBeTruthy();
    // Judge must differ from target to avoid self-preference.
    expect(json.judge.id).not.toBe(json.target.id);
  });

  it("rejects a non-text target model", async () => {
    // FLUX is an image model; it cannot be run-and-judged as text.
    const res = await POST(req({ ...base, targetId: "flux.1-dev" }));
    expect(res.status).toBe(400);
  });

  it("rejects an empty enhanced prompt", async () => {
    const res = await POST(req({ ...base, enhancedPrompt: "" }));
    expect(res.status).toBe(400);
  });
});
