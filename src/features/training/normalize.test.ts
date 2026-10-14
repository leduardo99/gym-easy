import { describe, expect, it } from "vitest";

import { normalizeExerciseName } from "./normalize";

describe("normalizeExerciseName", () => {
  it("lowercases and strips accents so search can ignore them", () => {
    expect(normalizeExerciseName("Supino")).toBe("supino");
    expect(normalizeExerciseName("Tríceps")).toBe("triceps");
    expect(normalizeExerciseName("AÇÃO")).toBe("acao");
  });

  it("collapses whitespace", () => {
    expect(normalizeExerciseName("  Rosca   direta ")).toBe("rosca direta");
  });
});
