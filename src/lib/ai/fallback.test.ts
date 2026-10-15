import { describe, expect, it, vi } from "vitest";

import {
  CHAT_TOTAL_TIMEOUT_MS,
  FIRST_TOKEN_TIMEOUT_MS,
  RETRY_AFTER_CAP_MS,
  classifyProviderFailure,
  createAttemptController,
  openRouterProviderRouting,
  isBackoffRetryable,
  rateLimitRetryDelayMs,
  runModelFallback,
} from "./fallback";

const steadyJitter = () => 0.5;
const minJitter = () => 0;

const models = ["alpha/example:free", "beta/example:free"];
const noPin: string[] = [];
const paidModels = ["google/gemma-4-31b-it", "openai/gpt-oss-120b"];
const deepinfra = ["deepinfra"];

function policy404() {
  return Object.assign(
    new Error("No endpoints found matching your data policy"),
    {
      statusCode: 404,
    },
  );
}

describe("provider fallback", () => {
  it("keeps ZDR when the first free model succeeds in zdr_only mode", async () => {
    const call = vi.fn(async ({ model, zdr }) => ({ model, zdr }));

    const result = await runModelFallback({
      models,
      privacyMode: "zdr_only",
      pinnedProviders: noPin,
      product: "coach",
      call,
      sleep: async () => undefined,
    });

    expect(result).toMatchObject({
      ok: true,
      model: "alpha/example:free",
      servedWithZdr: true,
    });
    expect(call).toHaveBeenCalledTimes(1);
    expect(call.mock.calls[0]?.[0]).toMatchObject({ zdr: true });
  });

  it("retries the same model without ZDR only after a data-policy failure", async () => {
    const call = vi.fn(async ({ zdr }) => {
      if (zdr) throw policy404();
      return { text: "ok" };
    });

    const result = await runModelFallback({
      models,
      privacyMode: "zdr_then_fallback",
      pinnedProviders: noPin,
      product: "coach",
      call,
      sleep: async () => undefined,
    });

    expect(result).toMatchObject({
      ok: true,
      model: "alpha/example:free",
      servedWithZdr: false,
      dataPolicy: "any_free",
    });
    expect(call.mock.calls.map((entry) => entry[0]?.zdr)).toEqual([
      true,
      false,
    ]);
  });

  it("never sends zdr:false in zdr_only mode", async () => {
    const call = vi.fn(async ({ zdr }) => {
      if (zdr) throw policy404();
      return { text: "unexpected" };
    });

    await runModelFallback({
      models: ["only/example:free"],
      privacyMode: "zdr_only",
      pinnedProviders: noPin,
      product: "coach",
      call,
      sleep: async () => undefined,
    });

    expect(call.mock.calls.every((entry) => entry[0]?.zdr === true)).toBe(true);
  });

  it("moves to the next model after ZDR and deny fallback both fail", async () => {
    const call = vi.fn(async ({ model, zdr }) => {
      if (model.startsWith("alpha")) throw policy404();
      if (zdr) throw policy404();
      return { text: "beta" };
    });

    const result = await runModelFallback({
      models,
      privacyMode: "zdr_then_fallback",
      pinnedProviders: noPin,
      product: "coach",
      call,
      sleep: async () => undefined,
    });

    expect(result).toMatchObject({ ok: true, model: "beta/example:free" });
    expect(call.mock.calls.map((entry) => entry[0]?.model)).toEqual([
      "alpha/example:free",
      "alpha/example:free",
      "beta/example:free",
      "beta/example:free",
    ]);
  });

  it("continues to the next model on HTTP 403 without a deny fallback", async () => {
    const call = vi.fn(async ({ model, zdr }) => {
      if (model.startsWith("alpha")) {
        throw Object.assign(new Error("agentic harness only"), {
          statusCode: 403,
        });
      }
      if (!zdr) throw new Error("unexpected relaxed route");
      return { text: "ok" };
    });

    const result = await runModelFallback({
      models,
      privacyMode: "zdr_then_fallback",
      pinnedProviders: noPin,
      product: "coach",
      call,
      sleep: async () => undefined,
    });

    expect(result).toMatchObject({ ok: true, model: "beta/example:free" });
    expect(call).toHaveBeenCalledTimes(2);
    expect(call.mock.calls.map((entry) => entry[0]?.zdr)).toEqual([true, true]);
  });

  it("honors retry-after capped at 3s, stops after 3 attempts, then uses the next model", async () => {
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
      privacyMode: "zdr_only",
      pinnedProviders: noPin,
      product: "coach",
      call,
      jitter: steadyJitter,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    });

    expect(alpha).toBe(3);
    expect(sleeps).toEqual([2000, 2000]);
    expect(result).toMatchObject({
      ok: true,
      model: "beta/example:free",
      servedWithZdr: true,
    });
  });

  it("succeeds on the same model after a transient 503", async () => {
    const sleeps: number[] = [];
    let calls = 0;
    const call = vi.fn(async ({ model, zdr }) => {
      calls += 1;
      if (calls === 1) {
        throw Object.assign(new Error("service unavailable"), {
          statusCode: 503,
        });
      }
      return { model, zdr };
    });
    const expectedDelay = rateLimitRetryDelayMs(0, null, minJitter);

    const result = await runModelFallback({
      models: ["alpha/example:free"],
      privacyMode: "zdr_only",
      pinnedProviders: noPin,
      product: "coach",
      call,
      jitter: minJitter,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    });

    expect(result).toMatchObject({
      ok: true,
      model: "alpha/example:free",
      servedWithZdr: true,
    });
    expect(call).toHaveBeenCalledTimes(2);
    expect(sleeps).toEqual([expectedDelay]);
    expect(call.mock.calls.every((entry) => entry[0]?.zdr === true)).toBe(true);
  });

  it("retries 500 up to two times on the same model then moves on", async () => {
    const sleeps: number[] = [];
    let alpha = 0;
    const call = vi.fn(async ({ model }) => {
      if (model.startsWith("alpha")) {
        alpha += 1;
        throw Object.assign(new Error("internal"), { statusCode: 500 });
      }
      return { text: "ok" };
    });

    const result = await runModelFallback({
      models,
      privacyMode: "zdr_only",
      pinnedProviders: noPin,
      product: "coach",
      call,
      jitter: minJitter,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    });

    expect(alpha).toBe(3);
    expect(sleeps).toEqual([
      rateLimitRetryDelayMs(0, null, minJitter),
      rateLimitRetryDelayMs(1, null, minJitter),
    ]);
    expect(result).toMatchObject({
      ok: true,
      model: "beta/example:free",
      servedWithZdr: true,
    });
  });

  it("does not retry HTTP 400 on the same model", async () => {
    const sleeps: number[] = [];
    const call = vi.fn(async ({ model }) => {
      if (model.startsWith("alpha")) {
        throw Object.assign(new Error("bad request"), { statusCode: 400 });
      }
      return { text: "ok" };
    });

    const result = await runModelFallback({
      models,
      privacyMode: "zdr_only",
      pinnedProviders: noPin,
      product: "coach",
      call,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    });

    expect(sleeps).toEqual([]);
    expect(call.mock.calls.map((entry) => entry[0]?.model)).toEqual([
      "alpha/example:free",
      "beta/example:free",
    ]);
    expect(result).toMatchObject({ ok: true, model: "beta/example:free" });
  });

  it("cancels backoff sleep immediately when stopSignal aborts", async () => {
    const controller = new AbortController();
    let sleepFinished = 0;
    const call = vi.fn(async () => {
      throw Object.assign(new Error("rl"), { statusCode: 429 });
    });

    const promise = runModelFallback({
      models: ["alpha/example:free"],
      privacyMode: "zdr_only",
      pinnedProviders: noPin,
      product: "coach",
      call,
      jitter: steadyJitter,
      stopSignal: controller.signal,
      sleep: async (ms) => {
        await new Promise((resolve) => setTimeout(resolve, ms));
        sleepFinished += 1;
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 5));
    controller.abort();
    const result = await promise;

    expect(result.ok).toBe(false);
    expect(sleepFinished).toBe(0);
    expect(call).toHaveBeenCalledTimes(1);
  });

  it("succeeds on the same model after transient 429 responses", async () => {
    let calls = 0;
    const call = vi.fn(async ({ model, zdr }) => {
      calls += 1;
      if (calls < 3) {
        throw Object.assign(new Error("temporarily rate-limited upstream"), {
          statusCode: 429,
        });
      }
      return { model, zdr };
    });

    const result = await runModelFallback({
      models: ["alpha/example:free"],
      privacyMode: "zdr_only",
      pinnedProviders: noPin,
      product: "coach",
      call,
      jitter: steadyJitter,
      sleep: async () => undefined,
    });

    expect(result).toMatchObject({
      ok: true,
      model: "alpha/example:free",
      servedWithZdr: true,
    });
    expect(call).toHaveBeenCalledTimes(3);
    for (const entry of call.mock.calls) {
      expect(entry[0]).toMatchObject({
        model: "alpha/example:free",
        zdr: true,
      });
    }
  });

  it("keeps identical routing fields on each 429 retry", () => {
    expect(openRouterProviderRouting({ mode: "standard", zdr: true })).toEqual(
      openRouterProviderRouting({ mode: "standard", zdr: true }),
    );
    expect(
      openRouterProviderRouting({ mode: "standard", zdr: true })
        .data_collection,
    ).toBe("deny");
  });

  it("does not backoff on data-policy 404", async () => {
    const sleeps: number[] = [];
    const call = vi.fn(async () => {
      throw policy404();
    });

    await runModelFallback({
      models: ["alpha/example:free", "beta/example:free"],
      privacyMode: "zdr_only",
      pinnedProviders: noPin,
      product: "coach",
      call,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    });

    expect(sleeps).toEqual([]);
    expect(call).toHaveBeenCalledTimes(2);
  });

  it("caps retry-after at three seconds for backoff", () => {
    expect(
      rateLimitRetryDelayMs(0, RETRY_AFTER_CAP_MS + 5_000, steadyJitter),
    ).toBe(3000);
  });

  it("computes backoff delay from an injected jitter source", () => {
    expect(rateLimitRetryDelayMs(0, null, minJitter)).toBe(680);
    expect(rateLimitRetryDelayMs(0, null, () => 1)).toBe(920);
    expect(rateLimitRetryDelayMs(1, null, minJitter)).toBe(1700);
    expect(rateLimitRetryDelayMs(1, null, steadyJitter)).toBe(2000);
  });

  it("marks 5xx responses as backoff-retryable but not 4xx", () => {
    expect(
      isBackoffRetryable({ kind: "provider_error", retryAfterMs: null }, 503),
    ).toBe(true);
    expect(
      isBackoffRetryable({ kind: "provider_error", retryAfterMs: null }, 500),
    ).toBe(true);
    expect(
      isBackoffRetryable({ kind: "provider_error", retryAfterMs: null }, 400),
    ).toBe(false);
    expect(
      isBackoffRetryable({ kind: "rate_limited", retryAfterMs: 1000 }, 429),
    ).toBe(true);
  });

  it("stops rate-limit retries when the overall timeout budget is exhausted", async () => {
    vi.useFakeTimers();
    try {
      const call = vi.fn(async () => {
        throw Object.assign(new Error("rl"), { statusCode: 429 });
      });
      const promise = runModelFallback({
        models: ["alpha/example:free"],
        privacyMode: "zdr_only",
        pinnedProviders: noPin,
        product: "coach",
        call,
        jitter: steadyJitter,
        sleep: async (ms) => {
          vi.advanceTimersByTime(ms);
        },
      });
      await vi.advanceTimersByTimeAsync(CHAT_TOTAL_TIMEOUT_MS);
      const result = await promise;
      expect(result.ok).toBe(false);
      expect(call.mock.calls.length).toBeLessThan(50);
    } finally {
      vi.useRealTimers();
    }
  });

  it("returns coach_unavailable when every model fails", async () => {
    const result = await runModelFallback({
      models,
      privacyMode: "zdr_only",
      pinnedProviders: noPin,
      product: "coach",
      call: async () => {
        throw new Error("upstream");
      },
      sleep: async () => undefined,
    });

    expect(result).toMatchObject({ ok: false, outcome: "coach_unavailable" });
  });

  it("stops on HTTP 402 without retrying", async () => {
    const call = vi.fn(async () => {
      throw Object.assign(new Error("payment"), { statusCode: 402 });
    });

    const result = await runModelFallback({
      models,
      privacyMode: "zdr_only",
      pinnedProviders: noPin,
      product: "coach",
      call,
      sleep: async () => undefined,
    });

    expect(call).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ ok: false, outcome: "provider_error" });
  });

  it("classifies provider failures", () => {
    expect(
      classifyProviderFailure({
        statusCode: 429,
        responseHeaders: { "Retry-After": "3" },
      }),
    ).toEqual({ kind: "rate_limited", retryAfterMs: 3000 });
    expect(
      classifyProviderFailure({
        statusCode: 404,
        message:
          "No endpoints found matching your data policy (Zero data retention)",
      }),
    ).toEqual({ kind: "provider_policy_unavailable", retryAfterMs: null });
    expect(
      classifyProviderFailure(
        Object.assign(new Error("aborted"), { name: "TimeoutError" }),
      ),
    ).toEqual({ kind: "timeout", retryAfterMs: null });
    expect(
      classifyProviderFailure(
        Object.assign(new Error("upstream"), { statusCode: 503 }),
      ),
    ).toEqual({ kind: "provider_error", retryAfterMs: null });
    expect(FIRST_TOKEN_TIMEOUT_MS).toBe(20_000);
    expect(CHAT_TOTAL_TIMEOUT_MS).toBe(60_000);
  });

  it("always sends data_collection deny in OpenRouter provider routing", () => {
    expect(openRouterProviderRouting({ mode: "standard", zdr: true })).toEqual({
      zdr: true,
      data_collection: "deny",
      allow_fallbacks: true,
    });
    expect(openRouterProviderRouting({ mode: "standard", zdr: false })).toEqual(
      {
        zdr: false,
        data_collection: "deny",
        allow_fallbacks: true,
      },
    );
  });

  it("pins providers with ZDR in paid_zdr routing", () => {
    expect(
      openRouterProviderRouting({
        mode: "paid_zdr",
        providers: ["deepinfra", "together"],
      }),
    ).toEqual({
      zdr: true,
      data_collection: "deny",
      only: ["deepinfra", "together"],
      allow_fallbacks: false,
    });
  });

  it("never sends zdr:false in paid_zdr mode", async () => {
    const call = vi.fn(async ({ zdr }) => {
      if (zdr) throw policy404();
      return { text: "unexpected" };
    });

    await runModelFallback({
      models: paidModels,
      privacyMode: "paid_zdr",
      pinnedProviders: deepinfra,
      product: "coach",
      call,
      sleep: async () => undefined,
    });

    expect(call.mock.calls.every((entry) => entry[0]?.zdr === true)).toBe(true);
    expect(
      call.mock.calls.every((entry) => entry[0]?.privacyMode === "paid_zdr"),
    ).toBe(true);
  });

  it("keeps paid_zdr routing on 429 retries", async () => {
    let calls = 0;
    const call = vi.fn(async ({ zdr, pinnedProviders }) => {
      calls += 1;
      if (calls < 3) {
        throw Object.assign(new Error("rl"), { statusCode: 429 });
      }
      return { zdr, pinnedProviders };
    });

    const result = await runModelFallback({
      models: ["google/gemma-4-31b-it"],
      privacyMode: "paid_zdr",
      pinnedProviders: deepinfra,
      product: "coach",
      call,
      jitter: steadyJitter,
      sleep: async () => undefined,
    });

    expect(result).toMatchObject({ ok: true, servedWithZdr: true });
    expect(call).toHaveBeenCalledTimes(3);
    for (const entry of call.mock.calls) {
      expect(entry[0]).toMatchObject({
        zdr: true,
        privacyMode: "paid_zdr",
        pinnedProviders: deepinfra,
      });
    }
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
});
