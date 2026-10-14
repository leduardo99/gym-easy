import { describe, expect, it } from "vitest";

import {
  CATALOG_EXERCISES,
  EQUIPMENT,
  MUSCLE_GROUP_LABELS,
  MUSCLE_GROUPS,
} from "./catalog";
import { normalizeExerciseName } from "@/features/training/normalize";

describe("exercise catalog", () => {
  it("ships at least 80 common exercises covering every muscle group and equipment", () => {
    expect(CATALOG_EXERCISES.length).toBeGreaterThanOrEqual(80);
    expect(new Set(CATALOG_EXERCISES.map((item) => item.muscleGroup))).toEqual(
      new Set(MUSCLE_GROUPS),
    );
    expect(new Set(CATALOG_EXERCISES.map((item) => item.equipment))).toEqual(
      new Set(EQUIPMENT),
    );
  });

  it("uses unique normalized names in the Supino reto (barra) style", () => {
    const names = CATALOG_EXERCISES.map((item) =>
      normalizeExerciseName(item.name),
    );
    expect(new Set(names).size).toBe(names.length);
    for (const item of CATALOG_EXERCISES) {
      expect(item.name.length).toBeGreaterThanOrEqual(2);
      expect(item.name.length).toBeLessThanOrEqual(60);
      expect(item.name).toMatch(/\(.+\)$/);
    }
    expect(
      CATALOG_EXERCISES.some((item) => item.name === "Supino reto (barra)"),
    ).toBe(true);
    expect(
      CATALOG_EXERCISES.some((item) => item.name === "Crucifixo (halteres)"),
    ).toBe(true);
  });

  it("labels every muscle group in Portuguese", () => {
    expect(Object.keys(MUSCLE_GROUP_LABELS).sort()).toEqual(
      [...MUSCLE_GROUPS].sort(),
    );
    expect(MUSCLE_GROUP_LABELS.chest).toBe("Peito");
    expect(MUSCLE_GROUP_LABELS.hamstrings).toBe("Posterior");
  });
});
