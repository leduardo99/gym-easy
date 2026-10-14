import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import {
  BODY_REGIONS,
  EQUIPMENT,
  MOVEMENT_PATTERNS,
  MUSCLE_GROUPS,
  MUSCLES,
} from "./catalog";
import {
  CONSENT_ACTIONS,
  CONSENT_PURPOSES,
  CONSENT_SOURCES,
  GOAL_VALUES,
  LEVEL_VALUES,
  MASS_UNIT_VALUES,
  SESSION_STATUS_VALUES,
  SEX_VALUES,
  THEME_VALUES,
  TRAINING_PLACE_VALUES,
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
export const trainingPlaceEnum = pgEnum(
  "training_place",
  TRAINING_PLACE_VALUES,
);
export const consentPurposeEnum = pgEnum("consent_purpose", CONSENT_PURPOSES);
export const consentActionEnum = pgEnum("consent_action", CONSENT_ACTIONS);
export const consentSourceEnum = pgEnum("consent_source", CONSENT_SOURCES);
export const trainingLevelEnum = pgEnum("training_level", LEVEL_VALUES);
export const massUnitEnum = pgEnum("mass_unit", MASS_UNIT_VALUES);
export const themeEnum = pgEnum("theme", THEME_VALUES);
export const muscleGroupEnum = pgEnum("muscle_group", MUSCLE_GROUPS);
export const equipmentEnum = pgEnum("equipment", EQUIPMENT);
export const movementPatternEnum = pgEnum(
  "movement_pattern",
  MOVEMENT_PATTERNS,
);
export const muscleEnum = pgEnum("muscle", MUSCLES);
/** O mesmo enum vale para contraindicated_regions e, depois, para injury.region. */
export const bodyRegionEnum = pgEnum("body_region", BODY_REGIONS);
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
    birthYear: smallint("birth_year"),
    sex: sexEnum("sex"),
    heightCm: integer("height_cm"),
    goal: goalEnum("goal"),
    trainingLevel: trainingLevelEnum("training_level"),
    daysPerWeek: integer("days_per_week"),
    sessionMinutes: integer("session_minutes"),
    trainingPlace: trainingPlaceEnum("training_place"),
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
      "user_profiles_birth_year_range",
      sql`${table.birthYear} is null or ${table.birthYear} between extract(year from now()) - 100 and extract(year from now())`,
    ),
    check(
      "user_profiles_height_cm_range",
      sql`${table.heightCm} is null or ${table.heightCm} between 100 and 250`,
    ),
    check(
      "user_profiles_days_per_week_range",
      sql`${table.daysPerWeek} is null or ${table.daysPerWeek} between 2 and 6`,
    ),
    check(
      "user_profiles_session_minutes",
      sql`${table.sessionMinutes} is null or ${table.sessionMinutes} in (30, 45, 60, 75, 90)`,
    ),
    check(
      "user_profiles_rest_range",
      sql`${table.defaultRestSeconds} between 15 and 600`,
    ),
  ],
);

/**
 * Append-only. A aplicação só insere. UPDATE e DELETE direto são recusados.
 * Apagar a conta não apaga a prova: `delete_account` grava o pseudônimo HMAC,
 * preenche `key_version` e `deleted_account_at`, e só então zera `user_id`.
 * Estado vigente = última linha por (user_id, purpose) com action granted
 * e version e text_sha256 iguais ao texto publicado. Versão antiga, hash
 * diferente ou revogação não contam como consentimento.
 */
export const consentLog = pgTable(
  "consent_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    purpose: consentPurposeEnum("purpose").notNull(),
    action: consentActionEnum("action").notNull(),
    version: text("version").notNull(),
    textSha256: text("text_sha256").notNull(),
    source: consentSourceEnum("source").notNull(),
    subjectPseudonym: text("subject_pseudonym"),
    keyVersion: smallint("key_version"),
    deletedAccountAt: timestamp("deleted_account_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("consent_log_id_user_id_unique").on(table.id, table.userId),
    index("consent_log_user_purpose_created_idx").on(
      table.userId,
      table.purpose,
      table.createdAt.desc(),
    ),
    check(
      "consent_log_version_length",
      sql`char_length(${table.version}) between 1 and 80`,
    ),
    check(
      "consent_log_text_sha256_hex",
      sql`${table.textSha256} ~ '^[a-f0-9]{64}$'`,
    ),
    check(
      "consent_log_retention_shape",
      sql`(
        ${table.userId} is not null
        and ${table.subjectPseudonym} is null
        and ${table.keyVersion} is null
        and ${table.deletedAccountAt} is null
      ) or (
        ${table.userId} is null
        and ${table.subjectPseudonym} ~ '^[a-f0-9]{64}$'
        and ${table.keyVersion} >= 1
        and ${table.deletedAccountAt} is not null
      )`,
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
    slug: text("slug"),
    movementPattern: movementPatternEnum("movement_pattern"),
    primaryMuscles: muscleEnum("primary_muscles").array().notNull().default([]),
    secondaryMuscles: muscleEnum("secondary_muscles")
      .array()
      .notNull()
      .default([]),
    level: trainingLevelEnum("level"),
    contraindicatedRegions: bodyRegionEnum("contraindicated_regions")
      .array()
      .notNull()
      .default([]),
    unilateral: boolean("unilateral").notNull().default(false),
    isPlyometric: boolean("is_plyometric").notNull().default(false),
    defaultRepsMin: smallint("default_reps_min"),
    defaultRepsMax: smallint("default_reps_max"),
    substitutionSlugs: text("substitution_slugs").array().notNull().default([]),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("exercises_catalog_slug_unique")
      .on(table.slug)
      .where(sql`${table.ownerUserId} is null`),
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
    check(
      "exercises_slug_format",
      sql`${table.slug} is null or ${table.slug} ~ '^[a-z0-9]+(_[a-z0-9]+)*$'`,
    ),
    check(
      "exercises_catalog_metadata",
      sql`${table.ownerUserId} is not null or (
        ${table.slug} is not null
        and ${table.movementPattern} is not null
        and ${table.level} is not null
        and cardinality(${table.primaryMuscles}) >= 1
        and ${table.defaultRepsMin} is not null
        and ${table.defaultRepsMax} is not null
        and ${table.defaultRepsMin} between 1 and ${table.defaultRepsMax}
        and ${table.defaultRepsMax} <= 999
        and cardinality(${table.substitutionSlugs}) <= 3
      )`,
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
      .references(() => exercises.id, { onDelete: "cascade" }),
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
      .references(() => exercises.id, { onDelete: "cascade" }),
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
