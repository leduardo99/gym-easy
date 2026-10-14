CREATE TYPE "public"."body_region" AS ENUM('shoulder', 'elbow', 'wrist', 'neck', 'lumbar_spine', 'hip', 'knee', 'ankle');--> statement-breakpoint
CREATE TYPE "public"."movement_pattern" AS ENUM('horizontal_push', 'vertical_push', 'horizontal_pull', 'vertical_pull', 'squat', 'hip_hinge', 'lunge', 'core', 'isolation', 'carry');--> statement-breakpoint
CREATE TYPE "public"."muscle" AS ENUM('pectoralis', 'latissimus', 'rhomboids', 'upper_trapezius', 'middle_trapezius', 'erector_spinae', 'anterior_deltoid', 'lateral_deltoid', 'posterior_deltoid', 'rotator_cuff', 'biceps', 'triceps', 'forearms', 'quadriceps', 'hamstrings', 'glutes', 'gluteus_medius', 'adductors', 'hip_flexors', 'calves', 'soleus', 'abdominals', 'obliques');--> statement-breakpoint
ALTER TYPE "public"."equipment" RENAME TO "equipment_old";--> statement-breakpoint
CREATE TYPE "public"."equipment" AS ENUM('barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell', 'band', 'other', 'smith', 'accessory');--> statement-breakpoint
ALTER TABLE "exercises" ALTER COLUMN "equipment" TYPE "public"."equipment" USING "equipment"::text::"public"."equipment";--> statement-breakpoint
DROP TYPE "public"."equipment_old";--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "movement_pattern" "movement_pattern";--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "primary_muscles" "muscle"[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "secondary_muscles" "muscle"[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "level" "training_level";--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "contraindicated_regions" "body_region"[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "unilateral" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "default_reps_min" smallint;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "default_reps_max" smallint;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "substitution_slugs" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "exercises_catalog_slug_unique" ON "exercises" USING btree ("slug") WHERE "exercises"."owner_user_id" is null;--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_slug_format" CHECK ("exercises"."slug" is null or "exercises"."slug" ~ '^[a-z0-9]+(_[a-z0-9]+)*$');--> statement-breakpoint
DELETE FROM "exercises" WHERE "owner_user_id" IS NULL AND "slug" IS NULL;--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_catalog_metadata" CHECK ("exercises"."owner_user_id" is not null or (
        "exercises"."slug" is not null
        and "exercises"."movement_pattern" is not null
        and "exercises"."level" is not null
        and cardinality("exercises"."primary_muscles") >= 1
        and "exercises"."default_reps_min" is not null
        and "exercises"."default_reps_max" is not null
        and "exercises"."default_reps_min" between 1 and "exercises"."default_reps_max"
        and "exercises"."default_reps_max" <= 999
        and cardinality("exercises"."substitution_slugs") <= 3
      ));