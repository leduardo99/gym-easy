import { describe, expect, it } from "vitest";

import {
  LOGIN_ACCOUNT_LIMIT,
  applyRateLimit,
  createMemoryRateLimiter,
} from "./rate-limit";

describe("applyRateLimit", () => {
  it("allows five hits per minute and resets the window", () => {
    let state = null;
    const start = 1_000_000;
    for (let hit = 1; hit <= LOGIN_ACCOUNT_LIMIT; hit += 1) {
      const decision = applyRateLimit(
        state,
        start + hit,
        60_000,
        LOGIN_ACCOUNT_LIMIT,
      );
      expect(decision.allowed).toBe(true);
      state = decision.state;
    }

    const blocked = applyRateLimit(
      state,
      start + 10,
      60_000,
      LOGIN_ACCOUNT_LIMIT,
    );
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);

    const reset = applyRateLimit(
      blocked.state,
      blocked.state.windowStartedAt + 60_000,
      60_000,
      LOGIN_ACCOUNT_LIMIT,
    );
    expect(reset.allowed).toBe(true);
    expect(reset.state.hits).toBe(1);
  });
});

describe("createMemoryRateLimiter", () => {
  it("persists hits across calls in the same process", async () => {
    let now = 0;
    const limiter = createMemoryRateLimiter(() => now);
    for (let hit = 0; hit < 20; hit += 1) {
      const decision = await limiter.hit("login:ip:test", 20, 60_000);
      expect(decision.allowed).toBe(true);
    }
    now = 1_000;
    const blocked = await limiter.hit("login:ip:test", 20, 60_000);
    expect(blocked.allowed).toBe(false);
  });
});
