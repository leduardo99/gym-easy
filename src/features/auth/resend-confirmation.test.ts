import { describe, expect, it } from "vitest";

import type { EmailSender } from "./email/types";
import { createMemoryUserStore } from "./memory-user-store";
import { createMemoryRateLimiter } from "./rate-limit";
import { resendConfirmation } from "./resend-confirmation";
import { sha256 } from "./tokens";

const delay = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

describe("resendConfirmation", () => {
  it("sends a new link, a notice, or nothing with the same sent status", async () => {
    const users = createMemoryUserStore();
    await users.insertUser({
      id: "pending",
      name: "Ana",
      email: "ana@example.com",
      passwordHash: "hash",
    });
    await users.saveVerificationToken({
      tokenHash: sha256("old"),
      userId: "pending",
      expiresAt: new Date("2026-10-20T00:00:00.000Z"),
    });
    await users.insertUser({
      id: "done",
      name: "Bia",
      email: "bia@example.com",
      passwordHash: "hash",
    });
    await users.markEmailVerified("done", new Date("2026-10-01T00:00:00.000Z"));

    const sent: string[] = [];
    const emails: EmailSender = {
      async sendAccountConfirmation(message) {
        await delay(20);
        sent.push(`confirm:${message.to}`);
      },
      async sendAccountExistsNotice(message) {
        await delay(20);
        sent.push(`notice:${message.to}`);
      },
    };
    let tokens = 0;
    const deps = {
      users,
      emails,
      hasher: {
        async hash() {
          await delay(20);
          return "hash";
        },
        async verify() {
          return false;
        },
      },
      rateLimiter: createMemoryRateLimiter(),
      createToken: () => `token-${tokens++}`,
      balance: () => delay(20),
    };
    const now = new Date("2026-10-14T12:00:00.000Z");

    const pendingStarted = performance.now();
    const pending = await resendConfirmation(
      { email: "ana@example.com", origin: "https://gym.example", now },
      deps,
    );
    const pendingMs = performance.now() - pendingStarted;

    const verified = await resendConfirmation(
      { email: "bia@example.com", origin: "https://gym.example", now },
      deps,
    );

    const missingStarted = performance.now();
    const missing = await resendConfirmation(
      { email: "ninguem@example.com", origin: "https://gym.example", now },
      deps,
    );
    const missingMs = performance.now() - missingStarted;

    expect(pending).toEqual({ status: "sent" });
    expect(verified).toEqual({ status: "sent" });
    expect(missing).toEqual({ status: "sent" });
    expect(sent).toEqual(["confirm:ana@example.com", "notice:bia@example.com"]);
    expect((await users.findVerificationToken(sha256("old")))?.usedAt).toEqual(
      now,
    );
    expect(Math.abs(pendingMs - missingMs)).toBeLessThan(80);
  });

  it("enforces the 60 second cooldown", async () => {
    const deps = {
      users: createMemoryUserStore(),
      emails: {
        async sendAccountConfirmation() {},
        async sendAccountExistsNotice() {},
      },
      hasher: {
        async hash() {
          return "hash";
        },
        async verify() {
          return false;
        },
      },
      rateLimiter: createMemoryRateLimiter(),
      createToken: () => "token",
      balance: async () => {},
    };
    const now = new Date("2026-10-14T12:00:00.000Z");
    const first = await resendConfirmation(
      { email: "ana@example.com", origin: "https://gym.example", now },
      deps,
    );
    const second = await resendConfirmation(
      { email: "ana@example.com", origin: "https://gym.example", now },
      deps,
    );

    expect(first).toEqual({ status: "sent" });
    expect(second.status).toBe("cooldown");
  });
});
