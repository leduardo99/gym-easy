import type { AiOutcome } from "./schemas";

export const COACH_TEMPORARILY_UNAVAILABLE_MESSAGE =
  "O coach está temporariamente indisponível. Tente novamente mais tarde.";

export const PLAN_TEMPORARILY_UNAVAILABLE_MESSAGE =
  "Não foi possível gerar o plano agora. Tente novamente mais tarde.";

export type AiProduct = "coach" | "plan";

export function unavailableOutcomeForProduct(
  product: AiProduct,
): "coach_unavailable" | "plan_unavailable" {
  return product === "coach" ? "coach_unavailable" : "plan_unavailable";
}

export function unavailableMessageForProduct(product: AiProduct): string {
  return product === "coach"
    ? COACH_TEMPORARILY_UNAVAILABLE_MESSAGE
    : PLAN_TEMPORARILY_UNAVAILABLE_MESSAGE;
}

export function clientErrorCodeForOutcome(outcome: AiOutcome): string {
  if (outcome === "coach_unavailable") return "coach_unavailable";
  if (outcome === "plan_unavailable") return "plan_unavailable";
  return outcome;
}

export function isAllModelsUnavailableOutcome(outcome: AiOutcome): boolean {
  return outcome === "coach_unavailable" || outcome === "plan_unavailable";
}
