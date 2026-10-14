import { describe, expect, it, vi } from "vitest";

import {
  CHAT_TOTAL_TIMEOUT_MS,
  FIRST_TOKEN_TIMEOUT_MS,
  classifyProviderFailure,
  createAttemptController,
  openRouterProviderRouting,
  retryDelayMs,
  runModelFallback,
} from "./fallback";

const models = ["alpha/example:free", "beta/example:free"];

describe("provider fallback", () => {
  it("keeps the zero-retention route when the first free model succeeds", async () => {
    const call = vi.fn(async ({ model, policy }) => ({ model, policy }));

    const result = await runModelFallback({
      models,
      call,
      sleep: async () => undefined,
    });

    expect(result).toMatchObject({
      ok: true,
      model: "alpha/example:free",
      policy: "zdr",
    });
    expect(call).toHaveBeenCalledTimes(1);
    expect(call.mock.calls[0]?.[0]).toMatchObject({ policy: "zdr" });
  });

  it("honors retry-after, stops after 3 attempts, then uses the next model", async () => {
    const sleeps: number[] = [];
    let alpha = 0;
    const call = vi.fn(async ({ model }) => {
      if (model.startsWith("alpha")) {
        alpha += 1;
        throw Object.assign(new Error("slow"), {
          statusCode: 429,
          responseHeaders: { "retry-after": "2" },
        });
      }
      return { text: "ok" };
    });

    const result = await runModelFallback({
      models,
      call,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    });

    expect(alpha).toBe(3);
    expect(sleeps).toEqual([2000, 2000]);
    expect(result).toMatchObject({
      ok: true,
      model: "beta/example:free",
      policy: "zdr",
    });
  });

  it("falls back to any free model only when no zero-retention endpoint exists", async () => {
    const call = vi.fn(async ({ policy }) => {
      if (policy === "zdr") {
        throw Object.assign(new Error("No endpoints found"), {
          statusCode: 404,
        });
      }
      return { text: "livre" };
    });

    const result = await runModelFallback({
      models,
      call,
      sleep: async () => undefined,
    });

    expect(result).toMatchObject({
      ok: true,
      model: "alpha/example:free",
      policy: "any_free",
    });
    expect(call.mock.calls.map((entry) => entry[0]?.policy)).toEqual([
      "zdr",
      "zdr",
      "any_free",
    ]);
  });

  it("does not downgrade to any free model when a zero-retention endpoint is rate limited", async () => {
    const call = vi.fn(async (attempt: { policy: string }) => {
      if (attempt.policy.length === 0) throw new Error("missing policy");
      throw Object.assign(new Error("quota"), { statusCode: 429 });
    });

    const result = await runModelFallback({
      models,
      call,
      sleep: async () => undefined,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.outcome).toBe("rate_limited");
    expect(call.mock.calls.every((entry) => entry[0]?.policy === "zdr")).toBe(
      true,
    );
  });

  it("returns a failed outcome when every model fails", async () => {
    const result = await runModelFallback({
      models,
      call: async () => {
        throw new Error("upstream");
      },
      sleep: async () => undefined,
    });

    expect(result).toMatchObject({ ok: false, outcome: "provider_error" });
  });

  it("stops on HTTP 402 without retrying", async () => {
    const call = vi.fn(async () => {
      throw Object.assign(new Error("payment"), { statusCode: 402 });
    });

    const result = await runModelFallback({
      models,
      call,
      sleep: async () => undefined,
    });

    expect(call).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ ok: false, outcome: "provider_error" });
  });

  it("classifies provider failures and caps the chat backoff at 10 seconds", () => {
    expect(
      classifyProviderFailure({
        statusCode: 429,
        responseHeaders: { "Retry-After": "3" },
      }),
    ).toEqual({ kind: "rate_limited", retryAfterMs: 3000 });
    expect(
      classifyProviderFailure({
        statusCode: 404,
        message: "No endpoints found that match your constraints",
      }),
    ).toEqual({ kind: "no_zdr_endpoint", retryAfterMs: null });
    expect(
      classifyProviderFailure(
        Object.assign(new Error("aborted"), { name: "TimeoutError" }),
      ),
    ).toEqual({ kind: "timeout", retryAfterMs: null });
    expect(retryDelayMs(0, 500, 0)).toBe(1000);
    expect(retryDelayMs(1, 2000, 9_500)).toBeNull();
    expect(FIRST_TOKEN_TIMEOUT_MS).toBe(20_000);
    expect(CHAT_TOTAL_TIMEOUT_MS).toBe(60_000);
  });

  it("aborts when the first token does not arrive within 20 seconds", () => {
    vi.useFakeTimers();
    try {
      const attempt = createAttemptController({
        firstTokenMs: FIRST_TOKEN_TIMEOUT_MS,
        totalMs: CHAT_TOTAL_TIMEOUT_MS,
      });
      vi.advanceTimersByTime(FIRST_TOKEN_TIMEOUT_MS);
      expect(attempt.signal.aborted).toBe(true);
      attempt.dispose();
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps the attempt alive after the first token until the total timeout", () => {
    vi.useFakeTimers();
    try {
      const attempt = createAttemptController({
        firstTokenMs: FIRST_TOKEN_TIMEOUT_MS,
        totalMs: CHAT_TOTAL_TIMEOUT_MS,
      });
      attempt.markFirstToken();
      vi.advanceTimersByTime(FIRST_TOKEN_TIMEOUT_MS);
      expect(attempt.signal.aborted).toBe(false);
      vi.advanceTimersByTime(CHAT_TOTAL_TIMEOUT_MS - FIRST_TOKEN_TIMEOUT_MS);
      expect(attempt.signal.aborted).toBe(true);
      attempt.dispose();
    } finally {
      vi.useRealTimers();
    }
  });

  it("asks OpenRouter for zero retention and no training before any free endpoint", () => {
    expect(openRouterProviderRouting("zdr")).toEqual({
      zdr: true,
      data_collection: "deny",
      allow_fallbacks: true,
    });
    expect(openRouterProviderRouting("any_free")).toEqual({
      allow_fallbacks: true,
    });
  });
});
