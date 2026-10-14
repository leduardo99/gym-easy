import { eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { AppDatabase } from "@/db";
import { isLocalDatabaseUrl } from "@/db/driver";
import * as schema from "@/db/schema";
import { consentLog, exercises, userProfiles, users } from "@/db/schema";
import { CATALOG_EXERCISES } from "@/db/catalog";
import { applyExerciseSeed } from "@/db/seed/apply-exercise-seed";
import { createConsentRepository } from "@/features/consent/repository";

import { createTrainingRepository } from "./repository";

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
    const bench = catalog.find((item) => item.name === "Supino reto (barra)");
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
    await repository.saveProfile(userId, { heightCm: 180 });
    const rows = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.heightCm).toBe(180);
    expect(rows[0]?.birthYear).toBeNull();
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
    expect(current.body_data?.action).toBe("revoked");
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

    await db.delete(users).where(eq(users.id, ownerId));
    const leftover = await db
      .select({ id: consentLog.id })
      .from(consentLog)
      .where(eq(consentLog.userId, ownerId));
    expect(leftover).toEqual([]);
  });
});
