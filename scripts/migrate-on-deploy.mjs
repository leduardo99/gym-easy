import { existsSync } from "node:fs";

const migrationsFolder = existsSync("/app/migrations/meta/_journal.json")
  ? "/app/migrations"
  : "src/db/migrations";

/** Session lock so two containers do not migrate at the same time. */
const MIGRATION_LOCK_KEY = 55055055;

if (process.env.RUN_MIGRATIONS !== "true") {
  console.log("migrate-on-deploy: skipped");
  process.exit(0);
}

const databaseUrl = process.env.DATABASE_URL_MIGRATOR || "";

if (
  !databaseUrl.startsWith("postgres://") &&
  !databaseUrl.startsWith("postgresql://")
) {
  console.error("migrate-on-deploy: set DATABASE_URL_MIGRATOR");
  process.exit(1);
}

if (databaseUrl.includes("-pooler")) {
  console.error(
    "migrate-on-deploy: refused a pooled host. Use the direct host.",
  );
  process.exit(1);
}

let migratorUser = "";
try {
  migratorUser = decodeURIComponent(new URL(databaseUrl).username);
} catch {
  migratorUser = "";
}
if (migratorUser !== "gym_easy_migrator") {
  console.error(
    "migrate-on-deploy: DATABASE_URL_MIGRATOR must use gym_easy_migrator",
  );
  process.exit(1);
}

const postgres = (await import("postgres")).default;
const { drizzle } = await import("drizzle-orm/postgres-js");
const { migrate } = await import("drizzle-orm/postgres-js/migrator");

const sql = postgres(databaseUrl, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
  connection: { statement_timeout: 60_000 },
});

let failed = false;

try {
  await sql`select pg_advisory_lock(${MIGRATION_LOCK_KEY})`;
  try {
    await migrate(drizzle(sql), { migrationsFolder });
    console.log("migrate-on-deploy: applied");
  } finally {
    await sql`select pg_advisory_unlock(${MIGRATION_LOCK_KEY})`;
  }
} catch (error) {
  failed = true;
  console.error(
    "migrate-on-deploy: failed",
    error instanceof Error ? error.name : "error",
  );
} finally {
  await sql.end({ timeout: 5 });
}

if (failed) process.exit(1);
