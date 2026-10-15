// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { lookupSession, deleteHistory, revokeHealth, revokeChat, rateHit } =
  vi.hoisted(() => ({
    lookupSession: vi.fn(),
    deleteHistory: vi.fn(),
    revokeHealth: vi.fn(),
    revokeChat: vi.fn(),
    rateHit: vi.fn(),
  }));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ origin: "http://127.0.0.1:3000" })),
}));

vi.mock("@/lib/env", () => ({
  getServerEnv: () => ({ APP_URL: "http://127.0.0.1:3000" }),
}));

vi.mock("@/features/auth/lookup-session", () => ({
  lookupSession,
}));

vi.mock("@/features/auth/drizzle-rate-limiter", () => ({
  createDrizzleRateLimiter: () => ({ hit: rateHit }),
}));

vi.mock("@/db", () => ({
  getDb: () => ({}),
}));

vi.mock("./delete-chat-history", () => ({
  deleteUserCoachChatHistory: deleteHistory,
}));

vi.mock("./revoke-consent", () => ({
  revokeCoachHealthConsent: revokeHealth,
  revokeCoachChatConsent: revokeChat,
}));

import {
  deleteCoachChatHistoryAction,
  revokeCoachChatConsentAction,
  revokeCoachHealthConsentAction,
} from "./actions";

describe("coach privacy actions", () => {
  beforeEach(() => {
    lookupSession.mockReset();
    deleteHistory.mockReset();
    revokeHealth.mockReset();
    revokeChat.mockReset();
    rateHit.mockReset();
    rateHit.mockResolvedValue({ allowed: true, retryAfterSeconds: 0, hits: 1 });
    lookupSession.mockResolvedValue({
      status: "ok",
      user: {
        id: "user-1",
        name: "Ana",
        email: "a@example.com",
        emailVerifiedAt: new Date(),
        onboardingCompletedAt: null,
      },
    });
  });

  it("apaga o histórico com sessão e origem válidas", async () => {
    deleteHistory.mockResolvedValue(3);
    const result = await deleteCoachChatHistoryAction();
    expect(result).toEqual({ ok: true, deletedCount: 3 });
    expect(deleteHistory).toHaveBeenCalledWith({}, "user-1");
  });

  it("revoga saúde com sessão e origem válidas", async () => {
    revokeHealth.mockResolvedValue({ ok: true, deletedProposals: 1 });
    const result = await revokeCoachHealthConsentAction();
    expect(result).toEqual({ ok: true, deletedCount: 1 });
    expect(revokeHealth).toHaveBeenCalledWith({}, "user-1", "profile");
  });

  it("revoga chat com sessão e origem válidas", async () => {
    revokeChat.mockResolvedValue({ ok: true, deletedMessages: 2 });
    const result = await revokeCoachChatConsentAction();
    expect(result).toEqual({ ok: true, deletedCount: 2 });
    expect(revokeChat).toHaveBeenCalledWith({}, "user-1", "profile");
  });

  it("recusa sem sessão", async () => {
    lookupSession.mockResolvedValue({ status: "missing" });
    const result = await deleteCoachChatHistoryAction();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.formError.code).toBe("unauthorized");
    expect(deleteHistory).not.toHaveBeenCalled();
  });

  it("recusa origem cruzada", async () => {
    const { headers } = await import("next/headers");
    vi.mocked(headers).mockResolvedValueOnce(
      new Headers({ origin: "https://evil.example" }),
    );
    const result = await revokeCoachHealthConsentAction();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.formError.code).toBe("origin");
    expect(revokeHealth).not.toHaveBeenCalled();
  });
});
