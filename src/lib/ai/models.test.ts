import { describe, expect, it } from "vitest";

import {
  coachModelsForPrivacyMode,
  parseOpenRouterProviders,
  parsePaidModelList,
  planModelsForPrivacyMode,
} from "./models";

describe("model lists", () => {
  it("rejects :free ids in paid model lists", () => {
    expect(parsePaidModelList("vendor/model:free")).toEqual({
      ok: false,
      reason: "invalid_paid",
    });
  });

  it("requires an explicit paid model list", () => {
    expect(parsePaidModelList(undefined)).toEqual({
      ok: false,
      reason: "missing",
    });
    expect(parsePaidModelList("")).toEqual({
      ok: false,
      reason: "missing",
    });
  });

  it("selects paid lists only in paid_zdr mode", () => {
    const env = {
      OPENROUTER_PRIVACY_MODE: "paid_zdr" as const,
      COACH_MODELS: [],
      COACH_MODELS_PAID: ["google/gemma-4-31b-it"],
      PLAN_MODELS: [],
      PLAN_MODELS_PAID: ["openai/gpt-oss-120b"],
    };
    expect(coachModelsForPrivacyMode(env)).toEqual(["google/gemma-4-31b-it"]);
    expect(planModelsForPrivacyMode(env)).toEqual(["openai/gpt-oss-120b"]);
    expect(
      coachModelsForPrivacyMode({
        ...env,
        OPENROUTER_PRIVACY_MODE: "zdr_only",
      }),
    ).toEqual([]);
  });

  it("rejects invalid OpenRouter provider pins", () => {
    expect(parseOpenRouterProviders("deep infra")).toEqual({
      ok: false,
      reason: "invalid_provider",
    });
    expect(parseOpenRouterProviders(undefined)).toEqual({
      ok: true,
      providers: ["deepinfra"],
    });
  });
});
