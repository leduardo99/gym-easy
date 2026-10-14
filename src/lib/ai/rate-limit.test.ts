import { describe, expect, it } from "vitest";

import { createMemoryRateLimiter } from "@/features/auth/rate-limit";

import {
  CHAT_MESSAGES_PER_DAY,
  PLAN_GENERATIONS_PER_DAY,
  consumeDailyBudget,
} from "./rate-limit";

describe("coach daily rate limits", () => {
  it("allows 20 chat messages per user per UTC day and blocks the next one", async () => {
    let now = Date.parse("2026-10-14T22:00:00.000Z");
    const limiter = createMemoryRateLimiter(() => now);
    const userId = "user-a";

    for (let i = 0; i < CHAT_MESSAGES_PER_DAY; i += 1) {
      const decision = await consumeDailyBudget(
        limiter,
        "chat",
        userId,
        new Date(now),
      );
      expect(decision.allowed).toBe(true);
    }

    const blocked = await consumeDailyBudget(
      limiter,
      "chat",
      userId,
      new Date(now),
    );
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);

    const other = await consumeDailyBudget(
      limiter,
      "chat",
      "user-b",
      new Date(now),
    );
    expect(other.allowed).toBe(true);

    now = Date.parse("2026-10-15T00:00:00.000Z");
    const nextDay = await consumeDailyBudget(
      limiter,
      "chat",
      userId,
      new Date(now),
    );
    expect(nextDay.allowed).toBe(true);
  });

  it("allows 5 plan generations per UTC day", async () => {
    const now = new Date("2026-10-14T12:00:00.000Z");
    const limiter = createMemoryRateLimiter(() => now.getTime());

    for (let i = 0; i < PLAN_GENERATIONS_PER_DAY; i += 1) {
      expect(
        (await consumeDailyBudget(limiter, "plan", "user-a", now)).allowed,
      ).toBe(true);
    }
    expect(
      (await consumeDailyBudget(limiter, "plan", "user-a", now)).allowed,
    ).toBe(false);
    expect(
      (await consumeDailyBudget(limiter, "chat", "user-a", now)).allowed,
    ).toBe(true);
  });

  it("stores the user id as a hash in the bucket", async () => {
    const seen: string[] = [];
    const now = new Date("2026-10-14T12:00:00.000Z");
    await consumeDailyBudget(
      {
        async hit(bucket) {
          seen.push(bucket);
          return { allowed: true, retryAfterSeconds: 0, hits: 1 };
        },
        async reset() {
          return undefined;
        },
      },
      "chat",
      "plain-user-id",
      now,
    );
    expect(seen[0]).not.toContain("plain-user-id");
    expect(seen[0]).toContain("2026-10-14");
  });
});
