import type { OpenRouterPrivacyMode } from "@/lib/env";

import type { AiOutcome, DataPolicy } from "./schemas";
import { unavailableOutcomeForProduct, type AiProduct } from "./unavailable";

export const FIRST_TOKEN_TIMEOUT_MS = 20_000;
export const CHAT_TOTAL_TIMEOUT_MS = 60_000;
export const CHAT_BACKOFF_CAP_MS = 10_000;
/** Up to two backoff retries after the first 429/5xx on the same model route. */
export const RATE_LIMIT_MAX_RETRIES = 2;
export const RATE_LIMIT_BACKOFF_MS = [800, 2_000] as const;
export const RETRY_AFTER_CAP_MS = 3_000;

const BACKOFF_MS = [1_000, 2_000, 4_000] as const;

export type ProviderFailureKind =
  | "rate_limited"
  | "timeout"
  | "provider_policy_unavailable"
  | "payment_required"
  | "provider_error"
  | "schema_invalid";

export type ProviderFailure = {
  kind: ProviderFailureKind;
  retryAfterMs: number | null;
};

export type ModelAttempt = {
  model: string;
  zdr: boolean;
  attempt: number;
  signal: AbortSignal;
  markFirstToken: () => void;
};

export type FallbackAttempt = {
  model: string;
  zdr: boolean;
  dataPolicy: DataPolicy;
  outcome: "ok" | ProviderFailureKind;
  attempt: number;
};

export type FallbackResult<T> =
  | {
      ok: true;
      value: T;
      model: string;
      dataPolicy: DataPolicy;
      servedWithZdr: boolean;
      attempts: FallbackAttempt[];
    }
  | {
      ok: false;
      outcome: AiOutcome;
      attempts: FallbackAttempt[];
    };

type ErrorLike = {
  name?: string;
  message?: string;
  statusCode?: number;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
};

export function openRouterProviderRouting(input: { zdr: boolean }): {
  zdr: boolean;
  data_collection: "deny";
  allow_fallbacks: boolean;
} {
  return {
    zdr: input.zdr,
    data_collection: "deny",
    allow_fallbacks: true,
  };
}

export function dataPolicyForZdr(zdr: boolean): DataPolicy {
  return zdr ? "zdr" : "any_free";
}

export function createAttemptController(timeouts: {
  firstTokenMs: number;
  totalMs: number;
}): {
  signal: AbortSignal;
  markFirstToken: () => void;
  dispose: () => void;
} {
  const controller = new AbortController();
  const timeout = () =>
    Object.assign(new Error("timeout"), { name: "TimeoutError" });
  const totalTimer = setTimeout(
    () => controller.abort(timeout()),
    timeouts.totalMs,
  );
  const firstTimer = setTimeout(() => {
    controller.abort(timeout());
  }, timeouts.firstTokenMs);

  return {
    signal: controller.signal,
    markFirstToken() {
      clearTimeout(firstTimer);
    },
    dispose() {
      clearTimeout(totalTimer);
      clearTimeout(firstTimer);
    },
  };
}

function asErrorLike(error: unknown): ErrorLike {
  if (!error || typeof error !== "object") {
    return { message: typeof error === "string" ? error : "" };
  }
  return error as ErrorLike;
}

function header(
  headers: Record<string, string> | undefined,
  name: string,
): string | undefined {
  if (!headers) return undefined;
  const match = Object.entries(headers).find(
    ([key]) => key.toLowerCase() === name,
  );
  return match?.[1];
}

function isDataPolicyUnavailable(like: ErrorLike): boolean {
  const message = `${like.message ?? ""} ${like.responseBody ?? ""}`;
  if (
    like.statusCode === 404 &&
    /data policy|zero data retention|zdr/i.test(message)
  ) {
    return true;
  }
  return /no endpoints found matching your data policy|zero data retention/i.test(
    message,
  );
}

export function classifyProviderFailure(error: unknown): ProviderFailure {
  const like = asErrorLike(error);
  const message = `${like.message ?? ""} ${like.responseBody ?? ""}`;
  const name = like.name ?? "";

  if (
    name === "TimeoutError" ||
    name === "AbortError" ||
    /timeout/i.test(message)
  ) {
    return { kind: "timeout", retryAfterMs: null };
  }
  if (like.statusCode === 402) {
    return { kind: "payment_required", retryAfterMs: null };
  }
  if (like.statusCode === 429) {
    return {
      kind: "rate_limited",
      retryAfterMs: retryAfterToMs(header(like.responseHeaders, "retry-after")),
    };
  }
  if (isDataPolicyUnavailable(like)) {
    return { kind: "provider_policy_unavailable", retryAfterMs: null };
  }
  if (like.statusCode === 404) {
    return { kind: "provider_error", retryAfterMs: null };
  }
  if (
    like.statusCode !== undefined &&
    like.statusCode >= 500 &&
    like.statusCode < 600
  ) {
    return { kind: "provider_error", retryAfterMs: null };
  }
  if (/schema/i.test(message)) {
    return { kind: "schema_invalid", retryAfterMs: null };
  }
  return { kind: "provider_error", retryAfterMs: null };
}

function isBackoffRetryable(
  failure: ProviderFailure,
  statusCode: number | undefined,
): boolean {
  if (failure.kind === "rate_limited") return true;
  return statusCode !== undefined && statusCode >= 500 && statusCode < 600;
}

export function rateLimitRetryDelayMs(
  retryIndex: number,
  retryAfterMs: number | null,
  jitter: () => number = Math.random,
): number {
  const base = RATE_LIMIT_BACKOFF_MS[retryIndex] ?? 2_000;
  const cappedHeader =
    retryAfterMs === null ? 0 : Math.min(retryAfterMs, RETRY_AFTER_CAP_MS);
  const ms = Math.max(base, cappedHeader);
  const factor = 0.85 + jitter() * 0.3;
  return Math.round(ms * factor);
}

export function attemptToLogOutcome(
  outcome: FallbackAttempt["outcome"],
): AiOutcome {
  if (outcome === "ok") return "ok";
  if (outcome === "provider_policy_unavailable") {
    return "provider_policy_unavailable";
  }
  if (outcome === "rate_limited") return "rate_limited";
  if (outcome === "timeout") return "timeout";
  if (outcome === "schema_invalid") return "schema_invalid";
  return "provider_error";
}

function retryAfterToMs(value: string | undefined): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0)
    return Math.round(seconds * 1000);
  const date = Date.parse(value);
  if (Number.isNaN(date)) return null;
  return Math.max(0, date - Date.now());
}

/** `null` quando a espera estouraria o teto de 10 s do chat. */
export function retryDelayMs(
  failedAttemptIndex: number,
  retryAfterMs: number | null,
  waitedMs: number,
  capMs = CHAT_BACKOFF_CAP_MS,
): number | null {
  const backoff = BACKOFF_MS[failedAttemptIndex] ?? 4_000;
  const requested = Math.max(backoff, retryAfterMs ?? 0);
  if (requested > capMs - waitedMs) return null;
  return requested;
}

export function finalFallbackOutcome(
  attempts: FallbackAttempt[],
  product: AiProduct,
): AiOutcome {
  const kinds = attempts.map((attempt) => attempt.outcome);
  if (kinds.length === 0) return "internal";
  if (kinds.every((kind) => kind === "timeout")) return "timeout";
  if (kinds.every((kind) => kind === "rate_limited")) return "rate_limited";
  if (kinds.some((kind) => kind === "schema_invalid")) return "schema_invalid";
  return unavailableOutcomeForProduct(product);
}

async function tryModelRoute<T>(input: {
  model: string;
  zdr: boolean;
  call: (attempt: ModelAttempt) => Promise<T>;
  sleep: (ms: number) => Promise<void>;
  maxRateLimitRetries: number;
  attempts: FallbackAttempt[];
  waitedMs: { value: number };
  deadlineMs: number;
  stopSignal?: AbortSignal;
  jitter?: () => number;
}): Promise<
  { ok: true; value: T } | { ok: false; failure: ProviderFailureKind }
> {
  const dataPolicy = dataPolicyForZdr(input.zdr);
  const jitter = input.jitter ?? Math.random;
  let attempt = 0;
  let backoffRetry = 0;

  while (true) {
    const remainingMs = input.deadlineMs - Date.now();
    if (remainingMs <= 0) {
      input.attempts.push({
        model: input.model,
        zdr: input.zdr,
        dataPolicy,
        outcome: "timeout",
        attempt,
      });
      return { ok: false, failure: "timeout" };
    }
    if (input.stopSignal?.aborted) {
      input.attempts.push({
        model: input.model,
        zdr: input.zdr,
        dataPolicy,
        outcome: "timeout",
        attempt,
      });
      return { ok: false, failure: "timeout" };
    }
    const controller = createAttemptController({
      firstTokenMs: Math.min(FIRST_TOKEN_TIMEOUT_MS, remainingMs),
      totalMs: Math.min(CHAT_TOTAL_TIMEOUT_MS, remainingMs),
    });
    try {
      const value = await input.call({
        model: input.model,
        zdr: input.zdr,
        attempt,
        signal: controller.signal,
        markFirstToken: controller.markFirstToken,
      });
      input.attempts.push({
        model: input.model,
        zdr: input.zdr,
        dataPolicy,
        outcome: "ok",
        attempt,
      });
      return { ok: true, value };
    } catch (error) {
      if (input.stopSignal?.aborted) {
        input.attempts.push({
          model: input.model,
          zdr: input.zdr,
          dataPolicy,
          outcome: "timeout",
          attempt,
        });
        return { ok: false, failure: "timeout" };
      }
      const like = asErrorLike(error);
      const failure = classifyProviderFailure(error);
      input.attempts.push({
        model: input.model,
        zdr: input.zdr,
        dataPolicy,
        outcome: failure.kind,
        attempt,
      });
      attempt += 1;
      if (failure.kind === "payment_required") {
        return { ok: false, failure: failure.kind };
      }
      if (
        !isBackoffRetryable(failure, like.statusCode) ||
        backoffRetry >= input.maxRateLimitRetries
      ) {
        return { ok: false, failure: failure.kind };
      }
      const requested = rateLimitRetryDelayMs(
        backoffRetry,
        failure.retryAfterMs,
        jitter,
      );
      const delay = Math.min(requested, input.deadlineMs - Date.now());
      if (delay <= 0) {
        return { ok: false, failure: failure.kind };
      }
      await input.sleep(delay);
      input.waitedMs.value += delay;
      backoffRetry += 1;
    } finally {
      controller.dispose();
    }
  }
}

export function linkAbortSignals(
  left: AbortSignal,
  right: AbortSignal | undefined,
): AbortSignal {
  if (!right) return left;
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (left.aborted || right.aborted) {
    controller.abort();
    return controller.signal;
  }
  left.addEventListener("abort", abort, { once: true });
  right.addEventListener("abort", abort, { once: true });
  return controller.signal;
}

export async function runModelFallback<T>(options: {
  models: string[];
  privacyMode: OpenRouterPrivacyMode;
  product: AiProduct;
  call: (attempt: ModelAttempt) => Promise<T>;
  sleep: (ms: number) => Promise<void>;
  maxRateLimitRetries?: number;
  stopSignal?: AbortSignal;
  jitter?: () => number;
}): Promise<FallbackResult<T>> {
  const attempts: FallbackAttempt[] = [];
  const waitedMs = { value: 0 };
  const maxRateLimitRetries =
    options.maxRateLimitRetries ?? RATE_LIMIT_MAX_RETRIES;
  const deadlineMs = Date.now() + CHAT_TOTAL_TIMEOUT_MS;

  if (options.models.length === 0) {
    return { ok: false, outcome: "internal", attempts };
  }

  for (const model of options.models) {
    const zdrTry = await tryModelRoute({
      model,
      zdr: true,
      call: options.call,
      sleep: options.sleep,
      maxRateLimitRetries,
      attempts,
      waitedMs,
      deadlineMs,
      stopSignal: options.stopSignal,
      jitter: options.jitter,
    });
    if (zdrTry.ok) {
      return {
        ok: true,
        value: zdrTry.value,
        model,
        dataPolicy: "zdr",
        servedWithZdr: true,
        attempts,
      };
    }
    if (zdrTry.failure === "payment_required") {
      return {
        ok: false,
        outcome: "provider_error",
        attempts,
      };
    }
    if (
      options.privacyMode === "zdr_then_fallback" &&
      zdrTry.failure === "provider_policy_unavailable"
    ) {
      const relaxed = await tryModelRoute({
        model,
        zdr: false,
        call: options.call,
        sleep: options.sleep,
        maxRateLimitRetries,
        attempts,
        waitedMs,
        deadlineMs,
        stopSignal: options.stopSignal,
        jitter: options.jitter,
      });
      if (relaxed.ok) {
        return {
          ok: true,
          value: relaxed.value,
          model,
          dataPolicy: "any_free",
          servedWithZdr: false,
          attempts,
        };
      }
      if (relaxed.failure === "payment_required") {
        return { ok: false, outcome: "provider_error", attempts };
      }
    }
  }

  return {
    ok: false,
    outcome: finalFallbackOutcome(attempts, options.product),
    attempts,
  };
}
