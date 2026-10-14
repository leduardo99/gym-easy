import { describe, expect, it } from "vitest";

import { createMemoryUserStore } from "./memory-user-store";
import { loginAccount } from "./login-account";
import type { PasswordHasher } from "./password";
import { createMemoryRateLimiter } from "./rate-limit";
import { sha256 } from "./tokens";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function hasher(verified: string[]): PasswordHasher {
  return {
    async hash(password) {
      return `hash:${password}`;
    },
    async verify(passwordHash, password) {
      if (verified.length >= 0) await delay(30);
      verified.push(passwordHash);
      return passwordHash === `hash:${password}`;
    },
  };
}

async function seed(
  users: ReturnType<typeof createMemoryUserStore>,
  verified: boolean,
) {
  await users.insertUser({
    id: "user-1",
    name: "Ana",
    email: "ana@example.com",
    passwordHash: "hash:senha segura",
  });
  if (verified)
    await users.markEmailVerified(
      "user-1",
      new Date("2026-10-01T00:00:00.000Z"),
    );
}

const input = {
  email: "ANA@example.com",
  password: "senha segura",
  ip: "203.0.113.9",
  next: "/perfil",
  now: new Date("2026-10-14T12:00:00.000Z"),
  existingTokenHash: sha256("old-session"),
};

describe("loginAccount", () => {
  it("rotates the session and continues onboarding until it is finished", async () => {
    const users = createMemoryUserStore();
    await seed(users, true);
    await users.insertSession({
      tokenHash: sha256("old-session"),
      userId: "user-1",
      createdAt: input.now,
      lastSeenAt: input.now,
      expiresAt: new Date(input.now.getTime() + 1000),
    });

    const result = await loginAccount(input, {
      users,
      hasher: hasher([]),
      rateLimiter: createMemoryRateLimiter(),
      dummyHash: "hash:dummy",
      createToken: () => "new-session",
    });

    expect(result).toEqual({
      status: "authenticated",
      token: "new-session",
      destination: "/onboarding",
    });
    expect(await users.findSession(sha256("old-session"))).toBeNull();
    expect(await users.findSession(sha256("new-session"))).toMatchObject({
      userId: "user-1",
    });
  });

  it("uses the same error and a verify call for unknown emails and bad passwords", async () => {
    const users = createMemoryUserStore();
    await seed(users, true);
    const verified: string[] = [];
    const deps = {
      users,
      hasher: hasher(verified),
      rateLimiter: createMemoryRateLimiter(),
      dummyHash: "hash:dummy",
      createToken: () => "new-session",
    };

    const missingStarted = performance.now();
    const missing = await loginAccount(
      { ...input, email: "ninguem@example.com", existingTokenHash: null },
      deps,
    );
    const missingMs = performance.now() - missingStarted;

    const wrongStarted = performance.now();
    const wrong = await loginAccount(
      { ...input, password: "senha errada", existingTokenHash: null },
      deps,
    );
    const wrongMs = performance.now() - wrongStarted;

    expect(missing).toEqual({ status: "invalid_credentials" });
    expect(wrong).toEqual(missing);
    expect(verified).toEqual(["hash:dummy", "hash:senha segura"]);
    expect(Math.abs(missingMs - wrongMs)).toBeLessThan(70);
  });

  it("does not log in an account that has not confirmed the email", async () => {
    const users = createMemoryUserStore();
    await seed(users, false);
    const result = await loginAccount(
      { ...input, existingTokenHash: null },
      {
        users,
        hasher: hasher([]),
        rateLimiter: createMemoryRateLimiter(),
        dummyHash: "hash:dummy",
        createToken: () => "new-session",
      },
    );

    expect(result).toEqual({ status: "invalid_credentials" });
    expect(await users.findSession(sha256("new-session"))).toBeNull();
  });

  it("blocks the sixth login for the same account within a minute", async () => {
    const users = createMemoryUserStore();
    const deps = {
      users,
      hasher: hasher([]),
      rateLimiter: createMemoryRateLimiter(),
      dummyHash: "hash:dummy",
      createToken: () => "new-session",
    };

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const result = await loginAccount(
        {
          ...input,
          email: "ausente@example.com",
          password: "errada",
          existingTokenHash: null,
        },
        deps,
      );
      expect(result.status).toBe("invalid_credentials");
    }

    const blocked = await loginAccount(
      {
        ...input,
        email: "ausente@example.com",
        password: "errada",
        existingTokenHash: null,
      },
      deps,
    );
    expect(blocked.status).toBe("rate_limited");
  });
});
