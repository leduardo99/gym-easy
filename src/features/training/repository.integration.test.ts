import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { CONSENT_TEXTS, consentTextSha256 } from "@/consent/texts";
import type { AppDatabase } from "@/db";
import { isLocalDatabaseUrl } from "@/db/driver";
import * as schema from "@/db/schema";
import {
  bodyMeasurements,
  consentLog,
  exerciseSets,
  exercises,
  sessionExercises,
  userProfiles,
  users,
  workoutExercises,
  workoutSessions,
  workouts,
} from "@/db/schema";
import { CATALOG_EXERCISES } from "@/db/catalog";
import { applyExerciseSeed } from "@/db/seed/apply-exercise-seed";
import { createConsentRepository } from "@/features/consent/repository";
import {
  CONSENT_KEY_VERSION,
  consentSubjectPseudonym,
} from "@/features/consent/pseudonym";
import {
  deleteUserAccount,
  purgeExpiredConsentProofs,
} from "@/features/consent/retention";

import { createTrainingRepository } from "./repository";

const consentKey = "consent-pseudonym-test-key-32b!!";
const databaseUrl = process.env.DATABASE_URL ?? "";
const runIntegration =
  databaseUrl.length > 0 &&
  isLocalDatabaseUrl(databaseUrl) &&
  process.env.DATABASE_DRIVER !== "neon";

describe.skipIf(!runIntegration)("training data access", () => {
  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  const db = drizzle({ client: pool, schema });
  const repository = createTrainingRepository(db as unknown as AppDatabase);
  const consents = createConsentRepository(db as unknown as AppDatabase);

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: "src/db/migrations" });
  });

  afterAll(async () => {
    await pool.end();
  });

  function errorText(error: unknown): string {
    const parts: string[] = [];
    let current = error;
    while (current instanceof Error) {
      parts.push(current.message);
      current = "cause" in current ? current.cause : undefined;
    }
    return parts.join("\n");
  }

  async function insertUser(name: string): Promise<string> {
    const id = crypto.randomUUID();
    await db.insert(users).values({
      id,
      name,
      email: `${id}@example.com`,
      passwordHash: "hash",
    });
    return id;
  }

  async function grantBodyData(userId: string) {
    const saved = await consents.recordConsent(userId, {
      purpose: "body_data",
      action: "granted",
      source: "onboarding",
    });
    expect(saved.ok).toBe(true);
  }

  it("seeds the shared catalog once and again without duplicating rows", async () => {
    const before = await db
      .select({ id: exercises.id })
      .from(exercises)
      .where(isNull(exercises.ownerUserId));
    expect(before).toHaveLength(CATALOG_EXERCISES.length);

    await applyExerciseSeed(db);
    const after = await db
      .select({ id: exercises.id })
      .from(exercises)
      .where(isNull(exercises.ownerUserId));
    expect(after).toHaveLength(CATALOG_EXERCISES.length);
  });

  it("rejects a height outside the database range", async () => {
    const userId = await insertUser("Altura");
    await expect(
      db.insert(userProfiles).values({ userId, heightCm: 50 }),
    ).rejects.toThrow();
  });

  it("stores birth year inside a rolling window and leaves age to the app", async () => {
    const userId = await insertUser("Ano");
    await expect(
      db.insert(userProfiles).values({ userId, birthYear: 1800 }),
    ).rejects.toThrow();
    await db.insert(userProfiles).values({ userId, birthYear: 2010 });
    await grantBodyData(userId);
    const blocked = await repository.saveProfile(userId, { birthYear: 2010 });
    expect(blocked.ok).toBe(false);
    const allowed = await repository.saveProfile(userId, { birthYear: 2009 });
    expect(allowed.ok).toBe(true);
    if (allowed.ok) expect(allowed.value.birthYear).toBe(2009);
  });

  it("keeps every query inside the session user", async () => {
    const ownerId = await insertUser("Dona");
    const intruderId = await insertUser("Intruso");

    const profile = await repository.saveProfile(ownerId, {
      birthYear: 1992,
      sex: "female",
      heightCm: 168,
      goal: "strength",
      level: "advanced",
      massUnit: "kg",
      theme: "dark",
      defaultRestSeconds: 90,
      userId: intruderId,
    });
    expect(profile.ok).toBe(false);
    if (!profile.ok) expect(profile.error).toBe("invalid");

    await grantBodyData(ownerId);
    const saved = await repository.saveProfile(ownerId, {
      birthYear: 1992,
      heightCm: 168,
      goal: "strength",
      level: "advanced",
      daysPerWeek: 4,
      sessionMinutes: 60,
      trainingPlace: "full_gym",
    });
    expect(saved.ok).toBe(true);
    expect(await repository.getProfile(intruderId)).toBeNull();
    const ownProfile = await repository.getProfile(ownerId);
    expect(ownProfile?.birthYear).toBe(1992);
    expect(ownProfile?.daysPerWeek).toBe(4);
    expect(ownProfile?.trainingPlace).toBe("full_gym");
    expect(ownProfile?.level).toBe("advanced");
    expect(ownProfile?.massUnit).toBe("kg");
    expect(ownProfile?.theme).toBe("dark");
    expect(ownProfile?.defaultRestSeconds).toBe(90);

    const weight = await repository.recordWeight(ownerId, {
      recordedOn: "2026-10-14",
      weight: "70,5",
      unit: "kg",
    });
    expect(weight.ok).toBe(true);
    expect(await repository.listWeights(intruderId)).toEqual([]);

    const custom = await repository.createExercise(ownerId, {
      name: "Supino máquina da Dona",
      muscleGroup: "chest",
      equipment: "machine",
    });
    expect(custom.ok).toBe(true);
    if (!custom.ok) return;
    const duplicate = await repository.createExercise(ownerId, {
      name: "súpino máquina da dona",
      muscleGroup: "chest",
      equipment: "machine",
    });
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) {
      expect(duplicate.error).toBe("conflict");
      expect(duplicate.message).toBe("Você já tem um exercício com esse nome");
    }

    const intruderList = await repository.listExercises(intruderId, {
      search: "máquina da dona",
    });
    expect(intruderList).toEqual([]);
    expect(
      await repository.getExercise(intruderId, custom.value.id),
    ).toBeNull();
    const archiveAttempt = await repository.archiveExercise(
      intruderId,
      custom.value.id,
    );
    expect(archiveAttempt.ok).toBe(false);
    if (!archiveAttempt.ok) expect(archiveAttempt.error).toBe("not_found");

    const catalog = await repository.listExercises(ownerId, {
      search: "supino",
    });
    const bench = catalog.find((item) => item.name === "Supino reto com barra");
    expect(bench?.ownerUserId).toBeNull();
    if (!bench) return;
    const catalogArchive = await repository.archiveExercise(ownerId, bench.id);
    expect(catalogArchive.ok).toBe(false);
    if (!catalogArchive.ok) expect(catalogArchive.error).toBe("not_allowed");

    const workout = await repository.createWorkout(ownerId, {
      name: "Treino A",
      notes: null,
      exercises: [
        {
          exerciseId: bench.id,
          setsCount: 2,
          repsTarget: "8-10",
          targetLoadKg: "60",
          restSeconds: 90,
        },
      ],
    });
    expect(workout.ok).toBe(true);
    if (!workout.ok) return;
    expect(
      await repository.getWorkout(intruderId, workout.value.id),
    ).toBeNull();
    const stolen = await repository.createWorkout(intruderId, {
      name: "Roubo",
      exercises: [{ exerciseId: custom.value.id, repsTarget: "8" }],
    });
    expect(stolen.ok).toBe(false);
    if (!stolen.ok) expect(stolen.error).toBe("not_found");
    expect(
      await repository.getWorkout(intruderId, workout.value.id),
    ).toBeNull();

    const started = await repository.startSession(ownerId, {
      workoutId: workout.value.id,
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const setId = started.value.exercises[0]?.sets[0]?.id;
    expect(setId).toBeTruthy();
    const recorded = await repository.recordSet(ownerId, {
      setId,
      loadKg: "62,5",
      reps: 8,
      completed: true,
    });
    expect(recorded.ok).toBe(true);
    const intrusion = await repository.recordSet(intruderId, {
      setId,
      loadKg: "200",
      reps: 1,
      completed: true,
    });
    expect(intrusion.ok).toBe(false);
    if (!intrusion.ok) expect(intrusion.error).toBe("not_found");

    const finished = await repository.finishSession(ownerId, started.value.id);
    expect(finished.ok).toBe(true);
    if (!finished.ok) return;
    expect(finished.value.status).toBe("completed");
    expect(finished.value.exercises[0]?.sets).toHaveLength(1);
    expect(
      await repository.getSession(intruderId, started.value.id),
    ).toBeNull();
    const finishIntrusion = await repository.finishSession(
      intruderId,
      started.value.id,
    );
    expect(finishIntrusion.ok).toBe(false);

    const ownerProgress = await repository.listLoadProgression(
      ownerId,
      bench.id,
    );
    expect(ownerProgress.ok).toBe(true);
    if (!ownerProgress.ok) return;
    expect(ownerProgress.value[0]?.maxLoadKg).toBe("62.5");
    expect(ownerProgress.value[0]?.isPersonalRecord).toBe(true);

    const intruderProgress = await repository.listLoadProgression(
      intruderId,
      bench.id,
    );
    expect(intruderProgress.ok).toBe(true);
    if (!intruderProgress.ok) return;
    expect(intruderProgress.value).toEqual([]);
    const hiddenProgress = await repository.listLoadProgression(
      intruderId,
      custom.value.id,
    );
    expect(hiddenProgress.ok).toBe(false);
    if (!hiddenProgress.ok) expect(hiddenProgress.error).toBe("not_found");

    const removed = await repository.deleteWorkout(
      intruderId,
      workout.value.id,
    );
    expect(removed.ok).toBe(false);
    if (!removed.ok) expect(removed.error).toBe("not_found");
    expect(
      await repository.getWorkout(ownerId, workout.value.id),
    ).not.toBeNull();

    const deleted = await repository.deleteWorkout(ownerId, workout.value.id);
    expect(deleted.ok).toBe(true);
    const kept = await repository.getSession(ownerId, started.value.id);
    expect(kept?.workoutId).toBeNull();
    expect(kept?.exercises[0]?.sets[0]?.loadKg).toBe("62.5");

    const archived = await repository.archiveExercise(ownerId, custom.value.id);
    expect(archived.ok).toBe(true);
    if (archived.ok) expect(archived.value).toBe("deleted");
  });

  it("replaces a weight logged on the same day", async () => {
    const userId = await insertUser("Peso");
    await grantBodyData(userId);
    await repository.recordWeight(userId, {
      recordedOn: "2026-10-01",
      weight: 80,
      unit: "kg",
    });
    await repository.recordWeight(userId, {
      recordedOn: "2026-10-14",
      weight: 78.5,
      unit: "kg",
    });
    await repository.recordWeight(userId, {
      recordedOn: "2026-10-14",
      weight: 77.5,
      unit: "kg",
    });
    const weights = await repository.listWeights(userId);
    expect(weights.map((entry) => [entry.recordedOn, entry.weightKg])).toEqual([
      ["2026-10-14", "77.5"],
      ["2026-10-01", "80.0"],
    ]);
  });

  it("allows only one in-progress session per user", async () => {
    const userId = await insertUser("Sessão");
    const first = await repository.startSession(userId, {
      name: "Treino vazio",
    });
    expect(first.ok).toBe(true);
    const second = await repository.startSession(userId, {});
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toBe("in_progress_exists");
    if (first.ok) {
      expect(
        await repository.getSession(userId, first.value.id),
      ).not.toBeNull();
    }
  });

  it("archives a custom exercise that already has history", async () => {
    const userId = await insertUser("Arquivo");
    const created = await repository.createExercise(userId, {
      name: "Remada especial",
      muscleGroup: "back",
      equipment: "dumbbell",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const workout = await repository.createWorkout(userId, {
      name: "Costas",
      exercises: [{ exerciseId: created.value.id, repsTarget: "10" }],
    });
    expect(workout.ok).toBe(true);
    const archived = await repository.archiveExercise(userId, created.value.id);
    expect(archived.ok).toBe(true);
    if (!archived.ok) return;
    expect(archived.value).toBe("archived");
    expect(
      (
        await repository.listExercises(userId, { search: "remada especial" })
      ).map((item) => item.id),
    ).not.toContain(created.value.id);
    expect(
      (await repository.getExercise(userId, created.value.id))?.archivedAt,
    ).toBeInstanceOf(Date);
  });

  it("stores the owner on the inserted profile row", async () => {
    const userId = await insertUser("Dono");
    await grantBodyData(userId);
    await repository.saveProfile(userId, { heightCm: 180 });
    const rows = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.heightCm).toBe(180);
    expect(rows[0]?.birthYear).toBeNull();
  });

  it("refuses profile and weight writes unless body_data consent is active", async () => {
    const userId = await insertUser("Corpo");
    const profileInput = { birthYear: 1990, heightCm: 170 };
    const weightInput = {
      recordedOn: "2026-10-14",
      weight: "70",
      unit: "kg" as const,
    };

    const missingProfile = await repository.saveProfile(userId, profileInput);
    const missingWeight = await repository.recordWeight(userId, weightInput);
    expect(missingProfile).toMatchObject({
      ok: false,
      error: "consent_required",
    });
    expect(missingWeight).toMatchObject({
      ok: false,
      error: "consent_required",
    });
    expect(
      await db
        .select({ userId: userProfiles.userId })
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId)),
    ).toEqual([]);
    expect(
      await db
        .select({ id: bodyMeasurements.id })
        .from(bodyMeasurements)
        .where(eq(bodyMeasurements.userId, userId)),
    ).toEqual([]);

    await grantBodyData(userId);
    await consents.recordConsent(userId, {
      purpose: "body_data",
      action: "revoked",
      source: "profile",
    });
    const revokedProfile = await repository.saveProfile(userId, profileInput);
    const revokedWeight = await repository.recordWeight(userId, weightInput);
    expect(revokedProfile).toMatchObject({
      ok: false,
      error: "consent_required",
    });
    expect(revokedWeight).toMatchObject({
      ok: false,
      error: "consent_required",
    });
    expect(
      await db
        .select({ userId: userProfiles.userId })
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId)),
    ).toEqual([]);
    expect(
      await db
        .select({ id: bodyMeasurements.id })
        .from(bodyMeasurements)
        .where(eq(bodyMeasurements.userId, userId)),
    ).toEqual([]);

    await grantBodyData(userId);
    const activeProfile = await repository.saveProfile(userId, profileInput);
    const activeWeight = await repository.recordWeight(userId, weightInput);
    expect(activeProfile.ok).toBe(true);
    expect(activeWeight.ok).toBe(true);

    expect(
      await db
        .select({ userId: userProfiles.userId })
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId)),
    ).toHaveLength(1);
    expect(
      await db
        .select({ id: bodyMeasurements.id })
        .from(bodyMeasurements)
        .where(eq(bodyMeasurements.userId, userId)),
    ).toHaveLength(1);
  });

  it("does not let another user's body_data consent authorize profile or weight writes", async () => {
    const userA = await insertUser("Consentiu");
    const userB = await insertUser("Sem consentimento");
    await grantBodyData(userA);
    const profileInput = { birthYear: 1991, heightCm: 175 };
    const weightInput = {
      recordedOn: "2026-10-14",
      weight: "72",
      unit: "kg" as const,
    };

    const profile = await repository.saveProfile(userB, profileInput);
    const weight = await repository.recordWeight(userB, weightInput);
    expect(profile).toMatchObject({ ok: false, error: "consent_required" });
    expect(weight).toMatchObject({ ok: false, error: "consent_required" });

    expect(
      await db
        .select({ userId: userProfiles.userId })
        .from(userProfiles)
        .where(eq(userProfiles.userId, userB)),
    ).toEqual([]);
    expect(
      await db
        .select({ id: bodyMeasurements.id })
        .from(bodyMeasurements)
        .where(eq(bodyMeasurements.userId, userB)),
    ).toEqual([]);
    expect(
      await db
        .select({ userId: userProfiles.userId })
        .from(userProfiles)
        .where(eq(userProfiles.userId, userA)),
    ).toEqual([]);
    expect(
      await db
        .select({ id: bodyMeasurements.id })
        .from(bodyMeasurements)
        .where(eq(bodyMeasurements.userId, userA)),
    ).toEqual([]);

    const savedProfile = await repository.saveProfile(userA, profileInput);
    const savedWeight = await repository.recordWeight(userA, weightInput);
    expect(savedProfile.ok).toBe(true);
    expect(savedWeight.ok).toBe(true);
    expect(
      await db
        .select({ userId: userProfiles.userId })
        .from(userProfiles)
        .where(eq(userProfiles.userId, userA)),
    ).toHaveLength(1);
    expect(
      await db
        .select({ id: bodyMeasurements.id })
        .from(bodyMeasurements)
        .where(eq(bodyMeasurements.userId, userA)),
    ).toHaveLength(1);
    expect(
      await db
        .select({ userId: userProfiles.userId })
        .from(userProfiles)
        .where(eq(userProfiles.userId, userB)),
    ).toEqual([]);
    expect(
      await db
        .select({ id: bodyMeasurements.id })
        .from(bodyMeasurements)
        .where(eq(bodyMeasurements.userId, userB)),
    ).toEqual([]);
  });

  it("appends consent and treats revocation as a new event", async () => {
    const ownerId = await insertUser("Consentimento");
    const intruderId = await insertUser("Outro");
    const granted = await consents.recordConsent(ownerId, {
      purpose: "body_data",
      action: "granted",
      source: "onboarding",
      userId: intruderId,
    });
    expect(granted.ok).toBe(false);

    const saved = await consents.recordConsent(ownerId, {
      purpose: "body_data",
      action: "granted",
      source: "onboarding",
    });
    expect(saved.ok).toBe(true);
    const revoked = await consents.recordConsent(ownerId, {
      purpose: "body_data",
      action: "revoked",
      source: "profile",
    });
    expect(revoked.ok).toBe(true);
    const current = await consents.currentConsent(ownerId);
    expect(current.body_data).toBeUndefined();
    expect(await consents.listConsents(intruderId)).toEqual([]);
    expect(await consents.listConsents(ownerId)).toHaveLength(2);

    const rowId = saved.ok ? saved.value.id : "";
    await expect(
      db
        .update(consentLog)
        .set({ action: "granted" })
        .where(eq(consentLog.id, rowId)),
    ).rejects.toSatisfy((error: unknown) =>
      errorText(error).includes("append-only"),
    );
    await expect(
      db.delete(consentLog).where(eq(consentLog.id, rowId)),
    ).rejects.toSatisfy((error: unknown) =>
      errorText(error).includes("append-only"),
    );

    await expect(
      db.delete(users).where(eq(users.id, ownerId)),
    ).rejects.toSatisfy((error: unknown) =>
      errorText(error).includes(
        "consent proof must be pseudonymized before account deletion",
      ),
    );

    await deleteUserAccount(db as unknown as AppDatabase, ownerId, consentKey);
    const pseudonym = consentSubjectPseudonym(ownerId, consentKey);
    const retained = await db
      .select({
        userId: consentLog.userId,
        subjectPseudonym: consentLog.subjectPseudonym,
        keyVersion: consentLog.keyVersion,
        deletedAccountAt: consentLog.deletedAccountAt,
      })
      .from(consentLog)
      .where(eq(consentLog.subjectPseudonym, pseudonym));
    expect(retained).toHaveLength(2);
    expect(retained.every((row) => row.userId === null)).toBe(true);
    expect(
      retained.every(
        (row) => row.subjectPseudonym === pseudonym && row.keyVersion === 1,
      ),
    ).toBe(true);
    expect(retained.every((row) => row.deletedAccountAt)).toBeTruthy();
    await expect(
      db.delete(consentLog).where(eq(consentLog.subjectPseudonym, pseudonym)),
    ).rejects.toSatisfy((error: unknown) =>
      errorText(error).includes("append-only"),
    );
  });

  it("counts only a grant of the current text version and hash", async () => {
    const currentUser = await insertUser("Versao atual");
    const saved = await consents.recordConsent(currentUser, {
      purpose: "body_data",
      action: "granted",
      source: "onboarding",
    });
    expect(saved.ok).toBe(true);
    const active = await consents.currentConsent(currentUser);
    expect(active.body_data?.action).toBe("granted");
    expect(active.body_data?.version).toBe(CONSENT_TEXTS.body_data.version);
    expect(active.body_data?.textSha256).toBe(consentTextSha256("body_data"));

    const staleUser = await insertUser("Versao antiga");
    await db.insert(consentLog).values({
      userId: staleUser,
      purpose: "body_data",
      action: "granted",
      version: "body_data-2026-10-14",
      textSha256: consentTextSha256("body_data"),
      source: "onboarding",
    });
    expect(
      (await consents.currentConsent(staleUser)).body_data,
    ).toBeUndefined();

    const hashUser = await insertUser("Hash diferente");
    await db.insert(consentLog).values({
      userId: hashUser,
      purpose: "body_data",
      action: "granted",
      version: CONSENT_TEXTS.body_data.version,
      textSha256: "ab".repeat(32),
      source: "onboarding",
    });
    expect((await consents.currentConsent(hashUser)).body_data).toBeUndefined();

    await db.insert(consentLog).values({
      userId: currentUser,
      purpose: "body_data",
      action: "granted",
      version: "body_data-2026-10-14",
      textSha256: consentTextSha256("body_data"),
      source: "reconsent",
      createdAt: new Date("2026-10-15T00:00:00.000Z"),
    });
    expect(
      (await consents.currentConsent(currentUser)).body_data,
    ).toBeUndefined();
  });

  it("removes a custom exercise and the history that references it when the account is deleted", async () => {
    const userId = await insertUser("Conta");
    const otherId = await insertUser("Fica");
    const catalogBefore = await db
      .select({ id: exercises.id })
      .from(exercises)
      .where(isNull(exercises.ownerUserId));

    const created = await repository.createExercise(userId, {
      name: "Rosca da conta",
      muscleGroup: "biceps",
      equipment: "dumbbell",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const workout = await repository.createWorkout(userId, {
      name: "Braços",
      exercises: [
        {
          exerciseId: created.value.id,
          setsCount: 2,
          repsTarget: "8-12",
          targetLoadKg: "12.5",
        },
      ],
    });
    expect(workout.ok).toBe(true);
    if (!workout.ok) return;
    const session = await repository.startSession(userId, {
      workoutId: workout.value.id,
    });
    expect(session.ok).toBe(true);
    if (!session.ok) return;
    const setId = session.value.exercises[0]?.sets[0]?.id;
    expect(setId).toBeTruthy();
    const recorded = await repository.recordSet(userId, {
      setId,
      loadKg: "12.5",
      reps: 10,
      completed: true,
    });
    expect(recorded.ok).toBe(true);
    await grantBodyData(userId);
    await repository.saveProfile(userId, { birthYear: 1992, heightCm: 170 });
    await repository.recordWeight(userId, {
      recordedOn: "2026-10-14",
      weight: "70",
      unit: "kg",
    });
    await consents.recordConsent(userId, {
      purpose: "body_data",
      action: "granted",
      source: "onboarding",
    });

    const history = await db
      .select({ id: exerciseSets.id })
      .from(exerciseSets)
      .where(
        and(
          eq(exerciseSets.userId, userId),
          isNotNull(exerciseSets.completedAt),
        ),
      );
    expect(history).toHaveLength(1);

    const pseudonym = consentSubjectPseudonym(userId, consentKey);
    await deleteUserAccount(db as unknown as AppDatabase, userId, consentKey);

    expect(
      await db
        .select({ id: exercises.id })
        .from(exercises)
        .where(eq(exercises.ownerUserId, userId)),
    ).toEqual([]);
    expect(
      await db
        .select({ id: workouts.id })
        .from(workouts)
        .where(eq(workouts.userId, userId)),
    ).toEqual([]);
    expect(
      await db
        .select({ id: workoutExercises.id })
        .from(workoutExercises)
        .where(eq(workoutExercises.userId, userId)),
    ).toEqual([]);
    expect(
      await db
        .select({ id: workoutSessions.id })
        .from(workoutSessions)
        .where(eq(workoutSessions.userId, userId)),
    ).toEqual([]);
    expect(
      await db
        .select({ id: sessionExercises.id })
        .from(sessionExercises)
        .where(eq(sessionExercises.userId, userId)),
    ).toEqual([]);
    expect(
      await db
        .select({ id: exerciseSets.id })
        .from(exerciseSets)
        .where(eq(exerciseSets.userId, userId)),
    ).toEqual([]);
    expect(
      await db
        .select({ id: userProfiles.userId })
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId)),
    ).toEqual([]);
    expect(
      await db
        .select({ id: bodyMeasurements.id })
        .from(bodyMeasurements)
        .where(eq(bodyMeasurements.userId, userId)),
    ).toEqual([]);
    const proofs = await db
      .select({
        userId: consentLog.userId,
        subjectPseudonym: consentLog.subjectPseudonym,
        keyVersion: consentLog.keyVersion,
        deletedAccountAt: consentLog.deletedAccountAt,
      })
      .from(consentLog)
      .where(eq(consentLog.subjectPseudonym, pseudonym));
    expect(proofs.length).toBeGreaterThan(0);
    expect(
      proofs.every(
        (row) =>
          row.userId === null &&
          row.subjectPseudonym === pseudonym &&
          row.keyVersion === 1 &&
          row.deletedAccountAt,
      ),
    ).toBe(true);
    expect(
      await db
        .select({ id: consentLog.id })
        .from(consentLog)
        .where(eq(consentLog.userId, userId)),
    ).toEqual([]);
    const constraints = await db.execute(sql`
      select
        pg_get_constraintdef(oid) as definition,
        confdeltype
      from pg_constraint
      where conname in (
        'consent_log_id_user_id_unique',
        'consent_log_user_id_users_id_fk'
      )
    `);
    const constraintRows = Array.isArray(constraints)
      ? constraints
      : constraints.rows;
    const definitions = constraintRows.map((row) =>
      String(
        (row as { definition?: string; confdeltype?: string }).definition ??
          (row as { confdeltype?: string }).confdeltype,
      ),
    );
    expect(definitions.join(" ")).toMatch(/UNIQUE \(id, user_id\)/);
    expect(
      constraintRows.some(
        (row) => (row as { confdeltype?: string }).confdeltype === "n",
      ),
    ).toBe(true);
    expect(
      await db.select({ id: users.id }).from(users).where(eq(users.id, userId)),
    ).toEqual([]);
    expect(
      await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, otherId)),
    ).toHaveLength(1);
    expect(
      await db
        .select({ id: exercises.id })
        .from(exercises)
        .where(isNull(exercises.ownerUserId)),
    ).toHaveLength(catalogBefore.length);
  });

  it("purges pseudonymized consent after three years and keeps live consent", async () => {
    const expiredId = await insertUser("Expira");
    const recentId = await insertUser("Recente");
    const liveId = await insertUser("Vivo");
    await grantBodyData(expiredId);
    await grantBodyData(recentId);
    await grantBodyData(liveId);

    const expiredPseudonym = consentSubjectPseudonym(expiredId, consentKey);
    await db.execute(sql`
      select delete_account(
        ${expiredId}::uuid,
        ${expiredPseudonym},
        ${CONSENT_KEY_VERSION}::smallint,
        ${"2020-01-01T00:00:00.000Z"}::timestamptz
      )
    `);
    await deleteUserAccount(db as unknown as AppDatabase, recentId, consentKey);

    const removed = await purgeExpiredConsentProofs(
      db as unknown as AppDatabase,
      new Date("2026-10-14T00:00:00.000Z"),
    );
    expect(removed).toBeGreaterThanOrEqual(1);
    expect(
      await db
        .select({ id: consentLog.id })
        .from(consentLog)
        .where(eq(consentLog.subjectPseudonym, expiredPseudonym)),
    ).toEqual([]);
    expect(
      await db
        .select({ id: consentLog.id })
        .from(consentLog)
        .where(
          eq(
            consentLog.subjectPseudonym,
            consentSubjectPseudonym(recentId, consentKey),
          ),
        ),
    ).toHaveLength(1);
    expect(
      await db
        .select({ id: consentLog.id })
        .from(consentLog)
        .where(eq(consentLog.userId, liveId)),
    ).toHaveLength(1);
  });
});
