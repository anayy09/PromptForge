import { describe, it, expect, vi } from "vitest";

// Mock the client so no live call is made. streamChat yields two text chunks.
vi.mock("@/lib/client", () => ({
  isConfigured: () => true,
  isModelAvailable: () => true,
  availableOf: <T,>(list: T) => list,
  resolveAvailableRewriter: (id: string) => id,
  configuredSources: () => ['navigator', 'openrouter'],
  // eslint-disable-next-line require-yield
  streamChat: vi.fn(async function* () {
    yield "Hello";
    yield ", world";
  }),
}));

import { POST } from "@/app/api/chat/route";

function req(body: unknown) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/chat", () => {
  it("streams assistant text for a valid chat model", async () => {
    const res = await POST(
      req({ modelId: "llama-3.3-70b-instruct", messages: [{ role: "user", content: "hi" }] }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/plain");
    const text = await res.text();
    expect(text).toBe("Hello, world");
  });

  it("rejects a model that is not a chat model", async () => {
    // FLUX is an image model; it is not in the chat pool.
    const res = await POST(req({ modelId: "flux.1-dev", messages: [{ role: "user", content: "hi" }] }));
    expect(res.status).toBe(400);
  });

  it("rejects a request with no messages", async () => {
    const res = await POST(req({ modelId: "llama-3.3-70b-instruct", messages: [] }));
    expect(res.status).toBe(400);
  });
});
