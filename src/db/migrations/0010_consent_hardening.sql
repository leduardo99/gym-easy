-- Roles come from the Infra bootstrap. gym_easy_migrator has no CREATEROLE
-- and no ADMIN OPTION, so this migration must not create roles or grant a
-- role to another role. GRANT EXECUTE below is allowed because the migrator
-- owns the functions.
DO $$
DECLARE
  "missing" text;
BEGIN
  SELECT string_agg("role_name", ', ' ORDER BY "role_name")
  INTO "missing"
  FROM (
    VALUES ('gym_easy_app'), ('gym_easy_purge')
  ) AS "required"("role_name")
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_roles
    WHERE pg_catalog.pg_roles.rolname = "required"."role_name"
  );

  IF "missing" IS NOT NULL THEN
    RAISE EXCEPTION '0010_consent_hardening: missing bootstrap role(s): %. Create gym_easy_app and gym_easy_purge before migrating', "missing";
  END IF;
END
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "consent_log_reject_mutation"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  "definer" name;
BEGIN
  SELECT r.rolname
  INTO "definer"
  FROM pg_catalog.pg_proc p
  JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
  JOIN pg_catalog.pg_roles r ON r.oid = p.proowner
  WHERE n.nspname = 'public'
    AND p.proname = CASE TG_OP
      WHEN 'UPDATE' THEN 'delete_account'
      ELSE 'purge_consent_proofs'
    END
    AND p.prosecdef
  ORDER BY p.oid
  LIMIT 1;

  IF "definer" IS NOT NULL AND current_user = "definer" AND TG_OP = 'UPDATE' THEN
    IF NEW."id" IS NOT DISTINCT FROM OLD."id"
      AND NEW."purpose" IS NOT DISTINCT FROM OLD."purpose"
      AND NEW."action" IS NOT DISTINCT FROM OLD."action"
      AND NEW."version" IS NOT DISTINCT FROM OLD."version"
      AND NEW."text_sha256" IS NOT DISTINCT FROM OLD."text_sha256"
      AND NEW."source" IS NOT DISTINCT FROM OLD."source"
      AND NEW."created_at" IS NOT DISTINCT FROM OLD."created_at"
      AND OLD."user_id" IS NOT NULL
      AND NEW."user_id" IS NULL
      AND OLD."subject_pseudonym" IS NULL
      AND NEW."subject_pseudonym" ~ '^[a-f0-9]{64}$'
      AND OLD."key_version" IS NULL
      AND NEW."key_version" IS NOT NULL
      AND NEW."key_version" >= 1
      AND OLD."deleted_account_at" IS NULL
      AND NEW."deleted_account_at" IS NOT NULL
    THEN
      RETURN NEW;
    END IF;
  END IF;

  IF "definer" IS NOT NULL AND current_user = "definer" AND TG_OP = 'DELETE' THEN
    IF OLD."user_id" IS NULL
      AND OLD."subject_pseudonym" IS NOT NULL
      AND OLD."deleted_account_at" IS NOT NULL
    THEN
      RETURN OLD;
    END IF;
  END IF;

  RAISE EXCEPTION 'consent_log is append-only' USING ERRCODE = '55000';
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "delete_account"(
  "p_user_id" uuid,
  "p_pseudonym" text,
  "p_key_version" smallint,
  "p_deleted_at" timestamp with time zone DEFAULT now()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF "p_pseudonym" !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'invalid consent pseudonym' USING ERRCODE = '22023';
  END IF;
  IF "p_key_version" IS NULL OR "p_key_version" < 1 THEN
    RAISE EXCEPTION 'invalid consent key version' USING ERRCODE = '22023';
  END IF;
  IF "p_deleted_at" IS NULL THEN
    RAISE EXCEPTION 'invalid consent deletion time' USING ERRCODE = '22023';
  END IF;

  UPDATE "consent_log"
  SET
    "subject_pseudonym" = "p_pseudonym",
    "key_version" = "p_key_version",
    "deleted_account_at" = "p_deleted_at",
    "user_id" = NULL
  WHERE "user_id" = "p_user_id";

  DELETE FROM "users" WHERE "id" = "p_user_id";
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "purge_expired_consent_proofs"("p_cutoff" timestamp with time zone)
RETURNS integer
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  "removed" integer;
BEGIN
  IF "p_cutoff" IS NULL THEN
    RAISE EXCEPTION 'invalid consent purge cutoff' USING ERRCODE = '22023';
  END IF;

  DELETE FROM "consent_log"
  WHERE "user_id" IS NULL
    AND "deleted_account_at" IS NOT NULL
    AND "deleted_account_at" < "p_cutoff";

  GET DIAGNOSTICS "removed" = ROW_COUNT;
  RETURN "removed";
END;
$$;
--> statement-breakpoint
REVOKE UPDATE, DELETE, TRUNCATE ON "consent_log" FROM "gym_easy_app";
--> statement-breakpoint
ALTER FUNCTION "delete_account"(uuid, text, smallint, timestamp with time zone)
  SECURITY DEFINER SET search_path = pg_catalog, public;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "delete_account"(uuid, text, smallint, timestamp with time zone) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "delete_account"(uuid, text, smallint, timestamp with time zone) TO "gym_easy_app";
--> statement-breakpoint
REVOKE ALL ON FUNCTION "purge_expired_consent_proofs"(timestamp with time zone) FROM PUBLIC, "gym_easy_app";
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "purge_consent_proofs"()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$ BEGIN RETURN public."purge_expired_consent_proofs"(now() - interval '3 years'); END; $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "purge_consent_proofs"() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "purge_consent_proofs"() TO "gym_easy_purge";
