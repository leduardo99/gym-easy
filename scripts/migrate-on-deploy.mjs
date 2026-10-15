import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { databaseTlsErrors } from "../src/db/database-tls.mjs";

const migrationsFolder = existsSync("/app/migrations/meta/_journal.json")
  ? "/app/migrations"
  : "src/db/migrations";

/** Session lock so two containers do not migrate at the same time. */
const MIGRATION_LOCK_KEY = 55055055;

const MIGRATOR_ROLE = "gym_easy_migrator";

export class DeployPrivilegeError extends Error {
  constructor(message) {
    super(message);
    this.name = "DeployPrivilegeError";
  }
}

function privilegeGranted(value) {
  return value === true || value === "t" || value === "true";
}

/**
 * @param {Record<string, unknown> | undefined} row
 * @returns {string[]}
 */
export function consentPrivilegeFailures(row) {
  if (!row) return ["consent privilege check returned no row"];
  const failures = [];
  if (privilegeGranted(row.app_update)) {
    failures.push("gym_easy_app still has UPDATE on consent_log");
  }
  if (privilegeGranted(row.app_delete)) {
    failures.push("gym_easy_app still has DELETE on consent_log");
  }
  if (privilegeGranted(row.app_truncate)) {
    failures.push("gym_easy_app still has TRUNCATE on consent_log");
  }
  if (privilegeGranted(row.app_purge_expired)) {
    failures.push("gym_easy_app can EXECUTE purge_expired_consent_proofs");
  }
  if (row.table_owner !== MIGRATOR_ROLE) {
    failures.push(
      `consent_log owner is ${String(row.table_owner ?? "missing")}, expected ${MIGRATOR_ROLE}`,
    );
  }
  if (row.delete_owner !== MIGRATOR_ROLE) {
    failures.push(
      `delete_account owner is ${String(row.delete_owner ?? "missing")}, expected ${MIGRATOR_ROLE}`,
    );
  }
  if (row.purge_owner !== MIGRATOR_ROLE) {
    failures.push(
      `purge_consent_proofs owner is ${String(row.purge_owner ?? "missing")}, expected ${MIGRATOR_ROLE}`,
    );
  }
  return failures;
}

async function assertConsentPrivileges(sql) {
  const rows = await sql`
    select
      has_table_privilege('gym_easy_app', 'public.consent_log', 'UPDATE') as app_update,
      has_table_privilege('gym_easy_app', 'public.consent_log', 'DELETE') as app_delete,
      has_table_privilege('gym_easy_app', 'public.consent_log', 'TRUNCATE') as app_truncate,
      has_function_privilege(
        'gym_easy_app',
        'public.purge_expired_consent_proofs(timestamp with time zone)',
        'EXECUTE'
      ) as app_purge_expired,
      pg_catalog.pg_get_userbyid(c.relowner) as table_owner,
      (
        select r.rolname
        from pg_catalog.pg_proc p
        join pg_catalog.pg_namespace n on n.oid = p.pronamespace
        join pg_catalog.pg_roles r on r.oid = p.proowner
        where n.nspname = 'public'
          and p.proname = 'delete_account'
        order by p.oid
        limit 1
      ) as delete_owner,
      (
        select r.rolname
        from pg_catalog.pg_proc p
        join pg_catalog.pg_namespace n on n.oid = p.pronamespace
        join pg_catalog.pg_roles r on r.oid = p.proowner
        where n.nspname = 'public'
          and p.proname = 'purge_consent_proofs'
        order by p.oid
        limit 1
      ) as purge_owner
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace ns on ns.oid = c.relnamespace
    where ns.nspname = 'public'
      and c.relname = 'consent_log'
  `;
  const failures = consentPrivilegeFailures(rows[0]);
  if (failures.length > 0) {
    throw new DeployPrivilegeError(`migrate-on-deploy: ${failures.join("; ")}`);
  }
}

async function main() {
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
  if (migratorUser !== MIGRATOR_ROLE) {
    console.error(
      "migrate-on-deploy: DATABASE_URL_MIGRATOR must use gym_easy_migrator",
    );
    process.exit(1);
  }

  const tlsErrors = databaseTlsErrors({
    nodeEnv: process.env.NODE_ENV,
    tlsMode: process.env.DB_TLS_MODE,
    urls: [
      { label: "DATABASE_URL_MIGRATOR", url: databaseUrl },
      { label: "DATABASE_URL", url: process.env.DATABASE_URL },
    ],
  });
  if (tlsErrors.length > 0) {
    console.error(`migrate-on-deploy: ${tlsErrors.join("; ")}`);
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
      await assertConsentPrivileges(sql);
      console.log("migrate-on-deploy: applied");
    } finally {
      await sql`select pg_advisory_unlock(${MIGRATION_LOCK_KEY})`;
    }
  } catch (error) {
    failed = true;
    if (error instanceof DeployPrivilegeError) {
      console.error(error.message);
    } else {
      console.error(
        "migrate-on-deploy: failed",
        error instanceof Error ? error.name : "error",
      );
    }
  } finally {
    await sql.end({ timeout: 5 });
  }

  if (failed) process.exit(1);
}

const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === entry) {
  await main();
}
