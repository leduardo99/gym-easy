import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  or,
  sql,
} from "drizzle-orm";

import type { AppDatabase } from "@/db";
import type { Equipment, MuscleGroup } from "@/db/catalog";
import { MUSCLE_GROUPS } from "@/db/catalog";
import type {
  Goal,
  MassUnit,
  Sex,
  ThemePreference,
  TrainingLevel,
  TrainingPlace,
} from "@/db/domain";
import {
  bodyMeasurements,
  consentLog,
  exerciseSets,
  exercises,
  sessionExercises,
  userProfiles,
  workoutExercises,
  workoutSessions,
  workouts,
} from "@/db/schema";

import { normalizeExerciseName } from "./normalize";
import { summarizeLoadProgression, type ProgressionPoint } from "./progression";
import {
  createProfileInputSchema,
  exerciseInputSchema,
  sessionStartSchema,
  setInputSchema,
  weightInputSchema,
  workoutInputSchema,
  type ProfileInput,
} from "./schemas";

export type RepoError =
  | "invalid"
  | "not_found"
  | "conflict"
  | "in_progress_exists"
  | "not_allowed"
  | "consent_required";

export type RepoResult<T> =
  { ok: true; value: T } | { ok: false; error: RepoError; message: string };

export type ProfileRecord = {
  userId: string;
  birthYear: number | null;
  sex: Sex | null;
  heightCm: number | null;
  goal: Goal | null;
  level: TrainingLevel | null;
  daysPerWeek: number | null;
  sessionMinutes: number | null;
  trainingPlace: TrainingPlace | null;
  massUnit: MassUnit;
  theme: ThemePreference;
  defaultRestSeconds: number;
};

export type WeightRecord = {
  id: string;
  recordedOn: string;
  weightKg: string;
};

export type ExerciseRecord = {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  ownerUserId: string | null;
  archivedAt: Date | null;
};

export type WorkoutExerciseRecord = {
  id: string;
  exerciseId: string;
  position: number;
  setsCount: number;
  repsMin: number;
  repsMax: number;
  targetLoadKg: string | null;
  restSeconds: number;
};

export type WorkoutRecord = {
  id: string;
  userId: string;
  name: string;
  notes: string | null;
  exercises: WorkoutExerciseRecord[];
};

export type SessionSetRecord = {
  id: string;
  position: number;
  loadKg: string | null;
  reps: number | null;
  completedAt: Date | null;
};

export type SessionExerciseRecord = {
  id: string;
  exerciseId: string;
  position: number;
  restSeconds: number;
  sets: SessionSetRecord[];
};

export type SessionRecord = {
  id: string;
  userId: string;
  workoutId: string | null;
  name: string;
  status: "in_progress" | "completed";
  startedAt: Date;
  finishedAt: Date | null;
  exercises: SessionExerciseRecord[];
};

function failure(error: RepoError, message: string): RepoResult<never> {
  return { ok: false, error, message };
}

function invalid(): RepoResult<never> {
  return failure("invalid", "Dados inválidos.");
}

function notFound(): RepoResult<never> {
  return failure("not_found", "Não encontrado.");
}

function consentRequired(): RepoResult<never> {
  return failure(
    "consent_required",
    "Autorize o uso dos dados do corpo antes de guardar.",
  );
}

function postgresCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  if ("code" in error && typeof error.code === "string") return error.code;
  if ("cause" in error) return postgresCode(error.cause);
  return null;
}

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function asDateString(value: Date | string): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value.slice(0, 10);
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

function profileColumns(data: ProfileInput) {
  const columns: {
    birthYear?: number | null;
    sex?: ProfileInput["sex"];
    heightCm?: number | null;
    goal?: ProfileInput["goal"];
    trainingLevel?: ProfileInput["level"];
    daysPerWeek?: number | null;
    sessionMinutes?: number | null;
    trainingPlace?: ProfileInput["trainingPlace"];
    massUnit?: ProfileInput["massUnit"];
    theme?: ProfileInput["theme"];
    defaultRestSeconds?: number;
  } = {};
  if (data.birthYear !== undefined) columns.birthYear = data.birthYear;
  if (data.sex !== undefined) columns.sex = data.sex;
  if (data.heightCm !== undefined) columns.heightCm = data.heightCm;
  if (data.goal !== undefined) columns.goal = data.goal;
  if (data.level !== undefined) columns.trainingLevel = data.level;
  if (data.daysPerWeek !== undefined) columns.daysPerWeek = data.daysPerWeek;
  if (data.sessionMinutes !== undefined) {
    columns.sessionMinutes = data.sessionMinutes;
  }
  if (data.trainingPlace !== undefined) {
    columns.trainingPlace = data.trainingPlace;
  }
  if (data.massUnit !== undefined) columns.massUnit = data.massUnit;
  if (data.theme !== undefined) columns.theme = data.theme;
  if (data.defaultRestSeconds !== undefined) {
    columns.defaultRestSeconds = data.defaultRestSeconds;
  }
  return columns;
}

function mapExercise(row: typeof exercises.$inferSelect): ExerciseRecord {
  return {
    id: row.id,
    name: row.name,
    muscleGroup: row.muscleGroup,
    equipment: row.equipment,
    ownerUserId: row.ownerUserId,
    archivedAt: row.archivedAt ? asDate(row.archivedAt) : null,
  };
}

export function createTrainingRepository(db: AppDatabase) {
  async function ownedExerciseIds(
    userId: string,
    exerciseIds: readonly string[],
  ): Promise<boolean> {
    const uniqueIds = [...new Set(exerciseIds)];
    if (uniqueIds.length === 0) return true;
    const rows = await db
      .select({ id: exercises.id })
      .from(exercises)
      .where(
        and(
          inArray(exercises.id, uniqueIds),
          or(isNull(exercises.ownerUserId), eq(exercises.ownerUserId, userId)),
          isNull(exercises.archivedAt),
        ),
      );
    return rows.length === uniqueIds.length;
  }

  async function hasActiveBodyDataConsent(userId: string): Promise<boolean> {
    const rows = await db
      .select({ action: consentLog.action })
      .from(consentLog)
      .where(
        and(eq(consentLog.userId, userId), eq(consentLog.purpose, "body_data")),
      )
      .orderBy(desc(consentLog.createdAt))
      .limit(1);
    return rows[0]?.action === "granted";
  }

  const api = {
    async saveProfile(
      userId: string,
      input: unknown,
    ): Promise<RepoResult<ProfileRecord>> {
      const parsed = createProfileInputSchema(new Date()).safeParse(input);
      if (!parsed.success) return invalid();
      if (!(await hasActiveBodyDataConsent(userId))) return consentRequired();
      const data = parsed.data;
      const existing = await db
        .select({ userId: userProfiles.userId })
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId))
        .limit(1);

      const columns = profileColumns(data);
      if (existing.length === 0) {
        await db.insert(userProfiles).values({ userId, ...columns });
      } else {
        await db
          .update(userProfiles)
          .set({ ...columns, updatedAt: new Date() })
          .where(eq(userProfiles.userId, userId));
      }

      const profile = await api.getProfile(userId);
      if (!profile) return notFound();
      return { ok: true, value: profile };
    },

    async getProfile(userId: string): Promise<ProfileRecord | null> {
      const rows = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return {
        userId: row.userId,
        birthYear: row.birthYear,
        sex: row.sex,
        heightCm: row.heightCm,
        goal: row.goal,
        level: row.trainingLevel,
        daysPerWeek: row.daysPerWeek,
        sessionMinutes: row.sessionMinutes,
        trainingPlace: row.trainingPlace,
        massUnit: row.massUnit,
        theme: row.theme,
        defaultRestSeconds: row.defaultRestSeconds,
      };
    },

    async recordWeight(
      userId: string,
      input: unknown,
    ): Promise<RepoResult<WeightRecord>> {
      const parsed = weightInputSchema.safeParse(input);
      if (!parsed.success) return invalid();
      if (!(await hasActiveBodyDataConsent(userId))) return consentRequired();
      const rows = await db
        .insert(bodyMeasurements)
        .values({
          userId,
          recordedOn: parsed.data.recordedOn,
          weightKg: parsed.data.weightKg,
        })
        .onConflictDoUpdate({
          target: [bodyMeasurements.userId, bodyMeasurements.recordedOn],
          set: { weightKg: parsed.data.weightKg },
        })
        .returning();
      const row = rows[0];
      if (!row) return notFound();
      return {
        ok: true,
        value: {
          id: row.id,
          recordedOn: asDateString(row.recordedOn),
          weightKg: row.weightKg,
        },
      };
    },

    async listWeights(userId: string): Promise<WeightRecord[]> {
      const rows = await db
        .select()
        .from(bodyMeasurements)
        .where(eq(bodyMeasurements.userId, userId))
        .orderBy(desc(bodyMeasurements.recordedOn));
      return rows.map((row) => ({
        id: row.id,
        recordedOn: asDateString(row.recordedOn),
        weightKg: row.weightKg,
      }));
    },

    async createExercise(
      userId: string,
      input: unknown,
    ): Promise<RepoResult<ExerciseRecord>> {
      const parsed = exerciseInputSchema.safeParse(input);
      if (!parsed.success) return invalid();
      try {
        const rows = await db
          .insert(exercises)
          .values({
            ownerUserId: userId,
            name: parsed.data.name,
            normalizedName: normalizeExerciseName(parsed.data.name),
            muscleGroup: parsed.data.muscleGroup,
            equipment: parsed.data.equipment,
          })
          .returning();
        const row = rows[0];
        if (!row) return notFound();
        return { ok: true, value: mapExercise(row) };
      } catch (error) {
        if (postgresCode(error) === "23505") {
          return failure("conflict", "Você já tem um exercício com esse nome");
        }
        throw error;
      }
    },

    async listExercises(
      userId: string,
      filter?: { search?: string; muscleGroup?: MuscleGroup },
    ): Promise<ExerciseRecord[]> {
      const muscleGroup = MUSCLE_GROUPS.find(
        (group) => group === filter?.muscleGroup,
      );
      const conditions = [
        or(isNull(exercises.ownerUserId), eq(exercises.ownerUserId, userId)),
        isNull(exercises.archivedAt),
      ];
      if (muscleGroup) conditions.push(eq(exercises.muscleGroup, muscleGroup));
      const search = filter?.search ? normalizeExerciseName(filter.search) : "";
      if (search.length > 0) {
        conditions.push(
          sql`${exercises.normalizedName} like ${`%${escapeLike(search)}%`} escape '\\'`,
        );
      }
      const rows = await db
        .select()
        .from(exercises)
        .where(and(...conditions))
        .orderBy(asc(exercises.name));
      return rows.map(mapExercise);
    },

    async getExercise(
      userId: string,
      exerciseId: string,
    ): Promise<ExerciseRecord | null> {
      const rows = await db
        .select()
        .from(exercises)
        .where(
          and(
            eq(exercises.id, exerciseId),
            or(
              isNull(exercises.ownerUserId),
              eq(exercises.ownerUserId, userId),
            ),
          ),
        )
        .limit(1);
      const row = rows[0];
      return row ? mapExercise(row) : null;
    },

    async archiveExercise(
      userId: string,
      exerciseId: string,
    ): Promise<RepoResult<"archived" | "deleted">> {
      const exercise = await api.getExercise(userId, exerciseId);
      if (!exercise) return notFound();
      if (exercise.ownerUserId !== userId) {
        return failure(
          "not_allowed",
          "Exercícios padrão não podem ser alterados.",
        );
      }

      const [sessionUse, workoutUse] = await Promise.all([
        db
          .select({ id: sessionExercises.id })
          .from(sessionExercises)
          .where(
            and(
              eq(sessionExercises.userId, userId),
              eq(sessionExercises.exerciseId, exerciseId),
            ),
          )
          .limit(1),
        db
          .select({ id: workoutExercises.id })
          .from(workoutExercises)
          .where(
            and(
              eq(workoutExercises.userId, userId),
              eq(workoutExercises.exerciseId, exerciseId),
            ),
          )
          .limit(1),
      ]);

      if (sessionUse.length > 0 || workoutUse.length > 0) {
        await db
          .update(exercises)
          .set({ archivedAt: new Date(), updatedAt: new Date() })
          .where(
            and(
              eq(exercises.id, exerciseId),
              eq(exercises.ownerUserId, userId),
            ),
          );
        return { ok: true, value: "archived" };
      }

      const deleted = await db
        .delete(exercises)
        .where(
          and(eq(exercises.id, exerciseId), eq(exercises.ownerUserId, userId)),
        )
        .returning({ id: exercises.id });
      if (deleted.length === 0) return notFound();
      return { ok: true, value: "deleted" };
    },

    async createWorkout(
      userId: string,
      input: unknown,
    ): Promise<RepoResult<WorkoutRecord>> {
      const parsed = workoutInputSchema.safeParse(input);
      if (!parsed.success) return invalid();
      const visible = await ownedExerciseIds(
        userId,
        parsed.data.exercises.map((exercise) => exercise.exerciseId),
      );
      if (!visible) return notFound();

      const workoutId = crypto.randomUUID();
      await db.insert(workouts).values({
        id: workoutId,
        userId,
        name: parsed.data.name,
        notes: parsed.data.notes,
      });
      try {
        await db.insert(workoutExercises).values(
          parsed.data.exercises.map((exercise, position) => ({
            workoutId,
            userId,
            exerciseId: exercise.exerciseId,
            position,
            setsCount: exercise.setsCount,
            repsMin: exercise.repsMin,
            repsMax: exercise.repsMax,
            targetLoadKg: exercise.targetLoadKg,
            restSeconds: exercise.restSeconds,
          })),
        );
      } catch (error) {
        await db
          .delete(workouts)
          .where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)));
        throw error;
      }

      const workout = await api.getWorkout(userId, workoutId);
      if (!workout) return notFound();
      return { ok: true, value: workout };
    },

    async getWorkout(
      userId: string,
      workoutId: string,
    ): Promise<WorkoutRecord | null> {
      const rows = await db
        .select()
        .from(workouts)
        .where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)))
        .limit(1);
      const workout = rows[0];
      if (!workout) return null;
      const exerciseRows = await db
        .select()
        .from(workoutExercises)
        .where(
          and(
            eq(workoutExercises.workoutId, workoutId),
            eq(workoutExercises.userId, userId),
          ),
        )
        .orderBy(asc(workoutExercises.position));
      return {
        id: workout.id,
        userId: workout.userId,
        name: workout.name,
        notes: workout.notes,
        exercises: exerciseRows.map((row) => ({
          id: row.id,
          exerciseId: row.exerciseId,
          position: row.position,
          setsCount: row.setsCount,
          repsMin: row.repsMin,
          repsMax: row.repsMax,
          targetLoadKg: row.targetLoadKg,
          restSeconds: row.restSeconds,
        })),
      };
    },

    async deleteWorkout(
      userId: string,
      workoutId: string,
    ): Promise<RepoResult<null>> {
      const deleted = await db
        .delete(workouts)
        .where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)))
        .returning({ id: workouts.id });
      if (deleted.length === 0) return notFound();
      return { ok: true, value: null };
    },

    async startSession(
      userId: string,
      input: unknown,
    ): Promise<RepoResult<SessionRecord>> {
      const parsed = sessionStartSchema.safeParse(input);
      if (!parsed.success) return invalid();
      const workoutId = parsed.data.workoutId ?? null;
      const workout = workoutId
        ? await api.getWorkout(userId, workoutId)
        : null;
      if (workoutId && !workout) return notFound();

      const active = await db
        .select({ id: workoutSessions.id })
        .from(workoutSessions)
        .where(
          and(
            eq(workoutSessions.userId, userId),
            eq(workoutSessions.status, "in_progress"),
          ),
        )
        .limit(1);
      if (active.length > 0) {
        return failure(
          "in_progress_exists",
          "Já existe um treino em andamento.",
        );
      }

      const sessionId = crypto.randomUUID();
      const name = parsed.data.name ?? workout?.name ?? "Treino vazio";
      try {
        await db.insert(workoutSessions).values({
          id: sessionId,
          userId,
          workoutId,
          name,
          status: "in_progress",
        });
        if (workout) {
          const sessionExerciseRows = workout.exercises.map((exercise) => ({
            id: crypto.randomUUID(),
            sessionId,
            userId,
            exerciseId: exercise.exerciseId,
            position: exercise.position,
            restSeconds: exercise.restSeconds,
            sets: exercise,
          }));
          await db.insert(sessionExercises).values(
            sessionExerciseRows.map((exercise) => ({
              id: exercise.id,
              sessionId: exercise.sessionId,
              userId: exercise.userId,
              exerciseId: exercise.exerciseId,
              position: exercise.position,
              restSeconds: exercise.restSeconds,
            })),
          );
          const setRows = sessionExerciseRows.flatMap((exercise) =>
            Array.from({ length: exercise.sets.setsCount }, (_, position) => ({
              sessionExerciseId: exercise.id,
              userId,
              position,
              loadKg: exercise.sets.targetLoadKg,
              reps: exercise.sets.repsMin,
            })),
          );
          if (setRows.length > 0) await db.insert(exerciseSets).values(setRows);
        }
      } catch (error) {
        await db
          .delete(workoutSessions)
          .where(
            and(
              eq(workoutSessions.id, sessionId),
              eq(workoutSessions.userId, userId),
            ),
          );
        if (postgresCode(error) === "23505") {
          return failure(
            "in_progress_exists",
            "Já existe um treino em andamento.",
          );
        }
        throw error;
      }

      const session = await api.getSession(userId, sessionId);
      if (!session) return notFound();
      return { ok: true, value: session };
    },

    async getSession(
      userId: string,
      sessionId: string,
    ): Promise<SessionRecord | null> {
      const rows = await db
        .select()
        .from(workoutSessions)
        .where(
          and(
            eq(workoutSessions.id, sessionId),
            eq(workoutSessions.userId, userId),
          ),
        )
        .limit(1);
      const session = rows[0];
      if (!session) return null;
      const exerciseRows = await db
        .select()
        .from(sessionExercises)
        .where(
          and(
            eq(sessionExercises.sessionId, sessionId),
            eq(sessionExercises.userId, userId),
          ),
        )
        .orderBy(asc(sessionExercises.position));
      const exerciseIds = exerciseRows.map((row) => row.id);
      const setRows =
        exerciseIds.length === 0
          ? []
          : await db
              .select()
              .from(exerciseSets)
              .where(
                and(
                  eq(exerciseSets.userId, userId),
                  inArray(exerciseSets.sessionExerciseId, exerciseIds),
                ),
              )
              .orderBy(asc(exerciseSets.position));
      return {
        id: session.id,
        userId: session.userId,
        workoutId: session.workoutId,
        name: session.name,
        status: session.status,
        startedAt: asDate(session.startedAt),
        finishedAt: session.finishedAt ? asDate(session.finishedAt) : null,
        exercises: exerciseRows.map((exercise) => ({
          id: exercise.id,
          exerciseId: exercise.exerciseId,
          position: exercise.position,
          restSeconds: exercise.restSeconds,
          sets: setRows
            .filter((set) => set.sessionExerciseId === exercise.id)
            .map((set) => ({
              id: set.id,
              position: set.position,
              loadKg: set.loadKg,
              reps: set.reps,
              completedAt: set.completedAt ? asDate(set.completedAt) : null,
            })),
        })),
      };
    },

    async recordSet(
      userId: string,
      input: unknown,
    ): Promise<RepoResult<SessionSetRecord>> {
      const parsed = setInputSchema.safeParse(input);
      if (!parsed.success) return invalid();
      const rows = await db
        .update(exerciseSets)
        .set({
          loadKg: parsed.data.loadKg,
          reps: parsed.data.reps,
          completedAt: parsed.data.completed ? new Date() : null,
        })
        .where(
          and(
            eq(exerciseSets.id, parsed.data.setId),
            eq(exerciseSets.userId, userId),
          ),
        )
        .returning();
      const row = rows[0];
      if (!row) return notFound();
      return {
        ok: true,
        value: {
          id: row.id,
          position: row.position,
          loadKg: row.loadKg,
          reps: row.reps,
          completedAt: row.completedAt ? asDate(row.completedAt) : null,
        },
      };
    },

    async finishSession(
      userId: string,
      sessionId: string,
    ): Promise<RepoResult<SessionRecord>> {
      const existing = await api.getSession(userId, sessionId);
      if (!existing) return notFound();
      if (existing.status === "in_progress") {
        const exerciseIds = existing.exercises.map((exercise) => exercise.id);
        if (exerciseIds.length > 0) {
          await db
            .delete(exerciseSets)
            .where(
              and(
                eq(exerciseSets.userId, userId),
                inArray(exerciseSets.sessionExerciseId, exerciseIds),
                isNull(exerciseSets.completedAt),
              ),
            );
        }
        await db
          .update(workoutSessions)
          .set({
            status: "completed",
            finishedAt: new Date(),
            lastActivityAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(workoutSessions.id, sessionId),
              eq(workoutSessions.userId, userId),
              eq(workoutSessions.status, "in_progress"),
            ),
          );
      }
      const session = await api.getSession(userId, sessionId);
      if (!session) return notFound();
      return { ok: true, value: session };
    },

    async listLoadProgression(
      userId: string,
      exerciseId: string,
    ): Promise<RepoResult<ProgressionPoint[]>> {
      const exercise = await api.getExercise(userId, exerciseId);
      if (!exercise) return notFound();
      const rows = await db
        .select({
          sessionId: workoutSessions.id,
          finishedAt: workoutSessions.finishedAt,
          loadKg: exerciseSets.loadKg,
          reps: exerciseSets.reps,
        })
        .from(exerciseSets)
        .innerJoin(
          sessionExercises,
          and(
            eq(exerciseSets.sessionExerciseId, sessionExercises.id),
            eq(exerciseSets.userId, userId),
            eq(sessionExercises.userId, userId),
          ),
        )
        .innerJoin(
          workoutSessions,
          and(
            eq(sessionExercises.sessionId, workoutSessions.id),
            eq(workoutSessions.userId, userId),
            eq(workoutSessions.status, "completed"),
          ),
        )
        .where(
          and(
            eq(sessionExercises.exerciseId, exerciseId),
            isNotNull(exerciseSets.completedAt),
            isNotNull(exerciseSets.loadKg),
            isNotNull(exerciseSets.reps),
          ),
        );

      const points = summarizeLoadProgression(
        rows.flatMap((row) => {
          if (!row.finishedAt || row.loadKg === null || row.reps === null) {
            return [];
          }
          return [
            {
              sessionId: row.sessionId,
              finishedAt: asDate(row.finishedAt),
              loadKg: row.loadKg,
              reps: row.reps,
            },
          ];
        }),
      );
      return { ok: true, value: points };
    },
  };

  return api;
}
