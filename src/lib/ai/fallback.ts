import type { DataPolicy } from "./schemas";

export const FIRST_TOKEN_TIMEOUT_MS = 20_000;
export const CHAT_TOTAL_TIMEOUT_MS = 60_000;
export const CHAT_BACKOFF_CAP_MS = 10_000;
export const MAX_ATTEMPTS_PER_MODEL = 3;

const BACKOFF_MS = [1_000, 2_000, 4_000] as const;

export type ProviderFailureKind =
  | "rate_limited"
  | "timeout"
  | "no_zdr_endpoint"
  | "payment_required"
  | "provider_error"
  | "schema_invalid";

export type ProviderFailure = {
  kind: ProviderFailureKind;
  retryAfterMs: number | null;
};

export type ModelAttempt = {
  model: string;
  policy: DataPolicy;
  attempt: number;
  signal: AbortSignal;
  markFirstToken: () => void;
};

export type FallbackAttempt = {
  model: string;
  policy: DataPolicy;
  outcome: "ok" | ProviderFailureKind;
  attempt: number;
};

export type FallbackResult<T> =
  | {
      ok: true;
      value: T;
      model: string;
      policy: DataPolicy;
      attempts: FallbackAttempt[];
    }
  | {
      ok: false;
      outcome:
        | "timeout"
        | "provider_error"
        | "schema_invalid"
        | "rate_limited"
        | "internal";
      attempts: FallbackAttempt[];
    };

type ErrorLike = {
  name?: string;
  message?: string;
  statusCode?: number;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
};

export function openRouterProviderRouting(policy: DataPolicy): {
  zdr?: boolean;
  data_collection?: "deny";
  allow_fallbacks: boolean;
} {
  if (policy === "zdr") {
    return { zdr: true, data_collection: "deny", allow_fallbacks: true };
  }
  return { allow_fallbacks: true };
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
  if (
    like.statusCode === 404 ||
    /no endpoints|data policy|zero data retention|zdr/i.test(message)
  ) {
    return { kind: "no_zdr_endpoint", retryAfterMs: null };
  }
  if (/schema/i.test(message)) {
    return { kind: "schema_invalid", retryAfterMs: null };
  }
  return { kind: "provider_error", retryAfterMs: null };
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

function finalOutcome(
  attempts: FallbackAttempt[],
):
  | "timeout"
  | "provider_error"
  | "schema_invalid"
  | "rate_limited"
  | "internal" {
  const kinds = attempts.map((attempt) => attempt.outcome);
  if (kinds.length === 0) return "internal";
  if (kinds.every((kind) => kind === "timeout")) return "timeout";
  if (kinds.every((kind) => kind === "rate_limited")) return "rate_limited";
  if (kinds.some((kind) => kind === "schema_invalid")) return "schema_invalid";
  return "provider_error";
}

async function runPhase<T>(input: {
  models: string[];
  policy: DataPolicy;
  call: (attempt: ModelAttempt) => Promise<T>;
  sleep: (ms: number) => Promise<void>;
  maxAttempts: number;
  attempts: FallbackAttempt[];
  waitedMs: { value: number };
}): Promise<
  | { ok: true; value: T; model: string }
  | { ok: false; sawLiveEndpoint: boolean }
> {
  let sawLiveEndpoint = false;

  for (const model of input.models) {
    for (let attempt = 0; attempt < input.maxAttempts; attempt += 1) {
      const controller = createAttemptController({
        firstTokenMs: FIRST_TOKEN_TIMEOUT_MS,
        totalMs: CHAT_TOTAL_TIMEOUT_MS,
      });
      try {
        const value = await input.call({
          model,
          policy: input.policy,
          attempt,
          signal: controller.signal,
          markFirstToken: controller.markFirstToken,
        });
        input.attempts.push({
          model,
          policy: input.policy,
          outcome: "ok",
          attempt,
        });
        return { ok: true, value, model };
      } catch (error) {
        const failure = classifyProviderFailure(error);
        input.attempts.push({
          model,
          policy: input.policy,
          outcome: failure.kind,
          attempt,
        });
        if (failure.kind !== "no_zdr_endpoint") sawLiveEndpoint = true;
        if (failure.kind === "payment_required") {
          return { ok: false, sawLiveEndpoint: true };
        }
        if (failure.kind !== "rate_limited") break;
        if (attempt >= input.maxAttempts - 1) break;
        const delay = retryDelayMs(
          attempt,
          failure.retryAfterMs,
          input.waitedMs.value,
        );
        if (delay === null) break;
        await input.sleep(delay);
        input.waitedMs.value += delay;
      } finally {
        controller.dispose();
      }
    }
  }

  return { ok: false, sawLiveEndpoint };
}

/**
 * Prefere endpoint sem retenção e sem treino. Só desce para qualquer modelo
 * `:free` quando nenhum endpoint ZDR existe. Exceção de uso pessoal.
 */
export async function runModelFallback<T>(options: {
  models: string[];
  call: (attempt: ModelAttempt) => Promise<T>;
  sleep: (ms: number) => Promise<void>;
  maxAttempts?: number;
}): Promise<FallbackResult<T>> {
  const attempts: FallbackAttempt[] = [];
  const waitedMs = { value: 0 };
  const maxAttempts = options.maxAttempts ?? MAX_ATTEMPTS_PER_MODEL;

  if (options.models.length === 0) {
    return { ok: false, outcome: "internal", attempts };
  }

  const preferred = await runPhase({
    models: options.models,
    policy: "zdr",
    call: options.call,
    sleep: options.sleep,
    maxAttempts,
    attempts,
    waitedMs,
  });
  if (preferred.ok) {
    return {
      ok: true,
      value: preferred.value,
      model: preferred.model,
      policy: "zdr",
      attempts,
    };
  }

  const stoppedForPayment = attempts.some(
    (attempt) => attempt.outcome === "payment_required",
  );
  if (!stoppedForPayment && !preferred.sawLiveEndpoint) {
    const open = await runPhase({
      models: options.models,
      policy: "any_free",
      call: options.call,
      sleep: options.sleep,
      maxAttempts,
      attempts,
      waitedMs,
    });
    if (open.ok) {
      return {
        ok: true,
        value: open.value,
        model: open.model,
        policy: "any_free",
        attempts,
      };
    }
  }

  return { ok: false, outcome: finalOutcome(attempts), attempts };
}
