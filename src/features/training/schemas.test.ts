import { describe, expect, it } from "vitest";

import {
  createProfileInputSchema,
  exerciseInputSchema,
  repsTargetSchema,
  weightInputSchema,
  workoutInputSchema,
} from "./schemas";

const today = "2026-10-14";
const profileInputSchema = createProfileInputSchema(today);
const exerciseId = "11111111-1111-4111-8111-111111111111";

describe("createProfileInputSchema", () => {
  it("accepts a partial profile and rejects a client-supplied user id", () => {
    expect(
      profileInputSchema.parse({
        birthDate: "1999-01-02",
        sex: "male",
        heightCm: 175,
        goal: "hypertrophy",
        level: "intermediate",
        massUnit: "kg",
        theme: "dark",
        defaultRestSeconds: 90,
      }),
    ).toMatchObject({ heightCm: 175, massUnit: "kg" });

    expect(
      profileInputSchema.safeParse({
        heightCm: 175,
        userId: "22222222-2222-4222-8222-222222222222",
      }).success,
    ).toBe(false);
  });

  it("rejects age, height, and rest outside the product ranges", () => {
    expect(
      profileInputSchema.safeParse({ birthDate: "2014-10-14" }).success,
    ).toBe(false);
    expect(
      profileInputSchema.safeParse({ birthDate: "1920-01-01" }).success,
    ).toBe(false);
    expect(
      profileInputSchema.safeParse({ birthDate: "2013-10-14" }).success,
    ).toBe(true);
    expect(profileInputSchema.safeParse({ heightCm: 99 }).success).toBe(false);
    expect(profileInputSchema.safeParse({ heightCm: 251 }).success).toBe(false);
    expect(
      profileInputSchema.safeParse({ defaultRestSeconds: 10 }).success,
    ).toBe(false);
  });
});

describe("weightInputSchema", () => {
  it("stores kilograms and converts pounds", () => {
    expect(
      weightInputSchema.parse({
        recordedOn: "2026-10-14",
        weight: "78,5",
        unit: "kg",
      }),
    ).toEqual({ recordedOn: "2026-10-14", weightKg: "78.5" });

    expect(
      weightInputSchema.parse({
        recordedOn: "2026-10-14",
        weight: 660,
        unit: "lb",
      }).weightKg,
    ).toBe("299.4");
  });

  it("rejects weights outside 30–300 kg and 66–660 lb", () => {
    expect(
      weightInputSchema.safeParse({
        recordedOn: "2026-10-14",
        weight: 29.9,
        unit: "kg",
      }).success,
    ).toBe(false);
    expect(
      weightInputSchema.safeParse({
        recordedOn: "2026-10-14",
        weight: 65,
        unit: "lb",
      }).success,
    ).toBe(false);
    expect(
      weightInputSchema.safeParse({
        recordedOn: "2026-10-14",
        weight: 78.5,
        unit: "kg",
        userId: exerciseId,
      }).success,
    ).toBe(false);
  });
});

describe("exerciseInputSchema", () => {
  it("requires name, muscle group, and equipment and ignores no owner field", () => {
    expect(
      exerciseInputSchema.parse({
        name: "  Supino máquina X  ",
        muscleGroup: "chest",
        equipment: "machine",
      }),
    ).toEqual({
      name: "Supino máquina X",
      muscleGroup: "chest",
      equipment: "machine",
    });
    expect(
      exerciseInputSchema.safeParse({
        name: "A",
        muscleGroup: "chest",
        equipment: "machine",
      }).success,
    ).toBe(false);
    expect(
      exerciseInputSchema.safeParse({
        name: "Meu supino",
        muscleGroup: "chest",
        equipment: "machine",
        userId: exerciseId,
      }).success,
    ).toBe(false);
  });
});

describe("repsTargetSchema", () => {
  it("parses a single number or an ascending range", () => {
    expect(repsTargetSchema.parse("8")).toEqual({ repsMin: 8, repsMax: 8 });
    expect(repsTargetSchema.parse("8-12")).toEqual({ repsMin: 8, repsMax: 12 });
    expect(repsTargetSchema.safeParse("12-8").success).toBe(false);
    expect(repsTargetSchema.safeParse("0").success).toBe(false);
    expect(repsTargetSchema.safeParse("8-12-14").success).toBe(false);
  });
});

describe("workoutInputSchema", () => {
  it("requires a name and between 1 and 30 exercises", () => {
    expect(
      workoutInputSchema.parse({
        name: "Treino A",
        notes: null,
        exercises: [
          {
            exerciseId,
            setsCount: 4,
            repsTarget: "8-10",
            targetLoadKg: "60",
            restSeconds: 90,
          },
        ],
      }),
    ).toMatchObject({
      name: "Treino A",
      exercises: [
        {
          exerciseId,
          setsCount: 4,
          repsMin: 8,
          repsMax: 10,
          targetLoadKg: "60.0",
          restSeconds: 90,
        },
      ],
    });
    expect(
      workoutInputSchema.safeParse({
        name: "Treino A",
        exercises: [],
      }).success,
    ).toBe(false);
    expect(
      workoutInputSchema.safeParse({
        name: "Treino A",
        exercises: [{ exerciseId }],
        userId: exerciseId,
      }).success,
    ).toBe(false);
  });
});
