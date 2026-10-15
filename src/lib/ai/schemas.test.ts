import { describe, expect, it } from "vitest";

import {
  coachChatInputSchema,
  generatedPlanSchema,
  planChangeInputSchema,
} from "./schemas";

describe("coach chat zod schemas", () => {
  it("accepts a short message and rejects extra fields", () => {
    expect(
      coachChatInputSchema.parse({ message: "Como foi o supino?" }),
    ).toEqual({
      message: "Como foi o supino?",
    });
    expect(
      coachChatInputSchema.safeParse({
        message: "oi",
        userId: "someone-else",
      }).success,
    ).toBe(false);
  });

  it("rejects an empty message and a message over 2000 characters", () => {
    expect(coachChatInputSchema.safeParse({ message: "   " }).success).toBe(
      false,
    );
    expect(
      coachChatInputSchema.safeParse({ message: "a".repeat(2001) }).success,
    ).toBe(false);
  });

  it("accepts a plan change proposal and refuses unknown keys", () => {
    expect(
      planChangeInputSchema.parse({
        type: "swap_exercise",
        workout_day: 1,
        from_exercise_id: "agachamento_livre_com_barra",
        to_exercise_id: "agachamento_goblet",
        rationale: "Troca por uma opção sem carga na coluna.",
      }),
    ).toMatchObject({ type: "swap_exercise" });
    expect(
      planChangeInputSchema.safeParse({
        type: "swap_exercise",
        rationale: "ok",
        user_id: "nope",
      }).success,
    ).toBe(false);
  });

  it("accepts a plan_v2 object and rejects a technique outside the enum", () => {
    const plan = {
      schema_version: "plan_v2",
      plan_name: "Full body",
      split: "full_body_2",
      weeks: 5,
      rationale: "Dois dias de corpo inteiro.",
      workouts: [
        {
          day: 1,
          name: "A",
          estimated_minutes: 45,
          exercises: [
            {
              slot: "squat",
              exercise_id: "agachamento_goblet",
              sets: 3,
              rep_min: 8,
              rep_max: 12,
              rir: 3,
              rest_s: 120,
              technique: "none",
              notes: "",
            },
          ],
        },
      ],
      week_overrides: [
        { week: 5, type: "deload", volume_pct: -45, load_pct: -10 },
      ],
      warnings: ["PARQ_POSITIVE_ADVICE"],
    };
    expect(generatedPlanSchema.parse(plan)).toMatchObject({
      schema_version: "plan_v2",
    });
    const workout = plan.workouts[0];
    const exercise = workout?.exercises[0];
    if (!workout || !exercise) throw new Error("fixture");
    expect(
      generatedPlanSchema.safeParse({
        ...plan,
        workouts: [
          {
            ...workout,
            exercises: [{ ...exercise, technique: "cheat" }],
          },
        ],
      }).success,
    ).toBe(false);
  });
});
