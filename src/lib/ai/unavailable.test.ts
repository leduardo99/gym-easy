import { describe, expect, it } from "vitest";

import {
  COACH_TEMPORARILY_UNAVAILABLE_MESSAGE,
  PLAN_TEMPORARILY_UNAVAILABLE_MESSAGE,
  clientErrorCodeForOutcome,
  isAllModelsUnavailableOutcome,
  unavailableMessageForProduct,
} from "./unavailable";

describe("unavailable mapping", () => {
  it("maps aggregate failures to coach_unavailable and plan_unavailable codes", () => {
    expect(clientErrorCodeForOutcome("coach_unavailable")).toBe(
      "coach_unavailable",
    );
    expect(clientErrorCodeForOutcome("plan_unavailable")).toBe(
      "plan_unavailable",
    );
    expect(isAllModelsUnavailableOutcome("coach_unavailable")).toBe(true);
    expect(isAllModelsUnavailableOutcome("provider_error")).toBe(false);
  });

  it("exposes the friendly pt-BR UI copy", () => {
    expect(COACH_TEMPORARILY_UNAVAILABLE_MESSAGE).toBe(
      "O coach está temporariamente indisponível. Tente novamente mais tarde.",
    );
    expect(unavailableMessageForProduct("plan")).toBe(
      PLAN_TEMPORARILY_UNAVAILABLE_MESSAGE,
    );
  });
});
