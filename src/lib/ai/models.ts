import type { OpenRouterPrivacyMode } from "@/lib/env";

const FREE_SUFFIX = ":free";

export type FreeModelList =
  { ok: true; models: string[] } | { ok: false; reason: "not_free" };

export type PaidModelList =
  { ok: true; models: string[] } | { ok: false; reason: "invalid_paid" };

export const DEFAULT_COACH_MODELS_PAID = [
  "google/gemma-4-31b-it",
  "openai/gpt-oss-120b",
] as const;

export const DEFAULT_PLAN_MODELS_PAID = [
  "google/gemma-4-31b-it",
  "openai/gpt-oss-120b",
] as const;

/** Nomes de modelo vêm do ambiente. Só variantes `:free` entram na lista. */
export function parseFreeModelList(value: string | undefined): FreeModelList {
  if (!value || value.trim() === "") return { ok: true, models: [] };
  const models = value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  if (
    models.some(
      (model) =>
        !model.endsWith(FREE_SUFFIX) ||
        model.includes(" ") ||
        model.length > 120,
    )
  ) {
    return { ok: false, reason: "not_free" };
  }
  return { ok: true, models };
}

/** Modelos pagos sem sufixo `:free` (modo `paid_zdr` apenas). */
export function parsePaidModelList(
  value: string | undefined,
  defaults: readonly string[],
): PaidModelList {
  if (!value || value.trim() === "") {
    return { ok: true, models: [...defaults] };
  }
  const models = value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  if (
    models.some(
      (model) =>
        model.endsWith(FREE_SUFFIX) ||
        model.includes(" ") ||
        !model.includes("/") ||
        model.length > 120,
    )
  ) {
    return { ok: false, reason: "invalid_paid" };
  }
  return { ok: true, models };
}

export type ProviderPinList =
  { ok: true; providers: string[] } | { ok: false; reason: "invalid_provider" };

const DEFAULT_OPENROUTER_PROVIDERS = ["deepinfra"];

export function coachModelsForPrivacyMode(env: {
  OPENROUTER_PRIVACY_MODE: OpenRouterPrivacyMode;
  COACH_MODELS: string[];
  COACH_MODELS_PAID: string[];
}): string[] {
  return env.OPENROUTER_PRIVACY_MODE === "paid_zdr"
    ? env.COACH_MODELS_PAID
    : env.COACH_MODELS;
}

export function planModelsForPrivacyMode(env: {
  OPENROUTER_PRIVACY_MODE: OpenRouterPrivacyMode;
  PLAN_MODELS: string[];
  PLAN_MODELS_PAID: string[];
}): string[] {
  return env.OPENROUTER_PRIVACY_MODE === "paid_zdr"
    ? env.PLAN_MODELS_PAID
    : env.PLAN_MODELS;
}

export function parseOpenRouterProviders(
  value: string | undefined,
): ProviderPinList {
  if (!value || value.trim() === "") {
    return { ok: true, providers: [...DEFAULT_OPENROUTER_PROVIDERS] };
  }
  const providers = value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  if (
    providers.some(
      (provider) =>
        provider.includes(" ") ||
        !/^[\w-]+$/u.test(provider) ||
        provider.length > 40,
    )
  ) {
    return { ok: false, reason: "invalid_provider" };
  }
  return { ok: true, providers };
}
