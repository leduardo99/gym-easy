ALTER TABLE "ai_generation_logs" ADD COLUMN "served_with_zdr" boolean;--> statement-breakpoint
ALTER TABLE "ai_generation_logs" DROP CONSTRAINT "ai_generation_logs_outcome";--> statement-breakpoint
ALTER TABLE "ai_generation_logs" ADD CONSTRAINT "ai_generation_logs_outcome" CHECK ("ai_generation_logs"."outcome" in ('ok', 'timeout', 'provider_error', 'provider_policy_unavailable', 'coach_unavailable', 'plan_unavailable', 'schema_invalid', 'validation_rejected', 'safety_block', 'rate_limited', 'internal'));
