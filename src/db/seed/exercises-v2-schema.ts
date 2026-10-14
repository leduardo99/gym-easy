import { z } from "zod";

import {
  BODY_REGIONS,
  EQUIPMENT,
  MOVEMENT_PATTERNS,
  MUSCLES,
} from "@/db/catalog";
import { LEVEL_VALUES } from "@/db/domain";

const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(_[a-z0-9]+)*$/)
  .max(80);

export const exerciseSeedSchema = z
  .object({
    version: z.literal("2026-10-14.v2"),
    count: z.literal(136),
    exercises: z
      .array(
        z
          .object({
            id: slugSchema,
            name_pt: z.string().trim().min(2).max(60),
            movement_pattern: z.enum(MOVEMENT_PATTERNS),
            primary_muscles: z.array(z.enum(MUSCLES)).min(1).max(4),
            secondary_muscles: z.array(z.enum(MUSCLES)).max(6),
            equipment: z.enum(EQUIPMENT),
            level: z.enum(LEVEL_VALUES),
            contraindicated_regions: z.array(z.enum(BODY_REGIONS)).max(4),
            unilateral: z.boolean(),
            default_rep_range: z.tuple([
              z.number().int().min(1).max(999),
              z.number().int().min(1).max(999),
            ]),
            substitutions: z.array(slugSchema).max(3),
          })
          .strict(),
      )
      .length(136),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.exercises.length !== value.count) {
      context.addIssue({
        code: "custom",
        message: "count precisa ser igual ao número de exercícios.",
      });
    }
    const ids = new Set<string>();
    for (const [index, exercise] of value.exercises.entries()) {
      if (ids.has(exercise.id)) {
        context.addIssue({
          code: "custom",
          message: `id duplicado: ${exercise.id}.`,
          path: ["exercises", index, "id"],
        });
      }
      ids.add(exercise.id);
      const [min, max] = exercise.default_rep_range;
      if (min > max) {
        context.addIssue({
          code: "custom",
          message: "A faixa de repetições precisa ir do menor para o maior.",
          path: ["exercises", index, "default_rep_range"],
        });
      }
    }
    for (const [index, exercise] of value.exercises.entries()) {
      for (const [subIndex, substitution] of exercise.substitutions.entries()) {
        if (!ids.has(substitution)) {
          context.addIssue({
            code: "custom",
            message: `Substituição inexistente: ${substitution}.`,
            path: ["exercises", index, "substitutions", subIndex],
          });
        }
      }
    }
  });

export type ExerciseSeed = z.infer<typeof exerciseSeedSchema>;
