import type { OpenRouterPrivacyMode } from "@/lib/env";

import { runModelFallback, type ModelAttempt } from "./fallback";
import type { AiOutcome } from "./schemas";
import {
  PLAN_TEMPORARILY_UNAVAILABLE_MESSAGE,
  isAllModelsUnavailableOutcome,
} from "./unavailable";

export type PlanGenerationResult<T> =
  | { ok: true; value: T; model: string; servedWithZdr: boolean }
  | { ok: false; outcome: AiOutcome; message: string };

export async function runPlanModelFallback<T>(options: {
  models: string[];
  privacyMode: OpenRouterPrivacyMode;
  call: (attempt: ModelAttempt) => Promise<T>;
  sleep: (ms: number) => Promise<void>;
  stopSignal?: AbortSignal;
}): Promise<PlanGenerationResult<T>> {
  const generated = await runModelFallback({
    models: options.models,
    privacyMode: options.privacyMode,
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
    message: isAllModelsUnavailableOutcome(generated.outcome)
      ? PLAN_TEMPORARILY_UNAVAILABLE_MESSAGE
      : PLAN_TEMPORARILY_UNAVAILABLE_MESSAGE,
  };
}
