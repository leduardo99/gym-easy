import type { OpenRouterPrivacyMode } from "@/lib/env";

import type { AiOutcome, DataPolicy } from "./schemas";
import { unavailableOutcomeForProduct, type AiProduct } from "./unavailable";

export const FIRST_TOKEN_TIMEOUT_MS = 20_000;
export const CHAT_TOTAL_TIMEOUT_MS = 60_000;
export const CHAT_BACKOFF_CAP_MS = 10_000;
export const MAX_ATTEMPTS_PER_MODEL = 3;

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
  if (/schema/i.test(message)) {
    return { kind: "schema_invalid", retryAfterMs: null };
  }
  return { kind: "provider_error", retryAfterMs: null };
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
  maxAttempts: number;
  attempts: FallbackAttempt[];
  waitedMs: { value: number };
  stopSignal?: AbortSignal;
}): Promise<
  { ok: true; value: T } | { ok: false; failure: ProviderFailureKind }
> {
  const dataPolicy = dataPolicyForZdr(input.zdr);
  for (let attempt = 0; attempt < input.maxAttempts; attempt += 1) {
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
      firstTokenMs: FIRST_TOKEN_TIMEOUT_MS,
      totalMs: CHAT_TOTAL_TIMEOUT_MS,
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
      const failure = classifyProviderFailure(error);
      input.attempts.push({
        model: input.model,
        zdr: input.zdr,
        dataPolicy,
        outcome: failure.kind,
        attempt,
      });
      if (failure.kind === "payment_required") {
        return { ok: false, failure: failure.kind };
      }
      if (failure.kind !== "rate_limited") {
        return { ok: false, failure: failure.kind };
      }
      if (attempt >= input.maxAttempts - 1) {
        return { ok: false, failure: failure.kind };
      }
      const delay = retryDelayMs(
        attempt,
        failure.retryAfterMs,
        input.waitedMs.value,
      );
      if (delay === null) return { ok: false, failure: failure.kind };
      await input.sleep(delay);
      input.waitedMs.value += delay;
    } finally {
      controller.dispose();
    }
  }
  return { ok: false, failure: "provider_error" };
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
  maxAttempts?: number;
  stopSignal?: AbortSignal;
}): Promise<FallbackResult<T>> {
  const attempts: FallbackAttempt[] = [];
  const waitedMs = { value: 0 };
  const maxAttempts = options.maxAttempts ?? MAX_ATTEMPTS_PER_MODEL;

  if (options.models.length === 0) {
    return { ok: false, outcome: "internal", attempts };
  }

  for (const model of options.models) {
    const zdrTry = await tryModelRoute({
      model,
      zdr: true,
      call: options.call,
      sleep: options.sleep,
      maxAttempts,
      attempts,
      waitedMs,
      stopSignal: options.stopSignal,
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
        maxAttempts,
        attempts,
        waitedMs,
        stopSignal: options.stopSignal,
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
