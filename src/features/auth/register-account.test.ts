import { describe, expect, it, vi } from "vitest";

import { copy } from "./copy";
import type { EmailSender } from "./email/types";
import { createMemoryUserStore } from "./memory-user-store";
import type { PasswordHasher } from "./password";
import { createMemoryRateLimiter } from "./rate-limit";
import { registerAccount } from "./register-account";
import { sha256 } from "./tokens";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function hasher(hashes: string[], wait = 0): PasswordHasher {
  return {
    async hash(password) {
      if (wait > 0) await delay(wait);
      hashes.push(password);
      return `hash:${password}`;
    },
    async verify(passwordHash, password) {
      return passwordHash === `hash:${password}`;
    },
  };
}

function emails(sent: string[], wait = 0): EmailSender {
  return {
    async sendAccountConfirmation(message) {
      if (wait > 0) await delay(wait);
      sent.push(`confirm:${message.to}:${message.confirmUrl}`);
    },
    async sendAccountExistsNotice(message) {
      if (wait > 0) await delay(wait);
      sent.push(`notice:${message.to}`);
    },
    async sendPasswordReset() {},
    async probe() {},
  };
}

const base = {
  name: "Ana Souza",
  email: " Ana@X.com ",
  password: "senha segura",
  ip: "203.0.113.8",
  origin: "https://gym.example",
  now: new Date("2026-10-14T12:00:00.000Z"),
};

describe("registerAccount", () => {
  it("creates an unverified account and sends a confirmation link", async () => {
    const users = createMemoryUserStore();
    const sent: string[] = [];
    const result = await registerAccount(base, {
      users,
      emails: emails(sent),
      hasher: hasher([]),
      breaches: { isBreached: async () => false },
      rateLimiter: createMemoryRateLimiter(),
      createId: () => "user-1",
      createToken: () => "raw-token",
    });

    expect(result).toMatchObject({ status: "pending", email: "ana@x.com" });
    expect(sent).toEqual([]);
    expect(await users.findVerificationToken(sha256("raw-token"))).toBeNull();
    if (result.status !== "pending") return;
    await result.deliver();

    const user = await users.findUserByEmail("ana@x.com");
    expect(user?.passwordHash).toBe("hash:senha segura");
    expect(user?.emailVerifiedAt).toBeNull();
    const token = await users.findVerificationToken(sha256("raw-token"));
    expect(token?.userId).toBe("user-1");
    expect(sent).toEqual([
      "confirm:ana@x.com:https://gym.example/cadastro/confirmar?token=raw-token",
    ]);
  });

  it("returns the same pending result and warns the owner when the email exists", async () => {
    const users = createMemoryUserStore();
    const hashes: string[] = [];
    const sent: string[] = [];
    const deps = {
      users,
      emails: emails(sent, 30),
      hasher: hasher(hashes, 40),
      breaches: { isBreached: async () => false },
      rateLimiter: createMemoryRateLimiter(),
      createId: () => "user-1",
      createToken: () => "raw-token",
    };

    const created = await registerAccount(base, deps);
    deps.createId = () => "user-2";
    deps.createToken = () => "other-token";
    const duplicate = await registerAccount(
      { ...base, name: "Outra Pessoa", password: "outra senha longa" },
      deps,
    );

    expect(created).toMatchObject({ status: "pending", email: "ana@x.com" });
    expect(duplicate).toMatchObject({ status: "pending", email: "ana@x.com" });
    expect(sent).toEqual([]);
    expect(await users.findUserByEmail("ana@x.com")).toMatchObject({
      id: "user-1",
      passwordHash: "hash:senha segura",
    });
    expect(hashes).toEqual(["senha segura", "outra senha longa"]);
    if (created.status !== "pending" || duplicate.status !== "pending") return;
    await created.deliver();
    await duplicate.deliver();
    expect(sent).toEqual([
      "confirm:ana@x.com:https://gym.example/cadastro/confirmar?token=raw-token",
      "notice:ana@x.com",
    ]);
    expect(await users.findUserByEmail("ana@x.com")).toMatchObject({
      id: "user-1",
      passwordHash: "hash:senha segura",
    });
  });

  it("stays pending when the email send fails on both branches", async () => {
    const users = createMemoryUserStore();
    const failing: EmailSender = {
      async sendAccountConfirmation() {
        throw new Error("email_send_failed");
      },
      async sendAccountExistsNotice() {
        throw new Error("email_send_failed");
      },
      async sendPasswordReset() {
        throw new Error("email_send_failed");
      },
      async probe() {
        throw new Error("email_send_failed");
      },
    };
    const deps = {
      users,
      emails: failing,
      hasher: hasher([]),
      breaches: { isBreached: async () => false },
      rateLimiter: createMemoryRateLimiter(),
      createId: () => "user-1",
      createToken: () => "raw-token",
    };
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const created = await registerAccount(base, deps);
    deps.createId = () => "user-2";
    const duplicate = await registerAccount(
      { ...base, password: "outra senha longa" },
      deps,
    );

    expect(created).toMatchObject({ status: "pending", email: "ana@x.com" });
    expect(duplicate).toMatchObject({ status: "pending", email: "ana@x.com" });
    if (created.status !== "pending" || duplicate.status !== "pending") return;
    expect(await created.deliver()).toBe("failed");
    expect(await duplicate.deliver()).toBe("failed");
    expect(await users.findUserByEmail("ana@x.com")).toMatchObject({
      id: "user-1",
    });
    const logged = error.mock.calls.flat().join(" ");
    expect(logged).toContain("auth.signup_email_failed");
    expect(logged).not.toContain("ana@x.com");
    error.mockRestore();
  });

  it("rejects a breached password before looking up the email", async () => {
    const users = createMemoryUserStore();
    const find = vi.spyOn(users, "findUserByEmail");
    const result = await registerAccount(base, {
      users,
      emails: emails([]),
      hasher: hasher([]),
      breaches: { isBreached: async () => true },
      rateLimiter: createMemoryRateLimiter(),
      createId: () => "user-1",
      createToken: () => "raw-token",
    });

    expect(result.status).toBe("breached");
    expect(find).not.toHaveBeenCalled();
    expect(await users.findUserByEmail("ana@x.com")).toBeNull();
  });

  it("rate limits signup by ip with the generic message payload", async () => {
    const limiter = createMemoryRateLimiter();
    const users = createMemoryUserStore();
    const deps = {
      users,
      emails: emails([]),
      hasher: hasher([]),
      breaches: { isBreached: async () => false },
      rateLimiter: limiter,
      createId: () => "user-1",
      createToken: () => "raw-token",
    };

    for (let attempt = 0; attempt < 10; attempt += 1) {
      deps.createId = () => `user-${attempt}`;
      const result = await registerAccount(
        { ...base, email: `pessoa${attempt}@example.com` },
        deps,
      );
      expect(result.status).toBe("pending");
    }

    const blocked = await registerAccount(
      { ...base, email: "mais-uma@example.com" },
      deps,
    );
    expect(blocked.status).toBe("rate_limited");
    if (blocked.status === "rate_limited") {
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    }
  });

  it("does not share a signup bucket when the request has no client ip", async () => {
    const limiter = createMemoryRateLimiter();
    const users = createMemoryUserStore();
    const deps = {
      users,
      emails: emails([]),
      hasher: hasher([]),
      breaches: { isBreached: async () => false },
      rateLimiter: limiter,
      createId: () => "user-1",
      createToken: () => "raw-token",
    };

    for (let attempt = 0; attempt < 11; attempt += 1) {
      deps.createId = () => `user-${attempt}`;
      const result = await registerAccount(
        { ...base, ip: null, email: `sem-ip-${attempt}@example.com` },
        deps,
      );
      expect(result.status).toBe("pending");
    }
  });

  it("rejects a short password on the server", async () => {
    const result = await registerAccount(
      { ...base, password: "curta" },
      {
        users: createMemoryUserStore(),
        emails: emails([]),
        hasher: hasher([]),
        breaches: { isBreached: async () => false },
        rateLimiter: createMemoryRateLimiter(),
        createId: () => "user-1",
        createToken: () => "raw-token",
      },
    );

    expect(result).toMatchObject({
      status: "invalid",
      fieldErrors: { password: copy.passwordMin },
    });
  });
});
