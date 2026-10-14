import { existsSync } from "node:fs";

const migrationsFolder = existsSync("/app/migrations/meta/_journal.json")
  ? "/app/migrations"
  : "src/db/migrations";

if (process.env.RUN_MIGRATIONS !== "true") {
  console.log("migrate-on-deploy: skipped");
  process.exit(0);
}

const databaseUrl =
  process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "";

if (
  !databaseUrl.startsWith("postgres://") &&
  !databaseUrl.startsWith("postgresql://")
) {
  console.error("migrate-on-deploy: set DATABASE_URL_UNPOOLED or DATABASE_URL");
  process.exit(1);
}

if (databaseUrl.includes("-pooler")) {
  console.error(
    "migrate-on-deploy: refused a pooled host. Use the direct Neon host.",
  );
  process.exit(1);
}

const { Pool } = await import("pg");
const { drizzle } = await import("drizzle-orm/node-postgres");
const { migrate } = await import("drizzle-orm/node-postgres/migrator");

const pool = new Pool({ connectionString: databaseUrl, max: 1 });

try {
  await migrate(drizzle({ client: pool }), { migrationsFolder });
  console.log("migrate-on-deploy: applied");
} finally {
  await pool.end();
}
