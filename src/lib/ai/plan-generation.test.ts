import { describe, expect, it, vi } from "vitest";

import { runPlanModelFallback } from "./plan-generation";
import { PLAN_TEMPORARILY_UNAVAILABLE_MESSAGE } from "./unavailable";

describe("runPlanModelFallback", () => {
  it("returns plan_unavailable with the friendly message when every model fails", async () => {
    const result = await runPlanModelFallback({
      models: ["alpha/example:free"],
      privacyMode: "zdr_only",
      call: async () => {
        throw new Error("upstream");
      },
      sleep: async () => undefined,
    });

    expect(result).toEqual({
      ok: false,
      outcome: "plan_unavailable",
      message: PLAN_TEMPORARILY_UNAVAILABLE_MESSAGE,
    });
  });

  it("delegates to the shared fallback runner", async () => {
    const call = vi.fn(async () => ({ plan: true }));
    const result = await runPlanModelFallback({
      models: ["alpha/example:free"],
      privacyMode: "zdr_only",
      call,
      sleep: async () => undefined,
    });

    expect(result).toMatchObject({ ok: true, servedWithZdr: true });
    expect(call).toHaveBeenCalledWith(expect.objectContaining({ zdr: true }));
  });
});
