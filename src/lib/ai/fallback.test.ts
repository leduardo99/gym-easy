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
      product: "coach",
      call,
      sleep: async () => undefined,
    });

    expect(result).toMatchObject({ ok: true, model: "beta/example:free" });
    expect(call).toHaveBeenCalledTimes(2);
    expect(call.mock.calls.map((entry) => entry[0]?.zdr)).toEqual([true, true]);
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
      privacyMode: "zdr_only",
      product: "coach",
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
      servedWithZdr: true,
    });
  });

  it("returns coach_unavailable when every model fails", async () => {
    const result = await runModelFallback({
      models,
      privacyMode: "zdr_only",
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
      product: "coach",
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
        message:
          "No endpoints found matching your data policy (Zero data retention)",
      }),
    ).toEqual({ kind: "provider_policy_unavailable", retryAfterMs: null });
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

  it("always sends data_collection deny in OpenRouter provider routing", () => {
    expect(openRouterProviderRouting({ zdr: true })).toEqual({
      zdr: true,
      data_collection: "deny",
      allow_fallbacks: true,
    });
    expect(openRouterProviderRouting({ zdr: false })).toEqual({
      zdr: false,
      data_collection: "deny",
      allow_fallbacks: true,
    });
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
