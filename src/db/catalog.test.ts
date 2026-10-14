import { describe, expect, it } from "vitest";

import {
  BODY_REGION_LABELS,
  BODY_REGIONS,
  CATALOG_EXERCISES,
  CATALOG_VERSION,
  EQUIPMENT_LABELS,
  LEVEL_LABELS,
  MOVEMENT_PATTERN_LABELS,
  MOVEMENT_PATTERNS,
  MUSCLE_GROUP_LABELS,
  MUSCLE_GROUPS,
  MUSCLE_LABELS,
  MUSCLES,
} from "./catalog";
import { LEVEL_VALUES } from "./domain";
import { normalizeExerciseName } from "@/features/training/normalize";

const SLUG_PATTERN = /^[a-z0-9]+(_[a-z0-9]+)*$/;

describe("exercise catalog", () => {
  it("ships the 136 LED-32 exercises with unique English slugs", () => {
    expect(CATALOG_VERSION).toBe("2026-10-14.v2");
    expect(CATALOG_EXERCISES).toHaveLength(136);

    const slugs = CATALOG_EXERCISES.map((item) => item.slug);
    expect(new Set(slugs).size).toBe(136);
    for (const slug of slugs) {
      expect(slug).toMatch(SLUG_PATTERN);
    }

    const names = CATALOG_EXERCISES.map((item) =>
      normalizeExerciseName(item.name),
    );
    expect(new Set(names).size).toBe(names.length);
  });

  it("keeps display names in Portuguese and keys in English", () => {
    const bench = CATALOG_EXERCISES.find(
      (item) => item.slug === "supino_reto_com_barra",
    );
    expect(bench).toMatchObject({
      name: "Supino reto com barra",
      movementPattern: "horizontal_push",
      equipment: "barbell",
      muscleGroup: "chest",
      primaryMuscles: ["chest"],
      level: "intermediate",
    });

    const fly = CATALOG_EXERCISES.find(
      (item) => item.slug === "crucifixo_com_halteres",
    );
    expect(fly?.name).toBe("Crucifixo com halteres");

    for (const item of CATALOG_EXERCISES) {
      expect([...item.name].length).toBeGreaterThanOrEqual(2);
      expect([...item.name].length).toBeLessThanOrEqual(60);
      expect(item.defaultRepsMin).toBeGreaterThanOrEqual(1);
      expect(item.defaultRepsMax).toBeGreaterThanOrEqual(item.defaultRepsMin);
      expect(item.defaultRepsMax).toBeLessThanOrEqual(999);
      expect(item.substitutions.length).toBeLessThanOrEqual(3);
      expect(item.primaryMuscles.length).toBeGreaterThanOrEqual(1);
      for (const substitution of item.substitutions) {
        expect(substitution).not.toBe(item.slug);
        expect(slugsHave(substitution)).toBe(true);
      }
    }
  });

  it("keeps the official Portuguese slug for close-grip bench press", () => {
    const closeGrip = CATALOG_EXERCISES.find(
      (item) => item.slug === "supino_fechado",
    );
    expect(closeGrip?.name).toBe("Supino fechado");
    expect(closeGrip?.equipment).toBe("barbell");
  });

  it("labels enums in Portuguese", () => {
    expect(Object.keys(MUSCLE_GROUP_LABELS).sort()).toEqual(
      [...MUSCLE_GROUPS].sort(),
    );
    expect(Object.keys(MOVEMENT_PATTERN_LABELS).sort()).toEqual(
      [...MOVEMENT_PATTERNS].sort(),
    );
    expect(Object.keys(MUSCLE_LABELS).sort()).toEqual([...MUSCLES].sort());
    expect(Object.keys(BODY_REGION_LABELS).sort()).toEqual(
      [...BODY_REGIONS].sort(),
    );
    expect(Object.keys(LEVEL_LABELS).sort()).toEqual([...LEVEL_VALUES].sort());
    expect(MUSCLE_GROUP_LABELS.chest).toBe("Peito");
    expect(EQUIPMENT_LABELS.smith_machine).toBe("Smith");
    expect(EQUIPMENT_LABELS.resistance_band).toBe("Elástico");
    expect(EQUIPMENT_LABELS.accessory).toBe("Acessório");
    expect(MOVEMENT_PATTERN_LABELS.hip_hinge).toBe("Dobradiça de quadril");
    expect(BODY_REGION_LABELS.lower_back).toBe("Coluna lombar");
    expect(MUSCLE_LABELS.front_delts).toBe("Deltoide anterior");
    expect(LEVEL_LABELS.beginner).toBe("Iniciante");
  });
});

function slugsHave(slug: string): boolean {
  return CATALOG_EXERCISES.some((item) => item.slug === slug);
}
