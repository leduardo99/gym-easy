import { describe, expect, it, vi } from "vitest";

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

  it("creates a confirmation token when the account has none valid", async () => {
    const users = createMemoryUserStore();
    await users.insertUser({
      id: "pending",
      name: "Ana",
      email: "ana@example.com",
      passwordHash: "hash",
    });
    await users.insertUser({
      id: "expired-user",
      name: "Bia",
      email: "bia@example.com",
      passwordHash: "hash",
    });
    await users.saveVerificationToken({
      tokenHash: sha256("expired"),
      userId: "expired-user",
      expiresAt: new Date("2026-10-01T00:00:00.000Z"),
    });
    const sent: string[] = [];
    let issued = 0;
    const deps = {
      users,
      emails: {
        async sendAccountConfirmation(message: {
          to: string;
          confirmUrl: string;
        }) {
          sent.push(`${message.to}:${message.confirmUrl}`);
        },
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
      createToken: () => `fresh-${issued++}`,
      balance: async () => {},
    };
    const now = new Date("2026-10-14T12:00:00.000Z");

    const missing = await resendConfirmation(
      { email: "ana@example.com", origin: "https://gym.example", now },
      deps,
    );
    const expired = await resendConfirmation(
      { email: "bia@example.com", origin: "https://gym.example", now },
      deps,
    );

    expect(missing).toEqual({ status: "sent" });
    expect(expired).toEqual({ status: "sent" });
    expect(await users.findVerificationToken(sha256("fresh-0"))).toMatchObject({
      userId: "pending",
      usedAt: null,
    });
    expect(await users.findVerificationToken(sha256("fresh-1"))).toMatchObject({
      userId: "expired-user",
      usedAt: null,
    });
    expect(sent).toEqual([
      "ana@example.com:https://gym.example/cadastro/confirmar?token=fresh-0",
      "bia@example.com:https://gym.example/cadastro/confirmar?token=fresh-1",
    ]);
  });

  it("returns sent when Resend fails for known and unknown emails", async () => {
    const users = createMemoryUserStore();
    await users.insertUser({
      id: "none",
      name: "Ana",
      email: "ana@example.com",
      passwordHash: "hash",
    });
    await users.insertUser({
      id: "has-token",
      name: "Bia",
      email: "bia@example.com",
      passwordHash: "hash",
    });
    await users.saveVerificationToken({
      tokenHash: sha256("still-valid"),
      userId: "has-token",
      expiresAt: new Date("2026-10-20T00:00:00.000Z"),
    });
    const emails: EmailSender = {
      async sendAccountConfirmation() {
        await delay(25);
        throw new Error("email_send_failed");
      },
      async sendAccountExistsNotice() {
        throw new Error("email_send_failed");
      },
    };
    const deps = {
      users,
      emails,
      hasher: {
        async hash() {
          await delay(25);
          return "hash";
        },
        async verify() {
          return false;
        },
      },
      rateLimiter: createMemoryRateLimiter(),
      createToken: () => "fresh-token",
      balance: () => delay(25),
    };
    const now = new Date("2026-10-14T12:00:00.000Z");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const cases = [
      "ana@example.com",
      "bia@example.com",
      "ninguem@example.com",
    ] as const;
    const results: { status: string }[] = [];
    const elapsed: number[] = [];

    for (const email of cases) {
      const started = performance.now();
      results.push(
        await resendConfirmation(
          { email, origin: "https://gym.example", now },
          deps,
        ),
      );
      elapsed.push(performance.now() - started);
    }

    expect(results).toEqual([
      { status: "sent" },
      { status: "sent" },
      { status: "sent" },
    ]);
    expect(Math.max(...elapsed) - Math.min(...elapsed)).toBeLessThan(80);
    const logged = error.mock.calls.flat().join(" ");
    expect(logged).toContain("auth.resend_email_failed");
    expect(logged).not.toContain("ana@example.com");
    expect(logged).not.toContain("bia@example.com");
    expect(logged).not.toContain("ninguem@example.com");
    error.mockRestore();
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
