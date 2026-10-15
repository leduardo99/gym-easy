import { describe, expect, it } from "vitest";

import {
  coachModelsForPrivacyMode,
  DEFAULT_COACH_MODELS_PAID,
  parseOpenRouterProviders,
  parsePaidModelList,
  planModelsForPrivacyMode,
} from "./models";

describe("model lists", () => {
  it("rejects :free ids in paid model lists", () => {
    expect(
      parsePaidModelList("vendor/model:free", DEFAULT_COACH_MODELS_PAID),
    ).toEqual({
      ok: false,
      reason: "invalid_paid",
    });
  });

  it("defaults paid coach models when unset", () => {
    expect(parsePaidModelList(undefined, DEFAULT_COACH_MODELS_PAID)).toEqual({
      ok: true,
      models: [...DEFAULT_COACH_MODELS_PAID],
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
