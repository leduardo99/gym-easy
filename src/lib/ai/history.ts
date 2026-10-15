import { and, desc, eq, gte, isNull, or } from "drizzle-orm";

import type { AppDatabase } from "@/db";
import {
  exerciseSets,
  exercises,
  sessionExercises,
  workoutSessions,
} from "@/db/schema";

import type { HistorySession } from "./tools";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type HistoryRow = {
  sessionId: string;
  startedAt: Date;
  loadKg: string | null;
  reps: number | null;
};

export function groupHistorySessions(
  rows: readonly HistoryRow[],
): HistorySession[] {
  const sessions: HistorySession[] = [];
  const bySession = new Map<string, HistorySession>();

  for (const row of rows) {
    let session = bySession.get(row.sessionId);
    if (!session) {
      if (sessions.length >= 20) continue;
      session = {
        date: row.startedAt.toISOString().slice(0, 10),
        sets: [],
      };
      bySession.set(row.sessionId, session);
      sessions.push(session);
    }
    const weight = row.loadKg === null ? null : Number(row.loadKg);
    session.sets.push({
      weight_kg: weight !== null && Number.isFinite(weight) ? weight : null,
      reps: row.reps,
      rpe: null,
    });
  }

  return sessions;
}

export async function readExerciseHistory(
  db: AppDatabase,
  userId: string,
  exerciseId: string,
  days: number,
  now: Date,
): Promise<HistorySession[] | { error: "unknown_exercise" }> {
  const visible = or(
    isNull(exercises.ownerUserId),
    eq(exercises.ownerUserId, userId),
  );
  const identity = UUID_PATTERN.test(exerciseId)
    ? eq(exercises.id, exerciseId)
    : eq(exercises.slug, exerciseId);
  const found = await db
    .select({ id: exercises.id })
    .from(exercises)
    .where(and(identity, visible, isNull(exercises.archivedAt)))
    .limit(1);
  const exercise = found[0];
  if (!exercise) return { error: "unknown_exercise" };

  const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      sessionId: workoutSessions.id,
      startedAt: workoutSessions.startedAt,
      loadKg: exerciseSets.loadKg,
      reps: exerciseSets.reps,
    })
    .from(exerciseSets)
    .innerJoin(
      sessionExercises,
      and(
        eq(exerciseSets.sessionExerciseId, sessionExercises.id),
        eq(exerciseSets.userId, sessionExercises.userId),
      ),
    )
    .innerJoin(
      workoutSessions,
      and(
        eq(sessionExercises.sessionId, workoutSessions.id),
        eq(sessionExercises.userId, workoutSessions.userId),
      ),
    )
    .where(
      and(
        eq(sessionExercises.userId, userId),
        eq(sessionExercises.exerciseId, exercise.id),
        gte(workoutSessions.startedAt, since),
      ),
    )
    .orderBy(desc(workoutSessions.startedAt), desc(exerciseSets.position));

  return groupHistorySessions(
    rows.map((row) => ({
      sessionId: row.sessionId,
      startedAt:
        row.startedAt instanceof Date ? row.startedAt : new Date(row.startedAt),
      loadKg: row.loadKg,
      reps: row.reps,
    })),
  );
}
