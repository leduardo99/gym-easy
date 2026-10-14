import { z } from "zod";

import { EQUIPMENT, MUSCLE_GROUPS } from "@/db/catalog";
import {
  GOAL_VALUES,
  LEVEL_VALUES,
  MASS_UNIT_VALUES,
  SEX_VALUES,
  THEME_VALUES,
} from "@/db/domain";

import {
  formatTenths,
  parseMassToTenths,
  poundsToKilogramTenths,
} from "./mass";

export type {
  Goal,
  MassUnit,
  Sex,
  ThemePreference,
  TrainingLevel,
} from "@/db/domain";
export {
  GOAL_VALUES,
  LEVEL_VALUES,
  MASS_UNIT_VALUES,
  SEX_VALUES,
  THEME_VALUES,
};

export function ageInYears(birthDate: string, today: string): number {
  const birth = birthDate.split("-").map(Number);
  const now = today.split("-").map(Number);
  const birthYear = birth[0];
  const birthMonth = birth[1];
  const birthDay = birth[2];
  const year = now[0];
  const month = now[1];
  const day = now[2];
  if (
    birthYear === undefined ||
    birthMonth === undefined ||
    birthDay === undefined ||
    year === undefined ||
    month === undefined ||
    day === undefined
  ) {
    return -1;
  }
  let age = year - birthYear;
  if (month < birthMonth || (month === birthMonth && day < birthDay)) age -= 1;
  return age;
}

export function createProfileInputSchema(today: string) {
  return z
    .object({
      birthDate: z.iso.date().nullable().optional(),
      sex: z.enum(SEX_VALUES).nullable().optional(),
      heightCm: z.number().int().min(100).max(250).nullable().optional(),
      goal: z.enum(GOAL_VALUES).nullable().optional(),
      level: z.enum(LEVEL_VALUES).nullable().optional(),
      massUnit: z.enum(MASS_UNIT_VALUES).optional(),
      theme: z.enum(THEME_VALUES).optional(),
      defaultRestSeconds: z
        .number()
        .int()
        .min(15)
        .max(600)
        .multipleOf(15)
        .optional(),
    })
    .strict()
    .superRefine((value, context) => {
      if (!value.birthDate) return;
      const age = ageInYears(value.birthDate, today);
      if (age < 13 || age > 100) {
        context.addIssue({
          code: "custom",
          path: ["birthDate"],
          message: "A idade precisa estar entre 13 e 100 anos.",
        });
      }
    });
}

const KG_MIN_TENTHS = 300;
const KG_MAX_TENTHS = 3000;
const LB_MIN_TENTHS = 660;
const LB_MAX_TENTHS = 6600;

export const weightInputSchema = z
  .object({
    recordedOn: z.iso.date(),
    weight: z.union([z.string(), z.number()]),
    unit: z.enum(MASS_UNIT_VALUES),
  })
  .strict()
  .transform((value, context) => {
    const tenths = parseMassToTenths(value.weight);
    const min = value.unit === "lb" ? LB_MIN_TENTHS : KG_MIN_TENTHS;
    const max = value.unit === "lb" ? LB_MAX_TENTHS : KG_MAX_TENTHS;
    if (tenths === null || tenths < min || tenths > max) {
      context.addIssue({
        code: "custom",
        message: "Peso fora da faixa permitida.",
      });
      return z.NEVER;
    }
    const kilograms =
      value.unit === "lb" ? poundsToKilogramTenths(tenths) : tenths;
    return {
      recordedOn: value.recordedOn,
      weightKg: formatTenths(kilograms),
    };
  });

export const exerciseInputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .refine((name) => [...name].length >= 2 && [...name].length <= 60, {
        message: "O nome precisa ter de 2 a 60 caracteres.",
      }),
    muscleGroup: z.enum(MUSCLE_GROUPS),
    equipment: z.enum(EQUIPMENT),
  })
  .strict();

export const repsTargetSchema = z
  .string()
  .trim()
  .transform((value, context) => {
    const match = /^(\d{1,3})(?:-(\d{1,3}))?$/.exec(value);
    const minText = match?.[1];
    if (!match || minText === undefined) {
      context.addIssue({
        code: "custom",
        message: "Informe as repetições como 8 ou 8-12.",
      });
      return z.NEVER;
    }
    const repsMin = Number(minText);
    const repsMax = match[2] === undefined ? repsMin : Number(match[2]);
    if (repsMin < 1 || repsMax > 999 || repsMin > repsMax) {
      context.addIssue({
        code: "custom",
        message: "A faixa de repetições precisa ir do menor para o maior.",
      });
      return z.NEVER;
    }
    return { repsMin, repsMax };
  });

const LOAD_MAX_TENTHS = 10_000;

const workoutExerciseInputSchema = z
  .object({
    exerciseId: z.uuid(),
    setsCount: z.number().int().min(1).max(20).default(3),
    repsTarget: z.string().default("10"),
    targetLoadKg: z.union([z.string(), z.number(), z.null()]).optional(),
    restSeconds: z.number().int().min(15).max(600).default(90),
  })
  .strict();

export const workoutInputSchema = z
  .object({
    name: z.string().trim().min(1).max(60),
    notes: z.string().trim().max(500).nullable().optional(),
    exercises: z.array(workoutExerciseInputSchema).min(1).max(30),
  })
  .strict()
  .transform((value, context) => {
    const exercises = [];
    for (const [index, exercise] of value.exercises.entries()) {
      const reps = repsTargetSchema.safeParse(exercise.repsTarget);
      if (!reps.success) {
        context.addIssue({
          code: "custom",
          path: ["exercises", index, "repsTarget"],
          message: "Informe as repetições como 8 ou 8-12.",
        });
        return z.NEVER;
      }
      let targetLoadKg: string | null = null;
      if (
        exercise.targetLoadKg !== undefined &&
        exercise.targetLoadKg !== null
      ) {
        const tenths = parseMassToTenths(exercise.targetLoadKg);
        if (tenths === null || tenths > LOAD_MAX_TENTHS) {
          context.addIssue({
            code: "custom",
            path: ["exercises", index, "targetLoadKg"],
            message: "A carga precisa ficar entre 0 e 1000 kg.",
          });
          return z.NEVER;
        }
        targetLoadKg = formatTenths(tenths);
      }
      exercises.push({
        exerciseId: exercise.exerciseId,
        setsCount: exercise.setsCount,
        repsMin: reps.data.repsMin,
        repsMax: reps.data.repsMax,
        targetLoadKg,
        restSeconds: exercise.restSeconds,
      });
    }
    return {
      name: value.name,
      notes: value.notes ?? null,
      exercises,
    };
  });

export const sessionStartSchema = z
  .object({
    workoutId: z.uuid().nullable().optional(),
    name: z.string().trim().min(1).max(80).nullable().optional(),
  })
  .strict();

export const setInputSchema = z
  .object({
    setId: z.uuid(),
    loadKg: z.union([z.string(), z.number(), z.null()]),
    reps: z.number().int().min(0).max(999).nullable(),
    completed: z.boolean(),
  })
  .strict()
  .transform((value, context) => {
    if (value.loadKg === null) {
      return { ...value, loadKg: null };
    }
    const tenths = parseMassToTenths(value.loadKg);
    if (tenths === null || tenths > 10_000) {
      context.addIssue({
        code: "custom",
        message: "A carga precisa ficar entre 0 e 1000 kg.",
      });
      return z.NEVER;
    }
    return { ...value, loadKg: formatTenths(tenths) };
  });

export type ProfileInput = z.infer<ReturnType<typeof createProfileInputSchema>>;
export type WeightInput = z.output<typeof weightInputSchema>;
export type ExerciseInput = z.infer<typeof exerciseInputSchema>;
export type WorkoutInput = z.output<typeof workoutInputSchema>;
export type SessionStartInput = z.infer<typeof sessionStartSchema>;
export type SetInput = z.output<typeof setInputSchema>;
