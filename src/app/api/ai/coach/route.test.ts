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
import { DEFAULT_DEV_APP_URL, resetServerEnvCache } from "@/lib/env";

import { POST } from "./route";

function request(
  input: {
    origin?: string | null;
    referer?: string;
    contentType?: string;
  } = {},
) {
  const headers = new Headers();
  const origin = input.origin;
  if (origin !== undefined && origin !== null) headers.set("origin", origin);
  if (input.referer) headers.set("referer", input.referer);
  const contentType = input.contentType ?? "application/json";
  if (contentType) headers.set("content-type", contentType);
  return new Request("http://localhost/api/ai/coach", {
    method: "POST",
    headers,
    body: JSON.stringify({ message: "oi" }),
  });
}

describe("POST /api/ai/coach", () => {
  beforeEach(() => {
    resetServerEnvCache();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/gym");
    vi.stubEnv(
      "CONFIRM_EMAIL_SECRET",
      "confirm-email-secret-for-unit-tests-00",
    );
    vi.stubEnv("CONSENT_PSEUDONYM_KEY", "consent-pseudonym-test-key-32b!!");
    delete process.env.APP_URL;
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
    const response = await POST(request({ origin: "https://evil.example" }));
    expect(response.status).toBe(403);
    expect(createCoachHttpResponse).not.toHaveBeenCalled();
  });

  it("rejects requests without Origin or Referer", async () => {
    const response = await POST(request({}));
    expect(response.status).toBe(403);
  });

  it("rejects a body that is not JSON", async () => {
    const response = await POST(
      request({ origin: DEFAULT_DEV_APP_URL, contentType: "text/plain" }),
    );
    expect(response.status).toBe(415);
    expect(createCoachHttpResponse).not.toHaveBeenCalled();
  });

  it("compares Origin with APP_URL when it is set", async () => {
    vi.stubEnv("APP_URL", "https://app.gaffer.pt");
    resetServerEnvCache();
    const response = await POST(request({ origin: "https://app.gaffer.pt" }));
    expect(response.status).toBe(200);

    const blocked = await POST(request({ origin: "http://localhost:3000" }));
    expect(blocked.status).toBe(403);
  });

  it("rejects Origin null when APP_URL is set", async () => {
    vi.stubEnv("APP_URL", "https://app.gaffer.pt");
    resetServerEnvCache();
    const response = await POST(request({ origin: "null" }));
    expect(response.status).toBe(403);
  });

  it("accepts Referer when Origin is missing and APP_URL matches", async () => {
    vi.stubEnv("APP_URL", "https://app.gaffer.pt");
    resetServerEnvCache();
    const response = await POST(
      request({ referer: "https://app.gaffer.pt/treinos" }),
    );
    expect(response.status).toBe(200);
  });

  it("returns 403 in production without APP_URL", async () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.APP_URL;
    resetServerEnvCache();
    const response = await POST(request({ origin: "https://app.gaffer.pt" }));
    expect(response.status).toBe(403);
    expect(createCoachHttpResponse).not.toHaveBeenCalled();
  });

  it("accepts the default APP_URL origin and forwards the request signal", async () => {
    const incoming = request({ origin: DEFAULT_DEV_APP_URL });
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
