import type { RateLimiter } from "@/features/auth/rate-limit";
import { sha256 } from "@/features/auth/tokens";

export const CHAT_MESSAGES_PER_DAY = 20;
export const PLAN_GENERATIONS_PER_DAY = 5;
export const OPENROUTER_REQUESTS_PER_DAY = 50;

/** Janela maior que um dia UTC: a data no bucket é que zera à meia-noite. */
export const AI_RATE_WINDOW_MS = 48 * 60 * 60 * 1000;

export type AiBudgetKind = "chat" | "plan";

export function aiUsageBucket(
  kind: AiBudgetKind,
  userId: string,
  now: Date,
): string {
  const day = now.toISOString().slice(0, 10);
  return `ai:${kind}:${sha256(userId)}:${day}`;
}

export function globalOpenRouterBucket(now: Date): string {
  return `ai:openrouter:${now.toISOString().slice(0, 10)}`;
}

export async function consumeGlobalOpenRouterBudget(
  limiter: RateLimiter,
  now: Date,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const decision = await limiter.hit(
    globalOpenRouterBucket(now),
    OPENROUTER_REQUESTS_PER_DAY,
    AI_RATE_WINDOW_MS,
  );
  return {
    allowed: decision.allowed,
    retryAfterSeconds: decision.retryAfterSeconds,
  };
}

export async function consumeDailyBudget(
  limiter: RateLimiter,
  kind: AiBudgetKind,
  userId: string,
  now: Date,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const limit =
    kind === "chat" ? CHAT_MESSAGES_PER_DAY : PLAN_GENERATIONS_PER_DAY;
  const decision = await limiter.hit(
    aiUsageBucket(kind, userId, now),
    limit,
    AI_RATE_WINDOW_MS,
  );
  return {
    allowed: decision.allowed,
    retryAfterSeconds: decision.retryAfterSeconds,
  };
}
