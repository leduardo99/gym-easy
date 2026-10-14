import { sql } from "drizzle-orm";
import {
  check,
  date,
  foreignKey,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { EQUIPMENT, MUSCLE_GROUPS } from "./catalog";
import {
  GOAL_VALUES,
  LEVEL_VALUES,
  MASS_UNIT_VALUES,
  SESSION_STATUS_VALUES,
  SEX_VALUES,
  THEME_VALUES,
} from "./domain";

/**
 * Drizzle schema entrypoint.
 *
 * Domain tables are declared here so drizzle-kit keeps a single schema path.
 */

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  onboardingCompletedAt: timestamp("onboarding_completed_at", {
    withTimezone: true,
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);

export const emailVerificationTokens = pgTable(
  "email_verification_tokens",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("email_verification_tokens_user_id_idx").on(table.userId)],
);

export const authRateLimits = pgTable("auth_rate_limits", {
  bucket: text("bucket").primaryKey(),
  hits: integer("hits").notNull(),
  windowStartedAt: timestamp("window_started_at", {
    withTimezone: true,
  }).notNull(),
});

export const sexEnum = pgEnum("sex", SEX_VALUES);
export const goalEnum = pgEnum("goal", GOAL_VALUES);
export const trainingLevelEnum = pgEnum("training_level", LEVEL_VALUES);
export const massUnitEnum = pgEnum("mass_unit", MASS_UNIT_VALUES);
export const themeEnum = pgEnum("theme", THEME_VALUES);
export const muscleGroupEnum = pgEnum("muscle_group", MUSCLE_GROUPS);
export const equipmentEnum = pgEnum("equipment", EQUIPMENT);
export const sessionStatusEnum = pgEnum(
  "workout_session_status",
  SESSION_STATUS_VALUES,
);

export const userProfiles = pgTable(
  "user_profiles",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    birthDate: date("birth_date"),
    sex: sexEnum("sex"),
    heightCm: integer("height_cm"),
    goal: goalEnum("goal"),
    trainingLevel: trainingLevelEnum("training_level"),
    massUnit: massUnitEnum("mass_unit").notNull().default("kg"),
    theme: themeEnum("theme").notNull().default("dark"),
    defaultRestSeconds: integer("default_rest_seconds").notNull().default(90),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "user_profiles_height_cm_range",
      sql`${table.heightCm} is null or ${table.heightCm} between 100 and 250`,
    ),
    check(
      "user_profiles_rest_range",
      sql`${table.defaultRestSeconds} between 15 and 600`,
    ),
  ],
);

export const bodyMeasurements = pgTable(
  "body_measurements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recordedOn: date("recorded_on").notNull(),
    weightKg: numeric("weight_kg", { precision: 5, scale: 1 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("body_measurements_user_day_unique").on(
      table.userId,
      table.recordedOn,
    ),
    check(
      "body_measurements_weight_range",
      sql`${table.weightKg} between 29.0 and 301.0`,
    ),
  ],
);

export const exercises = pgTable(
  "exercises",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerUserId: uuid("owner_user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    muscleGroup: muscleGroupEnum("muscle_group").notNull(),
    equipment: equipmentEnum("equipment").notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("exercises_catalog_normalized_name_unique")
      .on(table.normalizedName)
      .where(sql`${table.ownerUserId} is null`),
    uniqueIndex("exercises_owner_normalized_name_unique")
      .on(table.ownerUserId, table.normalizedName)
      .where(sql`${table.ownerUserId} is not null`),
    index("exercises_owner_idx").on(table.ownerUserId),
    index("exercises_muscle_group_idx").on(table.muscleGroup),
    check(
      "exercises_name_length",
      sql`char_length(${table.name}) between 2 and 60`,
    ),
    check(
      "exercises_catalog_not_archived",
      sql`${table.ownerUserId} is not null or ${table.archivedAt} is null`,
    ),
  ],
);

export const workouts = pgTable(
  "workouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("workouts_id_user_unique").on(table.id, table.userId),
    index("workouts_user_updated_idx").on(table.userId, table.updatedAt),
    check(
      "workouts_name_length",
      sql`char_length(${table.name}) between 1 and 60`,
    ),
  ],
);

export const workoutExercises = pgTable(
  "workout_exercises",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workoutId: uuid("workout_id").notNull(),
    userId: uuid("user_id").notNull(),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "restrict" }),
    position: integer("position").notNull(),
    setsCount: integer("sets_count").notNull().default(3),
    repsMin: integer("reps_min").notNull().default(10),
    repsMax: integer("reps_max").notNull().default(10),
    targetLoadKg: numeric("target_load_kg", { precision: 6, scale: 1 }),
    restSeconds: integer("rest_seconds").notNull().default(90),
  },
  (table) => [
    uniqueIndex("workout_exercises_position_unique").on(
      table.workoutId,
      table.position,
    ),
    index("workout_exercises_exercise_idx").on(table.exerciseId),
    foreignKey({
      columns: [table.workoutId, table.userId],
      foreignColumns: [workouts.id, workouts.userId],
      name: "workout_exercises_workout_user_fk",
    }).onDelete("cascade"),
    check(
      "workout_exercises_sets_range",
      sql`${table.setsCount} between 1 and 20`,
    ),
    check(
      "workout_exercises_reps_range",
      sql`${table.repsMin} between 1 and 999 and ${table.repsMax} between 1 and 999 and ${table.repsMin} <= ${table.repsMax}`,
    ),
    check(
      "workout_exercises_position_nonnegative",
      sql`${table.position} >= 0`,
    ),
    check(
      "workout_exercises_rest_range",
      sql`${table.restSeconds} between 15 and 600`,
    ),
    check(
      "workout_exercises_load_range",
      sql`${table.targetLoadKg} is null or (${table.targetLoadKg} >= 0 and ${table.targetLoadKg} <= 1000)`,
    ),
  ],
);

export const workoutSessions = pgTable(
  "workout_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workoutId: uuid("workout_id").references(() => workouts.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    status: sessionStatusEnum("status").notNull().default("in_progress"),
    notes: text("notes"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("workout_sessions_id_user_unique").on(table.id, table.userId),
    uniqueIndex("workout_sessions_one_active_per_user")
      .on(table.userId)
      .where(sql`${table.status} = 'in_progress'`),
    index("workout_sessions_user_finished_idx").on(
      table.userId,
      table.finishedAt,
    ),
    check(
      "workout_sessions_name_length",
      sql`char_length(${table.name}) between 1 and 80`,
    ),
    check(
      "workout_sessions_finished_consistency",
      sql`(${table.status} = 'completed' and ${table.finishedAt} is not null) or (${table.status} = 'in_progress' and ${table.finishedAt} is null)`,
    ),
  ],
);

export const sessionExercises = pgTable(
  "session_exercises",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id").notNull(),
    userId: uuid("user_id").notNull(),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "restrict" }),
    position: integer("position").notNull(),
    restSeconds: integer("rest_seconds").notNull().default(90),
    notes: text("notes"),
  },
  (table) => [
    unique("session_exercises_id_user_unique").on(table.id, table.userId),
    uniqueIndex("session_exercises_position_unique").on(
      table.sessionId,
      table.position,
    ),
    index("session_exercises_exercise_idx").on(table.exerciseId),
    index("session_exercises_user_exercise_idx").on(
      table.userId,
      table.exerciseId,
    ),
    foreignKey({
      columns: [table.sessionId, table.userId],
      foreignColumns: [workoutSessions.id, workoutSessions.userId],
      name: "session_exercises_session_user_fk",
    }).onDelete("cascade"),
    check(
      "session_exercises_position_nonnegative",
      sql`${table.position} >= 0`,
    ),
  ],
);

export const exerciseSets = pgTable(
  "exercise_sets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionExerciseId: uuid("session_exercise_id").notNull(),
    userId: uuid("user_id").notNull(),
    position: integer("position").notNull(),
    loadKg: numeric("load_kg", { precision: 6, scale: 1 }),
    reps: integer("reps"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("exercise_sets_position_unique").on(
      table.sessionExerciseId,
      table.position,
    ),
    index("exercise_sets_session_exercise_idx").on(table.sessionExerciseId),
    foreignKey({
      columns: [table.sessionExerciseId, table.userId],
      foreignColumns: [sessionExercises.id, sessionExercises.userId],
      name: "exercise_sets_session_exercise_user_fk",
    }).onDelete("cascade"),
    check(
      "exercise_sets_reps_range",
      sql`${table.reps} is null or ${table.reps} between 0 and 999`,
    ),
    check(
      "exercise_sets_load_range",
      sql`${table.loadKg} is null or (${table.loadKg} >= 0 and ${table.loadKg} <= 1000)`,
    ),
    check("exercise_sets_position_nonnegative", sql`${table.position} >= 0`),
  ],
);
