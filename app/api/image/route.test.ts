import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/client", () => ({
  isConfigured: () => true,
  generateImage: vi.fn(async () => "data:image/png;base64,AAAA"),
}));

import { POST } from "@/app/api/image/route";

function req(body: unknown) {
  return new Request("http://localhost/api/image", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/image", () => {
  it("generates an image for a FLUX model", async () => {
    const res = await POST(req({ modelId: "flux.1-schnell", prompt: "a red cube" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.image).toContain("data:image/png");
    expect(json.model.id).toBe("flux.1-schnell");
  });

  it("rejects a non-image model", async () => {
    const res = await POST(req({ modelId: "gpt-oss-120b", prompt: "a red cube" }));
    expect(res.status).toBe(400);
  });

  it("rejects an empty prompt", async () => {
    const res = await POST(req({ modelId: "flux.1-schnell", prompt: "" }));
    expect(res.status).toBe(400);
  });
});
