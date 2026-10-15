import type { OpenRouterPrivacyMode, ServerEnv } from "@/lib/env";

import { runModelFallback, type ModelAttempt } from "./fallback";
import { planModelsForPrivacyMode } from "./models";
import type { AiOutcome } from "./schemas";
import { PLAN_TEMPORARILY_UNAVAILABLE_MESSAGE } from "./unavailable";

export type PlanGenerationResult<T> =
  | { ok: true; value: T; model: string; servedWithZdr: boolean }
  | { ok: false; outcome: AiOutcome; message: string };

export type PlanModelEnv = Pick<
  ServerEnv,
  | "OPENROUTER_PRIVACY_MODE"
  | "PLAN_MODELS"
  | "PLAN_MODELS_PAID"
  | "OPENROUTER_PROVIDERS"
>;

export async function runPlanModelFallbackForEnv<T>(
  env: PlanModelEnv,
  options: {
    call: (attempt: ModelAttempt) => Promise<T>;
    sleep: (ms: number) => Promise<void>;
    stopSignal?: AbortSignal;
  },
): Promise<PlanGenerationResult<T>> {
  return runPlanModelFallback({
    models: planModelsForPrivacyMode(env),
    privacyMode: env.OPENROUTER_PRIVACY_MODE,
    pinnedProviders: env.OPENROUTER_PROVIDERS,
    ...options,
  });
}

export async function runPlanModelFallback<T>(options: {
  models: string[];
  privacyMode: OpenRouterPrivacyMode;
  pinnedProviders: string[];
  call: (attempt: ModelAttempt) => Promise<T>;
  sleep: (ms: number) => Promise<void>;
  stopSignal?: AbortSignal;
}): Promise<PlanGenerationResult<T>> {
  const generated = await runModelFallback({
    models: options.models,
    privacyMode: options.privacyMode,
    pinnedProviders: options.pinnedProviders,
    product: "plan",
    call: options.call,
    sleep: options.sleep,
    stopSignal: options.stopSignal,
  });
  if (generated.ok) {
    return {
      ok: true,
      value: generated.value,
      model: generated.model,
      servedWithZdr: generated.servedWithZdr,
    };
  }
  return {
    ok: false,
    outcome: generated.outcome,
    message: PLAN_TEMPORARILY_UNAVAILABLE_MESSAGE,
  };
}
