import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/client", () => ({
  isConfigured: () => true,
  isModelAvailable: () => true,
  availableOf: <T,>(list: T) => list,
  resolveAvailableRewriter: (id: string) => id,
  configuredSources: () => ['navigator', 'openrouter'],
  synthesizeSpeech: vi.fn(async () => new TextEncoder().encode("MP3BYTES").buffer),
}));

import { POST } from "@/app/api/speech/route";

function req(body: unknown) {
  return new Request("http://localhost/api/speech", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/speech", () => {
  it("returns audio bytes for valid text", async () => {
    const res = await POST(req({ text: "hello there" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("audio/mpeg");
    const buf = await res.arrayBuffer();
    expect(buf.byteLength).toBeGreaterThan(0);
  });

  it("rejects empty text", async () => {
    const res = await POST(req({ text: "" }));
    expect(res.status).toBe(400);
  });
});
