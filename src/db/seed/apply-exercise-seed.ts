import { sql } from "drizzle-orm";

import { CATALOG_EXERCISES } from "../catalog";
import { renderExerciseCatalogUpsertSql } from "./render-exercise-seed";

type Executable = {
  execute: (query: ReturnType<typeof sql.raw>) => Promise<unknown>;
};

export async function applyExerciseSeed(db: Executable): Promise<void> {
  await db.execute(sql.raw(renderExerciseCatalogUpsertSql(CATALOG_EXERCISES)));
}
