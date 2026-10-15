import { z } from "zod";

import { AGE_BANDS } from "@/features/profile/age";
import {
  GOAL_VALUES,
  LEVEL_VALUES,
  SEX_VALUES,
  TRAINING_PLACE_VALUES,
} from "@/db/domain";

export const AI_OUTCOMES = [
  "ok",
  "timeout",
  "provider_error",
  "schema_invalid",
  "validation_rejected",
  "safety_block",
  "rate_limited",
  "internal",
] as const;

export type AiOutcome = (typeof AI_OUTCOMES)[number];

export const DATA_POLICIES = ["zdr", "any_free"] as const;

export type DataPolicy = (typeof DATA_POLICIES)[number];

export const coachChatInputSchema = z
  .object({
    message: z.string().trim().min(1).max(2000),
  })
  .strict();

export type CoachChatInput = z.infer<typeof coachChatInputSchema>;

export const planChangeInputSchema = z
  .object({
    type: z.enum([
      "swap_exercise",
      "change_volume",
      "change_load",
      "deload",
      "schedule",
    ]),
    workout_day: z.number().int().min(1).max(6).optional(),
    from_exercise_id: z.string().min(1).max(80).optional(),
    to_exercise_id: z.string().min(1).max(80).optional(),
    sets: z.number().int().min(1).max(8).optional(),
    rep_min: z.number().int().min(1).max(30).optional(),
    rep_max: z.number().int().min(1).max(30).optional(),
    rir: z.number().int().min(0).max(5).optional(),
    load_change_pct: z.number().min(-20).max(10).optional(),
    duration_weeks: z.number().int().min(1).max(6).optional(),
    rationale: z.string().trim().min(1).max(280),
  })
  .strict();

export type PlanChangeInput = z.infer<typeof planChangeInputSchema>;

export const PLAN_WARNING_CODES = [
  "PARQ_POSITIVE_ADVICE",
  "MODERATE_INJURY_PHYSIO",
  "INJURY_REASSESS_DUE",
  "PREGNANCY_ADVICE",
  "INSUFFICIENT_CATALOG",
  "EXERCISES_ADJUSTED_FOR_INJURY",
  "DAYS_REDUCED",
  "FALLBACK_PLAN_USED",
] as const;

const planExerciseSchema = z
  .object({
    slot: z.string().min(1).max(40),
    exercise_id: z.string().min(1).max(80),
    sets: z.number().int().min(1).max(25),
    rep_min: z.number().int().min(1).max(30),
    rep_max: z.number().int().min(1).max(30),
    rir: z.number().int().min(0).max(5),
    rest_s: z.number().int().min(0).max(600),
    technique: z.enum([
      "none",
      "drop_set",
      "to_failure",
      "rest_pause",
      "1rm_test",
    ]),
    notes: z.string().max(140),
  })
  .strict()
  .refine((exercise) => exercise.rep_min <= exercise.rep_max, {
    path: ["rep_min"],
  });

export const generatedPlanSchema = z
  .object({
    schema_version: z.literal("plan_v2"),
    plan_name: z.string().min(1).max(60),
    split: z.enum([
      "full_body_2",
      "full_body_3",
      "upper_lower_4",
      "hybrid_5",
      "ppl_6",
    ]),
    weeks: z.number().int().min(1).max(8),
    rationale: z.string().min(1).max(600),
    workouts: z
      .array(
        z
          .object({
            day: z.number().int().min(1).max(6),
            name: z.string().min(1).max(40),
            estimated_minutes: z.number().int().min(1).max(180),
            exercises: z.array(planExerciseSchema).min(1).max(20),
          })
          .strict(),
      )
      .min(1)
      .max(6),
    week_overrides: z
      .array(
        z
          .object({
            week: z.number().int().min(1).max(8),
            type: z.literal("deload"),
            volume_pct: z.number().min(-80).max(0),
            load_pct: z.number().min(-50).max(0),
          })
          .strict(),
      )
      .max(4),
    warnings: z.array(z.enum(PLAN_WARNING_CODES)).max(12),
  })
  .strict();

export type GeneratedPlan = z.infer<typeof generatedPlanSchema>;

export const coachContextSchema = z
  .object({
    ageBand: z.enum(AGE_BANDS),
    sex: z.enum(SEX_VALUES).nullable(),
    heightCm: z.number().int().nullable(),
    weightKg: z.number().nullable(),
    goal: z.enum(GOAL_VALUES).nullable(),
    experienceLevel: z.enum(LEVEL_VALUES).nullable(),
    daysPerWeek: z.number().int().nullable(),
    sessionMinutes: z.number().int().nullable(),
    equipment: z.enum(TRAINING_PLACE_VALUES).nullable(),
  })
  .strict();

export type CoachContext = z.infer<typeof coachContextSchema>;

export const aiLogRecordSchema = z
  .object({
    request_id: z.string().min(1).max(80),
    user_id_hash: z.string().regex(/^[a-f0-9]{64}$/),
    model: z.string().max(120).nullable(),
    policy: z.enum(DATA_POLICIES).nullable(),
    latency_ms: z.number().int().min(0),
    tokens_in: z.number().int().min(0).nullable(),
    tokens_out: z.number().int().min(0).nullable(),
    outcome: z.enum(AI_OUTCOMES),
  })
  .strict();

export type AiLogRecord = z.infer<typeof aiLogRecordSchema>;

export const historyToolInputSchema = z
  .object({
    exercise_id: z.string().min(1).max(80),
    days: z.number().int().min(7).max(90).default(30),
  })
  .strict();
