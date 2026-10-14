import type { CatalogExercise } from "../catalog";
import { normalizeExerciseName } from "@/features/training/normalize";

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function enumArray(typeName: string, values: readonly string[]): string {
  if (values.length === 0) return `ARRAY[]::"${typeName}"[]`;
  return `ARRAY[${values.map(sqlString).join(", ")}]::"${typeName}"[]`;
}

export function renderExerciseSeedSql(
  exercises: readonly CatalogExercise[],
): string {
  const values = exercises
    .map((exercise) => {
      const normalized = normalizeExerciseName(exercise.name);
      return `  (${[
        sqlString(exercise.name),
        sqlString(normalized),
        sqlString(exercise.muscleGroup),
        sqlString(exercise.equipment),
        sqlString(exercise.slug),
        sqlString(exercise.movementPattern),
        enumArray("muscle", exercise.primaryMuscles),
        enumArray("muscle", exercise.secondaryMuscles),
        sqlString(exercise.level),
        enumArray("body_region", exercise.contraindicatedRegions),
        exercise.unilateral ? "true" : "false",
        String(exercise.defaultRepsMin),
        String(exercise.defaultRepsMax),
        enumArray("text", exercise.substitutions),
      ].join(", ")})`;
    })
    .join(",\n");

  return `INSERT INTO "exercises" ("name", "normalized_name", "muscle_group", "equipment", "slug", "movement_pattern", "primary_muscles", "secondary_muscles", "level", "contraindicated_regions", "unilateral", "default_reps_min", "default_reps_max", "substitution_slugs")
VALUES
${values}
ON CONFLICT ("slug") WHERE "exercises"."owner_user_id" is null DO NOTHING;
`;
}
