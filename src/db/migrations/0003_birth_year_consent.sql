CREATE TYPE "public"."consent_action" AS ENUM('granted', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."consent_purpose" AS ENUM('body_data', 'coach_health', 'analytics');--> statement-breakpoint
CREATE TYPE "public"."consent_source" AS ENUM('onboarding', 'profile', 'reconsent');--> statement-breakpoint
CREATE TYPE "public"."training_place" AS ENUM('full_gym', 'dumbbells', 'home', 'bodyweight');--> statement-breakpoint
ALTER TYPE "public"."goal" ADD VALUE 'health';--> statement-breakpoint
CREATE TABLE "consent_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"purpose" "consent_purpose" NOT NULL,
	"action" "consent_action" NOT NULL,
	"version" text NOT NULL,
	"text_sha256" text NOT NULL,
	"source" "consent_source" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "consent_log_version_length" CHECK (char_length("consent_log"."version") between 1 and 80),
	CONSTRAINT "consent_log_text_sha256_hex" CHECK ("consent_log"."text_sha256" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "birth_year" smallint;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "days_per_week" integer;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "session_minutes" integer;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "training_place" "training_place";--> statement-breakpoint
ALTER TABLE "consent_log" ADD CONSTRAINT "consent_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "consent_log_user_purpose_created_idx" ON "consent_log" USING btree ("user_id","purpose","created_at" DESC NULLS LAST);--> statement-breakpoint
UPDATE "user_profiles"
SET "birth_year" = extract(year from "birth_date")::smallint
WHERE "birth_date" is not null;--> statement-breakpoint
ALTER TABLE "user_profiles" DROP COLUMN "birth_date";--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_birth_year_range" CHECK ("user_profiles"."birth_year" is null or "user_profiles"."birth_year" between extract(year from now()) - 100 and extract(year from now()));--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_days_per_week_range" CHECK ("user_profiles"."days_per_week" is null or "user_profiles"."days_per_week" between 2 and 6);--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_session_minutes" CHECK ("user_profiles"."session_minutes" is null or "user_profiles"."session_minutes" in (30, 45, 60, 75, 90));--> statement-breakpoint
CREATE OR REPLACE FUNCTION "consent_log_reject_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF pg_trigger_depth() > 1 AND TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'consent_log is append-only' USING ERRCODE = '55000';
END;
$$;--> statement-breakpoint
CREATE TRIGGER "consent_log_append_only"
BEFORE UPDATE OR DELETE ON "consent_log"
FOR EACH ROW
EXECUTE FUNCTION "consent_log_reject_mutation"();--> statement-breakpoint
REVOKE UPDATE, DELETE ON "consent_log" FROM PUBLIC;