// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({
  connection: vi.fn(async () => undefined),
}));

vi.mock("@/features/auth/lookup-session", () => ({
  lookupSession: vi.fn(),
}));

vi.mock("@/lib/ai/http", () => ({
  createCoachHttpResponse: vi.fn(),
}));

import { lookupSession } from "@/features/auth/lookup-session";
import { createCoachHttpResponse } from "@/lib/ai/http";

import { POST } from "./route";

function request(origin: string | null, contentType = "application/json") {
  const headers = new Headers();
  if (origin) headers.set("origin", origin);
  if (contentType) headers.set("content-type", contentType);
  headers.set("x-forwarded-host", "localhost");
  return new Request("http://localhost/api/ai/coach", {
    method: "POST",
    headers,
    body: JSON.stringify({ message: "oi" }),
  });
}

describe("POST /api/ai/coach", () => {
  beforeEach(() => {
    vi.mocked(lookupSession).mockReset();
    vi.mocked(createCoachHttpResponse).mockReset();
    vi.mocked(lookupSession).mockResolvedValue({
      status: "ok",
      user: {
        id: "user-1",
        name: "Ana",
        email: "a@example.com",
        emailVerifiedAt: new Date(),
        onboardingCompletedAt: null,
      },
    });
    vi.mocked(createCoachHttpResponse).mockResolvedValue(new Response("ok"));
  });

  it("rejects a cross-site Origin", async () => {
    const response = await POST(request("https://evil.example"));
    expect(response.status).toBe(403);
    expect(createCoachHttpResponse).not.toHaveBeenCalled();
  });

  it("rejects an Origin that does not match the forwarded host", async () => {
    const headers = new Headers({
      origin: "http://localhost",
      "content-type": "application/json",
      "x-forwarded-host": "evil.example",
    });
    const response = await POST(
      new Request("http://localhost/api/ai/coach", {
        method: "POST",
        headers,
        body: JSON.stringify({ message: "oi" }),
      }),
    );
    expect(response.status).toBe(403);
    expect(createCoachHttpResponse).not.toHaveBeenCalled();
  });

  it("rejects a body that is not JSON", async () => {
    const response = await POST(request("http://localhost", "text/plain"));
    expect(response.status).toBe(415);
    expect(createCoachHttpResponse).not.toHaveBeenCalled();
  });

  it("accepts the same host and forwards the request signal", async () => {
    const incoming = request("http://localhost");
    const response = await POST(incoming);
    expect(response.status).toBe(200);
    expect(createCoachHttpResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        signal: incoming.signal,
      }),
    );
  });
});
