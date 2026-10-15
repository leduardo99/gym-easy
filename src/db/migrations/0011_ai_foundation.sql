ALTER TYPE "public"."consent_purpose" ADD VALUE 'coach_chat';--> statement-breakpoint
CREATE TABLE "ai_generation_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" text NOT NULL,
	"user_id_hash" text NOT NULL,
	"model" text,
	"data_policy" text,
	"latency_ms" integer NOT NULL,
	"tokens_in" integer,
	"tokens_out" integer,
	"outcome" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_generation_logs_user_hash" CHECK ("ai_generation_logs"."user_id_hash" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "ai_generation_logs_outcome" CHECK ("ai_generation_logs"."outcome" in ('ok', 'timeout', 'provider_error', 'schema_invalid', 'validation_rejected', 'safety_block', 'rate_limited', 'internal')),
	CONSTRAINT "ai_generation_logs_data_policy" CHECK ("ai_generation_logs"."data_policy" is null or "ai_generation_logs"."data_policy" in ('zdr', 'any_free')),
	CONSTRAINT "ai_generation_logs_latency_nonnegative" CHECK ("ai_generation_logs"."latency_ms" >= 0)
);
--> statement-breakpoint
CREATE TABLE "coach_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"risk" text,
	"model" text,
	"data_policy" text,
	"prompt_version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coach_messages_role" CHECK ("coach_messages"."role" in ('user', 'assistant')),
	CONSTRAINT "coach_messages_content_length" CHECK (char_length("coach_messages"."content") between 1 and 8000),
	CONSTRAINT "coach_messages_risk" CHECK ("coach_messages"."risk" is null or "coach_messages"."risk" in ('none', 'caution', 'red_flag')),
	CONSTRAINT "coach_messages_data_policy" CHECK ("coach_messages"."data_policy" is null or "coach_messages"."data_policy" in ('zdr', 'any_free'))
);
--> statement-breakpoint
CREATE TABLE "coach_red_flag_locks" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"cleared_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "plan_change_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text DEFAULT 'proposed' NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plan_change_proposals_status" CHECK ("plan_change_proposals"."status" in ('proposed', 'confirmed', 'rejected', 'expired'))
);
--> statement-breakpoint
ALTER TABLE "coach_messages" ADD CONSTRAINT "coach_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_red_flag_locks" ADD CONSTRAINT "coach_red_flag_locks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_change_proposals" ADD CONSTRAINT "plan_change_proposals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_generation_logs_created_idx" ON "ai_generation_logs" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "coach_messages_user_created_idx" ON "coach_messages" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "plan_change_proposals_user_created_idx" ON "plan_change_proposals" USING btree ("user_id","created_at" DESC NULLS LAST);