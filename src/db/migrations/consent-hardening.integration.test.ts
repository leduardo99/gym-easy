// @vitest-environment node
import { readFileSync } from "node:fs";

import postgres from "postgres";
import { describe, expect, it } from "vitest";

import { isLocalDatabaseUrl } from "@/db/driver";

const superuserUrl = process.env.DATABASE_URL_SUPERUSER ?? "";
const runIntegration =
  superuserUrl.length > 0 && isLocalDatabaseUrl(superuserUrl);

const dropPurgeRole = `
DO $$
DECLARE
  "fn" record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'gym_easy_purge') THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'gym_easy_app') THEN
    BEGIN
      EXECUTE 'REVOKE gym_easy_purge FROM gym_easy_app';
    EXCEPTION
      WHEN undefined_object THEN NULL;
    END;
  END IF;

  FOR "fn" IN
    SELECT n.nspname, p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE has_function_privilege('gym_easy_purge', p.oid, 'EXECUTE')
      AND n.nspname NOT IN ('pg_catalog', 'information_schema')
  LOOP
    EXECUTE format(
      'REVOKE ALL ON FUNCTION %I.%I(%s) FROM gym_easy_purge',
      "fn".nspname,
      "fn".proname,
      "fn".args
    );
  END LOOP;

  EXECUTE 'DROP ROLE gym_easy_purge';
END
$$;
`;

describe.skipIf(!runIntegration)("0010 bootstrap role guard", () => {
  it("fails the migration with the missing-role exception", async () => {
    const migration = readFileSync(
      "src/db/migrations/0010_consent_hardening.sql",
      "utf8",
    );
    const guard = migration.split("--> statement-breakpoint")[0] ?? "";
    const sql = postgres(superuserUrl, { max: 1 });

    try {
      await expect(
        sql.begin(async (tx) => {
          await tx.unsafe(dropPurgeRole);
          await tx.unsafe(guard);
        }),
      ).rejects.toThrow(
        /0010_consent_hardening: missing bootstrap role\(s\): gym_easy_purge/,
      );
    } finally {
      await sql.end({ timeout: 5 });
    }
  });

  it("fails the migration when a bootstrap role has CREATEROLE", async () => {
    const migration = readFileSync(
      "src/db/migrations/0010_consent_hardening.sql",
      "utf8",
    );
    const guard = migration.split("--> statement-breakpoint")[0] ?? "";
    const sql = postgres(superuserUrl, { max: 1 });

    try {
      await expect(
        sql.begin(async (tx) => {
          await tx.unsafe("ALTER ROLE gym_easy_app CREATEROLE");
          await tx.unsafe(guard);
        }),
      ).rejects.toThrow(
        /0010_consent_hardening: bootstrap role\(s\) exceed least privilege: gym_easy_app \(rolcreaterole\)/,
      );
    } finally {
      await sql.end({ timeout: 5 });
    }
  });
});
