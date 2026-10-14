import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { CATALOG_EXERCISES, type CatalogExercise } from "../catalog";
import { renderExerciseSeedSql } from "./render-exercise-seed";

const source = CATALOG_EXERCISES[0];
if (source === undefined) {
  throw new Error("Catálogo vazio.");
}

const quotedExercise: CatalogExercise = {
  ...source,
  name: "Rosca d'água",
  slug: "example_curl",
  substitutions: [],
  primaryMuscles: ["biceps"],
  secondaryMuscles: [],
  contraindicatedRegions: [],
};

describe("renderExerciseSeedSql", () => {
  const sql = renderExerciseSeedSql(CATALOG_EXERCISES);

  it("inserts the catalog once and does nothing when the slug already exists", () => {
    expect(sql).toContain('INSERT INTO "exercises"');
    expect(sql).toContain(
      'ON CONFLICT ("slug") WHERE "exercises"."owner_user_id" is null DO NOTHING',
    );
    expect(sql.match(/INSERT INTO/g)).toHaveLength(1);
    expect(sql.match(/^\s+\(/gm)).toHaveLength(CATALOG_EXERCISES.length);
  });

  it("escapes quotes and writes one row per slug", () => {
    const quoted = renderExerciseSeedSql([quotedExercise]);
    expect(quoted).toContain("'Rosca d''água'");
    expect(quoted).toContain("'example_curl'");

    for (const exercise of CATALOG_EXERCISES) {
      expect(sql).toContain(`'${exercise.slug}'`);
    }
  });

  it("matches the versioned seed migration", () => {
    const migration = readFileSync(
      "src/db/migrations/0007_catalog_v2.sql",
      "utf8",
    );
    expect(migration).toContain(sql.trim());
    const removeOld = migration.indexOf(
      'DELETE FROM "exercises" WHERE "owner_user_id" IS NULL',
    );
    expect(removeOld).toBeGreaterThan(-1);
    expect(migration.indexOf('INSERT INTO "exercises"')).toBeGreaterThan(
      removeOld,
    );
  });

  it("drops the previous catalog before the metadata check", () => {
    const migration = readFileSync(
      "src/db/migrations/0005_catalog_exercises.sql",
      "utf8",
    );
    const removeOld = migration.indexOf(
      'DELETE FROM "exercises" WHERE "owner_user_id" IS NULL AND "slug" IS NULL',
    );
    const metadataCheck = migration.indexOf(
      'ADD CONSTRAINT "exercises_catalog_metadata"',
    );
    expect(removeOld).toBeGreaterThan(-1);
    expect(metadataCheck).toBeGreaterThan(removeOld);
  });
});
