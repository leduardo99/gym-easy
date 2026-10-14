ALTER TABLE "consent_log" DROP CONSTRAINT "consent_log_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "consent_log" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "consent_log" ADD COLUMN "subject_pseudonym" text;--> statement-breakpoint
ALTER TABLE "consent_log" ADD COLUMN "key_version" smallint;--> statement-breakpoint
ALTER TABLE "consent_log" ADD COLUMN "deleted_account_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "consent_log" ADD CONSTRAINT "consent_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_log" ADD CONSTRAINT "consent_log_id_user_id_unique" UNIQUE("id","user_id");--> statement-breakpoint
ALTER TABLE "consent_log" ADD CONSTRAINT "consent_log_retention_shape" CHECK ((
        "consent_log"."user_id" is not null
        and "consent_log"."subject_pseudonym" is null
        and "consent_log"."key_version" is null
        and "consent_log"."deleted_account_at" is null
      ) or (
        "consent_log"."user_id" is null
        and "consent_log"."subject_pseudonym" ~ '^[a-f0-9]{64}$'
        and "consent_log"."key_version" >= 1
        and "consent_log"."deleted_account_at" is not null
      ));--> statement-breakpoint
CREATE OR REPLACE FUNCTION "consent_log_reject_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  "retention_op" text := current_setting('gym_easy.consent_retention', true);
BEGIN
  IF "retention_op" = 'delete' AND TG_OP = 'UPDATE' THEN
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

  IF "retention_op" = 'purge' AND TG_OP = 'DELETE' THEN
    IF OLD."user_id" IS NULL
      AND OLD."subject_pseudonym" IS NOT NULL
      AND OLD."deleted_account_at" IS NOT NULL
    THEN
      RETURN OLD;
    END IF;
  END IF;

  RAISE EXCEPTION 'consent_log is append-only' USING ERRCODE = '55000';
END;
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION "users_require_consent_pseudonym"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "consent_log"
    WHERE "user_id" = OLD."id"
  ) THEN
    RAISE EXCEPTION 'consent proof must be pseudonymized before account deletion'
      USING ERRCODE = '23514';
  END IF;
  RETURN OLD;
END;
$$;--> statement-breakpoint
DROP TRIGGER IF EXISTS "users_consent_proof_before_delete" ON "users";--> statement-breakpoint
CREATE TRIGGER "users_consent_proof_before_delete"
BEFORE DELETE ON "users"
FOR EACH ROW
EXECUTE FUNCTION "users_require_consent_pseudonym"();--> statement-breakpoint
CREATE OR REPLACE FUNCTION "delete_account"(
  "p_user_id" uuid,
  "p_pseudonym" text,
  "p_key_version" smallint,
  "p_deleted_at" timestamp with time zone DEFAULT now()
)
RETURNS void
LANGUAGE plpgsql
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

  PERFORM set_config('gym_easy.consent_retention', 'delete', true);

  UPDATE "consent_log"
  SET
    "subject_pseudonym" = "p_pseudonym",
    "key_version" = "p_key_version",
    "deleted_account_at" = "p_deleted_at",
    "user_id" = NULL
  WHERE "user_id" = "p_user_id";

  DELETE FROM "users" WHERE "id" = "p_user_id";
END;
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION "purge_expired_consent_proofs"("p_cutoff" timestamp with time zone)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  "removed" integer;
BEGIN
  IF "p_cutoff" IS NULL THEN
    RAISE EXCEPTION 'invalid consent purge cutoff' USING ERRCODE = '22023';
  END IF;

  PERFORM set_config('gym_easy.consent_retention', 'purge', true);

  DELETE FROM "consent_log"
  WHERE "user_id" IS NULL
    AND "deleted_account_at" IS NOT NULL
    AND "deleted_account_at" < "p_cutoff";

  GET DIAGNOSTICS "removed" = ROW_COUNT;
  RETURN "removed";
END;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION "delete_account"(uuid, text, smallint, timestamp with time zone) FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION "purge_expired_consent_proofs"(timestamp with time zone) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "delete_account"(uuid, text, smallint, timestamp with time zone) TO CURRENT_USER;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "purge_expired_consent_proofs"(timestamp with time zone) TO CURRENT_USER;