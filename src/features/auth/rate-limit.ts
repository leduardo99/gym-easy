import { sha256 } from "./tokens";

export const LOGIN_ACCOUNT_LIMIT = 5;
export const LOGIN_ACCOUNT_WINDOW_MS = 60_000;
export const LOGIN_IP_LIMIT = 20;
export const LOGIN_IP_WINDOW_MS = 60_000;
export const SIGNUP_IP_LIMIT = 10;
export const SIGNUP_IP_WINDOW_MS = 60 * 60_000;
export const RESEND_COOLDOWN_LIMIT = 1;
export const RESEND_COOLDOWN_WINDOW_MS = 60_000;
export const RESEND_HOUR_LIMIT = 5;
export const RESEND_HOUR_WINDOW_MS = 60 * 60_000;

export type RateLimitState = {
  hits: number;
  windowStartedAt: number;
};

export type RateLimitDecision = {
  state: RateLimitState;
  allowed: boolean;
  retryAfterSeconds: number;
};

export interface RateLimiter {
  hit(
    bucket: string,
    limit: number,
    windowMs: number,
  ): Promise<{ allowed: boolean; retryAfterSeconds: number }>;
}

export function applyRateLimit(
  current: RateLimitState | null,
  now: number,
  windowMs: number,
  limit: number,
): RateLimitDecision {
  if (!current || now - current.windowStartedAt >= windowMs) {
    return {
      state: { hits: 1, windowStartedAt: now },
      allowed: true,
      retryAfterSeconds: 0,
    };
  }

  const hits = current.hits + 1;
  const allowed = hits <= limit;
  const retryAfterSeconds = allowed
    ? 0
    : Math.max(1, Math.ceil((current.windowStartedAt + windowMs - now) / 1000));

  return {
    state: { hits, windowStartedAt: current.windowStartedAt },
    allowed,
    retryAfterSeconds,
  };
}

export function createMemoryRateLimiter(
  now: () => number = Date.now,
): RateLimiter {
  const states = new Map<string, RateLimitState>();
  return {
    async hit(bucket, limit, windowMs) {
      const decision = applyRateLimit(
        states.get(bucket) ?? null,
        now(),
        windowMs,
        limit,
      );
      states.set(bucket, decision.state);
      return {
        allowed: decision.allowed,
        retryAfterSeconds: decision.retryAfterSeconds,
      };
    },
  };
}

export function loginAccountBucket(email: string): string {
  return `login:account:${sha256(email)}`;
}

export function loginIpBucket(ip: string): string {
  return `login:ip:${sha256(ip)}`;
}

export function signupIpBucket(ip: string): string {
  return `signup:ip:${sha256(ip)}`;
}

export function resendCooldownBucket(email: string): string {
  return `confirm-resend:${sha256(email)}`;
}

export function resendHourBucket(email: string): string {
  return `confirm-resend-hour:${sha256(email)}`;
}

export function stricterRetry(
  left: { allowed: boolean; retryAfterSeconds: number },
  right: { allowed: boolean; retryAfterSeconds: number },
): { allowed: boolean; retryAfterSeconds: number } {
  return {
    allowed: left.allowed && right.allowed,
    retryAfterSeconds: Math.max(
      left.retryAfterSeconds,
      right.retryAfterSeconds,
    ),
  };
}
