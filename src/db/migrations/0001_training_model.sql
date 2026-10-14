CREATE TYPE "public"."equipment" AS ENUM('barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell', 'band', 'other');--> statement-breakpoint
CREATE TYPE "public"."goal" AS ENUM('hypertrophy', 'strength', 'fat_loss', 'conditioning');--> statement-breakpoint
CREATE TYPE "public"."mass_unit" AS ENUM('kg', 'lb');--> statement-breakpoint
CREATE TYPE "public"."muscle_group" AS ENUM('chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms', 'quadriceps', 'hamstrings', 'glutes', 'calves', 'abs', 'full_body', 'cardio');--> statement-breakpoint
CREATE TYPE "public"."workout_session_status" AS ENUM('in_progress', 'completed');--> statement-breakpoint
CREATE TYPE "public"."sex" AS ENUM('male', 'female', 'undisclosed');--> statement-breakpoint
CREATE TYPE "public"."theme" AS ENUM('dark', 'light', 'system');--> statement-breakpoint
CREATE TYPE "public"."training_level" AS ENUM('beginner', 'intermediate', 'advanced');--> statement-breakpoint
CREATE TABLE "body_measurements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"recorded_on" date NOT NULL,
	"weight_kg" numeric(5, 1) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "body_measurements_user_day_unique" UNIQUE("user_id","recorded_on"),
	CONSTRAINT "body_measurements_weight_range" CHECK ("body_measurements"."weight_kg" between 29.0 and 301.0)
);
--> statement-breakpoint
CREATE TABLE "exercise_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_exercise_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"load_kg" numeric(6, 1),
	"reps" integer,
	"completed_at" timestamp with time zone,
	CONSTRAINT "exercise_sets_reps_range" CHECK ("exercise_sets"."reps" is null or "exercise_sets"."reps" between 0 and 999),
	CONSTRAINT "exercise_sets_load_range" CHECK ("exercise_sets"."load_kg" is null or ("exercise_sets"."load_kg" >= 0 and "exercise_sets"."load_kg" <= 1000)),
	CONSTRAINT "exercise_sets_position_nonnegative" CHECK ("exercise_sets"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"muscle_group" "muscle_group" NOT NULL,
	"equipment" "equipment" NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exercises_name_length" CHECK (char_length("exercises"."name") between 2 and 60),
	CONSTRAINT "exercises_catalog_not_archived" CHECK ("exercises"."owner_user_id" is not null or "exercises"."archived_at" is null)
);
--> statement-breakpoint
CREATE TABLE "session_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"rest_seconds" integer DEFAULT 90 NOT NULL,
	"notes" text,
	CONSTRAINT "session_exercises_id_user_unique" UNIQUE("id","user_id"),
	CONSTRAINT "session_exercises_position_nonnegative" CHECK ("session_exercises"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"birth_date" date,
	"sex" "sex",
	"height_cm" integer,
	"goal" "goal",
	"training_level" "training_level",
	"mass_unit" "mass_unit" DEFAULT 'kg' NOT NULL,
	"theme" "theme" DEFAULT 'dark' NOT NULL,
	"default_rest_seconds" integer DEFAULT 90 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_height_cm_range" CHECK ("user_profiles"."height_cm" is null or "user_profiles"."height_cm" between 100 and 250),
	CONSTRAINT "user_profiles_rest_range" CHECK ("user_profiles"."default_rest_seconds" between 15 and 600)
);
--> statement-breakpoint
CREATE TABLE "workout_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workout_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"sets_count" integer DEFAULT 3 NOT NULL,
	"reps_min" integer DEFAULT 10 NOT NULL,
	"reps_max" integer DEFAULT 10 NOT NULL,
	"target_load_kg" numeric(6, 1),
	"rest_seconds" integer DEFAULT 90 NOT NULL,
	CONSTRAINT "workout_exercises_sets_range" CHECK ("workout_exercises"."sets_count" between 1 and 20),
	CONSTRAINT "workout_exercises_reps_range" CHECK ("workout_exercises"."reps_min" between 1 and 999 and "workout_exercises"."reps_max" between 1 and 999 and "workout_exercises"."reps_min" <= "workout_exercises"."reps_max"),
	CONSTRAINT "workout_exercises_position_nonnegative" CHECK ("workout_exercises"."position" >= 0),
	CONSTRAINT "workout_exercises_rest_range" CHECK ("workout_exercises"."rest_seconds" between 15 and 600),
	CONSTRAINT "workout_exercises_load_range" CHECK ("workout_exercises"."target_load_kg" is null or ("workout_exercises"."target_load_kg" >= 0 and "workout_exercises"."target_load_kg" <= 1000))
);
--> statement-breakpoint
CREATE TABLE "workout_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"workout_id" uuid,
	"name" text NOT NULL,
	"status" "workout_session_status" DEFAULT 'in_progress' NOT NULL,
	"notes" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workout_sessions_id_user_unique" UNIQUE("id","user_id"),
	CONSTRAINT "workout_sessions_name_length" CHECK (char_length("workout_sessions"."name") between 1 and 80),
	CONSTRAINT "workout_sessions_finished_consistency" CHECK (("workout_sessions"."status" = 'completed' and "workout_sessions"."finished_at" is not null) or ("workout_sessions"."status" = 'in_progress' and "workout_sessions"."finished_at" is null))
);
--> statement-breakpoint
CREATE TABLE "workouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workouts_id_user_unique" UNIQUE("id","user_id"),
	CONSTRAINT "workouts_name_length" CHECK (char_length("workouts"."name") between 1 and 60)
);
--> statement-breakpoint
ALTER TABLE "body_measurements" ADD CONSTRAINT "body_measurements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_sets" ADD CONSTRAINT "exercise_sets_session_exercise_user_fk" FOREIGN KEY ("session_exercise_id","user_id") REFERENCES "public"."session_exercises"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_exercises" ADD CONSTRAINT "session_exercises_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_exercises" ADD CONSTRAINT "session_exercises_session_user_fk" FOREIGN KEY ("session_id","user_id") REFERENCES "public"."workout_sessions"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_workout_user_fk" FOREIGN KEY ("workout_id","user_id") REFERENCES "public"."workouts"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "exercise_sets_position_unique" ON "exercise_sets" USING btree ("session_exercise_id","position");--> statement-breakpoint
CREATE INDEX "exercise_sets_session_exercise_idx" ON "exercise_sets" USING btree ("session_exercise_id");--> statement-breakpoint
CREATE UNIQUE INDEX "exercises_catalog_normalized_name_unique" ON "exercises" USING btree ("normalized_name") WHERE "exercises"."owner_user_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "exercises_owner_normalized_name_unique" ON "exercises" USING btree ("owner_user_id","normalized_name") WHERE "exercises"."owner_user_id" is not null;--> statement-breakpoint
CREATE INDEX "exercises_owner_idx" ON "exercises" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "exercises_muscle_group_idx" ON "exercises" USING btree ("muscle_group");--> statement-breakpoint
CREATE UNIQUE INDEX "session_exercises_position_unique" ON "session_exercises" USING btree ("session_id","position");--> statement-breakpoint
CREATE INDEX "session_exercises_exercise_idx" ON "session_exercises" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "session_exercises_user_exercise_idx" ON "session_exercises" USING btree ("user_id","exercise_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workout_exercises_position_unique" ON "workout_exercises" USING btree ("workout_id","position");--> statement-breakpoint
CREATE INDEX "workout_exercises_exercise_idx" ON "workout_exercises" USING btree ("exercise_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workout_sessions_one_active_per_user" ON "workout_sessions" USING btree ("user_id") WHERE "workout_sessions"."status" = 'in_progress';--> statement-breakpoint
CREATE INDEX "workout_sessions_user_finished_idx" ON "workout_sessions" USING btree ("user_id","finished_at");--> statement-breakpoint
CREATE INDEX "workouts_user_updated_idx" ON "workouts" USING btree ("user_id","updated_at");