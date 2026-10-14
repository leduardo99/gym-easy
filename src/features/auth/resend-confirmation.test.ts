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

function median(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
  }
  return sorted[mid] ?? 0;
}

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

    const pending = await resendConfirmation(
      { email: "ana@example.com", origin: "https://gym.example", now },
      deps,
    );
    const verified = await resendConfirmation(
      { email: "bia@example.com", origin: "https://gym.example", now },
      deps,
    );
    const missing = await resendConfirmation(
      { email: "ninguem@example.com", origin: "https://gym.example", now },
      deps,
    );

    expect(pending).toMatchObject({ status: "sent" });
    expect(verified).toMatchObject({ status: "sent" });
    expect(missing).toMatchObject({ status: "sent" });
    expect(sent).toEqual([]);
    expect((await users.findVerificationToken(sha256("old")))?.usedAt).toEqual(
      now,
    );
    if (
      pending.status !== "sent" ||
      verified.status !== "sent" ||
      missing.status !== "sent"
    ) {
      return;
    }
    await pending.deliver();
    await verified.deliver();
    await missing.deliver();
    expect(sent).toEqual(["confirm:ana@example.com", "notice:bia@example.com"]);
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

    expect(missing).toMatchObject({ status: "sent" });
    expect(expired).toMatchObject({ status: "sent" });
    expect(sent).toEqual([]);
    expect(await users.findVerificationToken(sha256("fresh-0"))).toMatchObject({
      userId: "pending",
      usedAt: null,
    });
    expect(await users.findVerificationToken(sha256("fresh-1"))).toMatchObject({
      userId: "expired-user",
      usedAt: null,
    });
    if (missing.status !== "sent" || expired.status !== "sent") return;
    await missing.deliver();
    await expired.deliver();
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
          return "hash";
        },
        async verify() {
          return false;
        },
      },
      rateLimiter: createMemoryRateLimiter(),
      createToken: () => "fresh-token",
      balance: async () => {},
    };
    const now = new Date("2026-10-14T12:00:00.000Z");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const cases = [
      "ana@example.com",
      "bia@example.com",
      "ninguem@example.com",
    ] as const;
    const results = [];

    for (const email of cases) {
      results.push(
        await resendConfirmation(
          { email, origin: "https://gym.example", now },
          deps,
        ),
      );
    }

    expect(results.map((result) => result.status)).toEqual([
      "sent",
      "sent",
      "sent",
    ]);
    for (const result of results) {
      if (result.status === "sent") await result.deliver();
    }
    const logged = error.mock.calls.flat().join(" ");
    expect(logged).toContain("auth.resend_email_failed");
    expect(logged).not.toContain("ana@example.com");
    expect(logged).not.toContain("bia@example.com");
    expect(logged).not.toContain("ninguem@example.com");
    error.mockRestore();
  });

  it("keeps the median response within 50 ms when Resend takes 300 to 800 ms", async () => {
    const samples = 21;
    const users = createMemoryUserStore();
    for (let index = 0; index < samples; index += 1) {
      await users.insertUser({
        id: `pending-${index}`,
        name: "Ana",
        email: `pending-${index}@example.com`,
        passwordHash: "hash",
      });
      await users.insertUser({
        id: `done-${index}`,
        name: "Bia",
        email: `done-${index}@example.com`,
        passwordHash: "hash",
      });
      await users.markEmailVerified(
        `done-${index}`,
        new Date("2026-10-01T00:00:00.000Z"),
      );
    }

    const sent: string[] = [];
    const resendDelayMs = () => 300 + Math.floor(Math.random() * 501);
    const deps = {
      users,
      emails: {
        async sendAccountConfirmation(message: { to: string }) {
          await delay(resendDelayMs());
          sent.push(message.to);
        },
        async sendAccountExistsNotice(message: { to: string }) {
          await delay(resendDelayMs());
          sent.push(message.to);
        },
      },
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
      createToken: () => "token",
      balance: () => delay(resendDelayMs()),
    };
    const now = new Date("2026-10-14T12:00:00.000Z");
    const pendingMs: number[] = [];
    const verifiedMs: number[] = [];
    const missingMs: number[] = [];
    const deliveries: Array<() => Promise<void>> = [];

    for (let index = 0; index < samples; index += 1) {
      const startedPending = performance.now();
      const pending = await resendConfirmation(
        {
          email: `pending-${index}@example.com`,
          origin: "https://gym.example",
          now,
        },
        deps,
      );
      pendingMs.push(performance.now() - startedPending);

      const startedVerified = performance.now();
      const verified = await resendConfirmation(
        {
          email: `done-${index}@example.com`,
          origin: "https://gym.example",
          now,
        },
        deps,
      );
      verifiedMs.push(performance.now() - startedVerified);

      const startedMissing = performance.now();
      const missing = await resendConfirmation(
        {
          email: `missing-${index}@example.com`,
          origin: "https://gym.example",
          now,
        },
        deps,
      );
      missingMs.push(performance.now() - startedMissing);

      for (const result of [pending, verified, missing]) {
        expect(result.status).toBe("sent");
        if (result.status === "sent") deliveries.push(result.deliver);
      }
    }

    const pendingMedian = median(pendingMs);
    const verifiedMedian = median(verifiedMs);
    const missingMedian = median(missingMs);
    expect(Math.abs(pendingMedian - missingMedian)).toBeLessThan(50);
    expect(Math.abs(verifiedMedian - missingMedian)).toBeLessThan(50);
    expect(pendingMedian).toBeLessThan(200);
    expect(verifiedMedian).toBeLessThan(200);
    expect(missingMedian).toBeLessThan(200);
    expect(sent).toEqual([]);

    await Promise.all(deliveries.map((deliver) => deliver()));
    expect(sent).toHaveLength(samples * 2);
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

    expect(first).toMatchObject({ status: "sent" });
    expect(second.status).toBe("cooldown");
  });
});
