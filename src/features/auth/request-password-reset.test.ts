import { describe, expect, it, vi } from "vitest";

import { createMemoryUserStore } from "./memory-user-store";
import { createMemoryRateLimiter } from "./rate-limit";
import { requestPasswordReset } from "./request-password-reset";
import type { EmailSender } from "./email/types";

function failingThen(sent: string[]): EmailSender {
  return {
    async sendAccountConfirmation() {},
    async sendAccountExistsNotice() {},
    async sendPasswordReset(message) {
      sent.push(message.to);
      throw new Error("email_send_failed");
    },
    async probe() {
      sent.push("probe");
      throw new Error("email_send_failed");
    },
  };
}

describe("requestPasswordReset", () => {
  it("returns the same accepted failure for an existing account and a missing one", async () => {
    const users = createMemoryUserStore();
    await users.insertUser({
      id: "user-1",
      name: "Ana",
      email: "ana@example.com",
      passwordHash: "hash",
    });
    const sent: string[] = [];
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const deps = {
      users,
      emails: failingThen(sent),
      rateLimiter: createMemoryRateLimiter(),
      balance: async () => {
        sent.push("balance");
      },
    };

    const existing = await requestPasswordReset(
      { email: "ana@example.com" },
      deps,
    );
    const missing = await requestPasswordReset(
      { email: "bia@example.com" },
      deps,
    );

    expect(existing.status).toBe("accepted");
    expect(missing.status).toBe("accepted");
    if (existing.status !== "accepted" || missing.status !== "accepted") return;
    expect(await existing.deliver()).toBe("failed");
    expect(await missing.deliver()).toBe("failed");
    expect(sent.filter((entry) => entry === "ana@example.com")).toHaveLength(1);
    expect(sent).toContain("probe");
    expect(sent).toContain("balance");
    expect(sent).not.toContain("bia@example.com");
    const logged = error.mock.calls.flat().join(" ");
    expect(logged).toContain("auth.password_reset_email_failed");
    expect(logged).not.toContain("ana@example.com");
    expect(logged).not.toContain("bia@example.com");
    error.mockRestore();
  });

  it("consumes the cooldown on failure and allows another attempt after the window", async () => {
    const users = createMemoryUserStore();
    await users.insertUser({
      id: "user-1",
      name: "Ana",
      email: "ana@example.com",
      passwordHash: "hash",
    });
    let fail = true;
    const emails: EmailSender = {
      async sendAccountConfirmation() {},
      async sendAccountExistsNotice() {},
      async sendPasswordReset() {
        if (fail) throw new Error("email_send_failed");
      },
      async probe() {
        if (fail) throw new Error("email_send_failed");
      },
    };
    let nowMs = Date.parse("2026-10-14T12:00:00.000Z");
    const deps = {
      users,
      emails,
      rateLimiter: createMemoryRateLimiter(() => nowMs),
      balance: async () => {},
    };
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    const first = await requestPasswordReset(
      { email: "ana@example.com" },
      deps,
    );
    const blocked = await requestPasswordReset(
      { email: "ana@example.com" },
      deps,
    );
    expect(first.status).toBe("accepted");
    if (first.status !== "accepted") return;
    expect(await first.deliver()).toBe("failed");
    expect(blocked.status).toBe("cooldown");

    nowMs += 60_000;
    fail = false;
    const retry = await requestPasswordReset(
      { email: "ana@example.com" },
      deps,
    );
    expect(retry.status).toBe("accepted");
    if (retry.status !== "accepted") return;
    expect(await retry.deliver()).toBe("sent");

    const missing = await requestPasswordReset(
      { email: "ninguem@example.com" },
      deps,
    );
    expect(missing.status).toBe("accepted");
    if (missing.status !== "accepted") return;
    expect(await missing.deliver()).toBe("sent");
    error.mockRestore();
  });
});
