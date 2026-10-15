import { eq, lt } from "drizzle-orm";

import type { AppDatabase, DbClient } from "@/db";
import {
  aiGenerationLogs,
  coachMessages,
  coachRedFlagLocks,
  planChangeProposals,
} from "@/db/schema";

import { RED_FLAG_COOLDOWN_MS, type RedFlagLockStore } from "./cooldown";
import type { AiLogRecord, PlanChangeInput } from "./schemas";
import type { ProposalStore } from "./proposals";

export const COACH_CHAT_RETENTION_DAYS = 90;

export function coachChatRetentionCutoff(now: Date): Date {
  return new Date(
    now.getTime() - COACH_CHAT_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );
}

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export function createDrizzleRedFlagLockStore(
  db: AppDatabase,
): RedFlagLockStore {
  return {
    async get(userId) {
      const rows = await db
        .select()
        .from(coachRedFlagLocks)
        .where(eq(coachRedFlagLocks.userId, userId))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return {
        userId: row.userId,
        createdAt: asDate(row.createdAt),
        expiresAt: asDate(row.expiresAt),
        clearedAt: row.clearedAt ? asDate(row.clearedAt) : null,
      };
    },
    async start(userId, now) {
      const expiresAt = new Date(now.getTime() + RED_FLAG_COOLDOWN_MS);
      await db
        .insert(coachRedFlagLocks)
        .values({ userId, createdAt: now, expiresAt, clearedAt: null })
        .onConflictDoUpdate({
          target: coachRedFlagLocks.userId,
          set: { createdAt: now, expiresAt, clearedAt: null },
        });
      return { userId, createdAt: now, expiresAt, clearedAt: null };
    },
    async clear(userId, now) {
      await db
        .update(coachRedFlagLocks)
        .set({ clearedAt: now })
        .where(eq(coachRedFlagLocks.userId, userId));
    },
  };
}

export function createDrizzleProposalStore(db: AppDatabase): ProposalStore {
  return {
    async add(userId, input: PlanChangeInput) {
      const rows = await db
        .insert(planChangeProposals)
        .values({ userId, status: "proposed", payload: input })
        .returning({ id: planChangeProposals.id });
      const row = rows[0];
      if (!row) throw new Error("proposal_insert_failed");
      return { id: row.id };
    },
  };
}

/** Bandeira vermelha nunca fica gravada: o texto da pessoa não entra na tabela. */
export function userMessageToStore(
  risk: "none" | "caution" | "red_flag" | null,
  content: string,
): string | null {
  if (risk === "red_flag") return null;
  return content;
}

export async function insertCoachMessage(
  db: AppDatabase,
  input: {
    userId: string;
    role: "user" | "assistant";
    content: string;
    risk: "none" | "caution" | "red_flag" | null;
    model: string | null;
    dataPolicy: "zdr" | "any_free" | null;
    promptVersion: string | null;
  },
): Promise<string | null> {
  const rows = await db
    .insert(coachMessages)
    .values(input)
    .returning({ id: coachMessages.id });
  return rows[0]?.id ?? null;
}

export async function insertAiGenerationLog(
  db: AppDatabase,
  record: AiLogRecord,
): Promise<void> {
  await db.insert(aiGenerationLogs).values({
    requestId: record.request_id,
    userIdHash: record.user_id_hash,
    model: record.model,
    dataPolicy: record.policy,
    latencyMs: record.latency_ms,
    tokensIn: record.tokens_in,
    tokensOut: record.tokens_out,
    outcome: record.outcome,
  });
}

/** Apaga o histórico de chat do próprio usuário. A LED-53 liga isto à UI. */
export async function deleteCoachChatHistory(
  db: DbClient,
  userId: string,
): Promise<number> {
  const rows = await db
    .delete(coachMessages)
    .where(eq(coachMessages.userId, userId))
    .returning({ id: coachMessages.id });
  return rows.length;
}

export async function purgeExpiredCoachMessages(
  db: AppDatabase,
  now: Date = new Date(),
): Promise<number> {
  const rows = await db
    .delete(coachMessages)
    .where(lt(coachMessages.createdAt, coachChatRetentionCutoff(now)))
    .returning({ id: coachMessages.id });
  return rows.length;
}

/** Logs operacionais seguem a mesma janela de 90 dias e não têm texto de saúde. */
export async function purgeExpiredAiGenerationLogs(
  db: AppDatabase,
  now: Date = new Date(),
): Promise<number> {
  const rows = await db
    .delete(aiGenerationLogs)
    .where(lt(aiGenerationLogs.createdAt, coachChatRetentionCutoff(now)))
    .returning({ id: aiGenerationLogs.id });
  return rows.length;
}
