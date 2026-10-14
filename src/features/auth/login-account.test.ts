import { describe, expect, it, vi } from "vitest";

import { createMemoryUserStore } from "./memory-user-store";
import { loginAccount, loginFailureDelayMs } from "./login-account";
import type { PasswordHasher } from "./password";
import { LOGIN_IP_LIMIT, createMemoryRateLimiter } from "./rate-limit";
import { getClientIp } from "./session-cookie";
import { sha256 } from "./tokens";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const instant = async () => {};

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
      delay: instant,
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

  it("limits only the account when the request has no client ip", async () => {
    const users = createMemoryUserStore();
    const deps = {
      users,
      hasher: hasher([]),
      rateLimiter: createMemoryRateLimiter(),
      dummyHash: "hash:dummy",
      createToken: () => "new-session",
      delay: instant,
    };

    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(
        (
          await loginAccount(
            {
              ...input,
              ip: null,
              email: "ausente@example.com",
              password: "errada",
              existingTokenHash: null,
            },
            deps,
          )
        ).status,
      ).toBe("invalid_credentials");
    }

    const sameAccount = await loginAccount(
      {
        ...input,
        ip: null,
        email: "ausente@example.com",
        password: "errada",
        existingTokenHash: null,
      },
      deps,
    );
    const otherAccount = await loginAccount(
      {
        ...input,
        ip: null,
        email: "outra@example.com",
        password: "errada",
        existingTokenHash: null,
      },
      deps,
    );

    expect(sameAccount.status).toBe("rate_limited");
    expect(otherAccount.status).toBe("invalid_credentials");
  });

  it("spaces failed logins by 0, 500, 1000, 2000 and 4000 ms per account", async () => {
    expect([1, 2, 3, 4, 5, 9].map(loginFailureDelayMs)).toEqual([
      0, 500, 1_000, 2_000, 4_000, 4_000,
    ]);

    const users = createMemoryUserStore();
    const waits: number[] = [];
    const deps = {
      users,
      hasher: hasher([]),
      rateLimiter: createMemoryRateLimiter(),
      dummyHash: "hash:dummy",
      createToken: () => "new-session",
      delay: async (ms: number) => {
        waits.push(ms);
      },
    };
    const attempt = {
      ...input,
      email: "ausente@example.com",
      password: "errada",
      existingTokenHash: null,
    };

    for (let failure = 0; failure < 5; failure += 1) {
      expect((await loginAccount(attempt, deps)).status).toBe(
        "invalid_credentials",
      );
    }
    expect((await loginAccount(attempt, deps)).status).toBe("rate_limited");
    expect(waits).toEqual([500, 1_000, 2_000, 4_000]);

    const other: number[] = [];
    expect(
      (
        await loginAccount(
          { ...attempt, email: "outra@example.com" },
          {
            ...deps,
            delay: async (ms: number) => {
              other.push(ms);
            },
          },
        )
      ).status,
    ).toBe("invalid_credentials");
    expect(other).toEqual([]);
  });

  it("lets the event loop run during a failed-login delay", async () => {
    vi.useFakeTimers();
    const users = createMemoryUserStore();
    await seed(users, true);
    const deps = {
      users,
      hasher: {
        async hash(password: string) {
          return `hash:${password}`;
        },
        async verify() {
          return false;
        },
      },
      rateLimiter: createMemoryRateLimiter(),
      dummyHash: "hash:dummy",
      createToken: () => "new-session",
    };
    const attempt = {
      ...input,
      password: "errada",
      existingTokenHash: null,
    };

    await loginAccount(attempt, deps);
    const second = loginAccount(attempt, deps);
    let interleaved = false;
    void Promise.resolve().then(() => {
      interleaved = true;
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(interleaved).toBe(true);
    await vi.advanceTimersByTimeAsync(500);
    expect(await second).toMatchObject({ status: "invalid_credentials" });
    vi.useRealTimers();
  });

  it("clears the account delay after a successful login", async () => {
    const users = createMemoryUserStore();
    await seed(users, true);
    const waits: number[] = [];
    const deps = {
      users,
      hasher: hasher([]),
      rateLimiter: createMemoryRateLimiter(),
      dummyHash: "hash:dummy",
      createToken: () => "new-session",
      delay: async (ms: number) => {
        waits.push(ms);
      },
    };
    const wrong = { ...input, password: "errada", existingTokenHash: null };

    expect((await loginAccount(wrong, deps)).status).toBe(
      "invalid_credentials",
    );
    expect((await loginAccount(wrong, deps)).status).toBe(
      "invalid_credentials",
    );
    expect(
      (await loginAccount({ ...input, existingTokenHash: null }, deps)).status,
    ).toBe("authenticated");
    expect((await loginAccount(wrong, deps)).status).toBe(
      "invalid_credentials",
    );
    expect(waits).toEqual([500]);
  });

  it("keeps growing the delay when every attempt is wrong", async () => {
    const users = createMemoryUserStore();
    await seed(users, true);
    const waits: number[] = [];
    const deps = {
      users,
      hasher: hasher([]),
      rateLimiter: createMemoryRateLimiter(),
      dummyHash: "hash:dummy",
      createToken: () => "new-session",
      delay: async (ms: number) => {
        waits.push(ms);
      },
    };
    const wrong = { ...input, password: "errada", existingTokenHash: null };

    for (let attempt = 0; attempt < 4; attempt += 1) {
      expect((await loginAccount(wrong, deps)).status).toBe(
        "invalid_credentials",
      );
    }
    expect(waits).toEqual([500, 1_000, 2_000]);
  });

  it("does not clear the account delay without the right password", async () => {
    const users = createMemoryUserStore();
    await seed(users, false);
    const waits: number[] = [];
    const deps = {
      users,
      hasher: hasher([]),
      rateLimiter: createMemoryRateLimiter(),
      dummyHash: "hash:dummy",
      createToken: () => "new-session",
      delay: async (ms: number) => {
        waits.push(ms);
      },
    };
    const wrong = { ...input, password: "errada", existingTokenHash: null };
    const unconfirmed = { ...input, existingTokenHash: null };

    expect((await loginAccount(wrong, deps)).status).toBe(
      "invalid_credentials",
    );
    expect((await loginAccount(unconfirmed, deps)).status).toBe(
      "invalid_credentials",
    );
    expect((await loginAccount(wrong, deps)).status).toBe(
      "invalid_credentials",
    );
    expect(waits).toEqual([500, 1_000]);
    expect(await users.findSession(sha256("new-session"))).toBeNull();
  });

  it("leaves the ip limit in place after a successful login", async () => {
    const users = createMemoryUserStore();
    await seed(users, true);
    const limiter = createMemoryRateLimiter();
    const deps = {
      users,
      hasher: hasher([]),
      rateLimiter: limiter,
      dummyHash: "hash:dummy",
      createToken: () => "new-session",
      delay: instant,
    };
    const ip = "203.0.113.44";

    for (let attempt = 0; attempt < LOGIN_IP_LIMIT - 1; attempt += 1) {
      expect(
        (
          await loginAccount(
            {
              ...input,
              ip,
              email: `ausente-${attempt}@example.com`,
              password: "errada",
              existingTokenHash: null,
            },
            deps,
          )
        ).status,
      ).toBe("invalid_credentials");
    }

    expect(
      (await loginAccount({ ...input, ip, existingTokenHash: null }, deps))
        .status,
    ).toBe("authenticated");

    const blocked = await loginAccount(
      {
        ...input,
        ip,
        email: "mais-uma@example.com",
        password: "errada",
        existingTokenHash: null,
      },
      deps,
    );
    const otherIp = await loginAccount(
      {
        ...input,
        ip: "203.0.113.45",
        password: "errada",
        existingTokenHash: null,
      },
      deps,
    );

    expect(blocked.status).toBe("rate_limited");
    expect(otherIp.status).toBe("invalid_credentials");
  });

  it("does not share a login block across two socket addresses", async () => {
    const users = createMemoryUserStore();
    await seed(users, true);
    const limiter = createMemoryRateLimiter();
    const deps = {
      users,
      hasher: hasher([]),
      rateLimiter: limiter,
      dummyHash: "hash:dummy",
      createToken: () => "new-session",
      delay: instant,
    };
    const forged = "203.0.113.5, 198.51.100.20";
    const first = getClientIp({
      forwardedFor: forged,
      socketAddress: "198.51.100.10",
      trustProxy: false,
    });
    const second = getClientIp({
      forwardedFor: forged,
      socketAddress: "198.51.100.11",
      trustProxy: false,
    });
    expect(first).toBe("198.51.100.10");
    expect(second).toBe("198.51.100.11");
    expect(getClientIp({ forwardedFor: forged, trustProxy: false })).toBeNull();

    const attempt = (ip: string | null, email: string) =>
      loginAccount(
        {
          ...input,
          ip,
          email,
          password: "errada",
          existingTokenHash: null,
        },
        deps,
      );

    for (let index = 0; index < LOGIN_IP_LIMIT; index += 1) {
      expect((await attempt(first, `a-${index}@example.com`)).status).toBe(
        "invalid_credentials",
      );
    }
    expect((await attempt(first, "blocked@example.com")).status).toBe(
      "rate_limited",
    );
    expect((await attempt(second, "other@example.com")).status).toBe(
      "invalid_credentials",
    );
    expect((await attempt(null, "missing-socket@example.com")).status).toBe(
      "invalid_credentials",
    );
  });
});
