import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { CATALOG_EXERCISES } from "../catalog";
import { renderExerciseSeedSql } from "./render-exercise-seed";

describe("renderExerciseSeedSql", () => {
  const sql = renderExerciseSeedSql(CATALOG_EXERCISES);

  it("inserts the catalog once and does nothing when the name already exists", () => {
    expect(sql).toContain('INSERT INTO "exercises"');
    expect(sql).toContain(
      'ON CONFLICT ("normalized_name") WHERE "exercises"."owner_user_id" is null DO NOTHING',
    );
    expect(sql.match(/INSERT INTO/g)).toHaveLength(1);
  });

  it("escapes quotes and includes every catalog name once", () => {
    const quoted = renderExerciseSeedSql([
      {
        name: "Rosca d'água (barra)",
        muscleGroup: "biceps",
        equipment: "barbell",
      },
    ]);
    expect(quoted).toContain("'Rosca d''água (barra)'");

    for (const exercise of CATALOG_EXERCISES) {
      const occurrences = sql.split(exercise.name).length - 1;
      expect(occurrences).toBe(1);
    }
  });

  it("matches the versioned seed migration", () => {
    const migration = readFileSync(
      "src/db/migrations/0002_seed_exercises.sql",
      "utf8",
    );
    expect(migration.trim()).toBe(sql.trim());
  });
});
