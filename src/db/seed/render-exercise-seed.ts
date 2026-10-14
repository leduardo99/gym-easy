import type { CatalogExercise } from "../catalog";
import { normalizeExerciseName } from "@/features/training/normalize";

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

export function renderExerciseSeedSql(
  exercises: readonly CatalogExercise[],
): string {
  const values = exercises
    .map((exercise) => {
      const normalized = normalizeExerciseName(exercise.name);
      return `  (${sqlString(exercise.name)}, ${sqlString(normalized)}, ${sqlString(exercise.muscleGroup)}, ${sqlString(exercise.equipment)})`;
    })
    .join(",\n");

  return `INSERT INTO "exercises" ("name", "normalized_name", "muscle_group", "equipment")
VALUES
${values}
ON CONFLICT ("normalized_name") WHERE "exercises"."owner_user_id" is null DO NOTHING;
`;
}
