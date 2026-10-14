import { describe, expect, it, vi } from "vitest";

import { copy } from "./copy";
import type { EmailSender } from "./email/types";
import { createMemoryUserStore } from "./memory-user-store";
import type { PasswordHasher } from "./password";
import { createMemoryRateLimiter } from "./rate-limit";
import {
  SIGNUP_RESPONSE_FLOOR_MS,
  SIGNUP_TIMING_DUMMY,
  registerAccount,
  signupResponsePadMs,
} from "./register-account";
import { sha256 } from "./tokens";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const sleep = async () => {};

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
      sleep,
    });

    expect(result).toEqual({ status: "pending", email: "ana@x.com" });
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
      sleep,
    };

    const firstStarted = performance.now();
    const created = await registerAccount(base, deps);
    const createdMs = performance.now() - firstStarted;

    deps.createId = () => "user-2";
    deps.createToken = () => "other-token";
    const secondStarted = performance.now();
    const duplicate = await registerAccount(
      { ...base, name: "Outra Pessoa", password: "outra senha longa" },
      deps,
    );
    const duplicateMs = performance.now() - secondStarted;

    expect(created).toEqual({ status: "pending", email: "ana@x.com" });
    expect(duplicate).toEqual(created);
    expect(await users.findUserByEmail("ana@x.com")).toMatchObject({
      id: "user-1",
      passwordHash: "hash:senha segura",
    });
    expect(sent[1]).toBe("notice:ana@x.com");
    expect(hashes).toEqual([
      "senha segura",
      "outra senha longa",
      SIGNUP_TIMING_DUMMY,
    ]);
    expect(Math.abs(createdMs - duplicateMs)).toBeLessThan(80);
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
      sleep,
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
      sleep,
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
      sleep,
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
        sleep,
      },
    );

    expect(result).toMatchObject({
      status: "invalid",
      fieldErrors: { password: copy.passwordMin },
    });
  });

  it("pads a new account and an existing email to the same floor", async () => {
    expect(signupResponsePadMs(0, 0)).toBe(SIGNUP_RESPONSE_FLOOR_MS);
    expect(signupResponsePadMs(0, 1)).toBe(SIGNUP_RESPONSE_FLOOR_MS + 50);
    expect(signupResponsePadMs(SIGNUP_RESPONSE_FLOOR_MS + 10, 0)).toBe(0);

    let now = 0;
    const slept: number[] = [];
    const users = createMemoryUserStore();
    const deps = {
      users,
      emails: emails([]),
      hasher: hasher([]),
      breaches: { isBreached: async () => false },
      rateLimiter: createMemoryRateLimiter(),
      createId: () => "user-1",
      createToken: () => "raw-token",
      clock: () => now,
      random: () => 0,
      sleep: async (ms: number) => {
        slept.push(ms);
        now += ms;
      },
    };

    now = 100;
    const createdStart = now;
    await registerAccount(base, deps);
    now = 80;
    const duplicateStart = now;
    deps.createId = () => "user-2";
    await registerAccount(
      { ...base, name: "Outra", password: "outra senha longa" },
      deps,
    );

    expect(slept).toEqual([
      SIGNUP_RESPONSE_FLOOR_MS - (100 - createdStart),
      SIGNUP_RESPONSE_FLOOR_MS - (80 - duplicateStart),
    ]);
    expect(slept[0]).toBe(SIGNUP_RESPONSE_FLOOR_MS);
    expect(slept[1]).toBe(SIGNUP_RESPONSE_FLOOR_MS);
  });
});
