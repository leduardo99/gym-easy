import type { ConsentSource } from "@/db/domain";
import type { AppDatabase, DbClient } from "@/db";
import { createConsentRepository } from "@/features/consent/repository";
import { deleteCoachProposals } from "@/lib/ai/proposals";
import { deleteCoachChatHistory } from "@/lib/ai/messages";

export type RevokeCoachConsentResult =
  | { ok: true; deletedMessages: number; deletedProposals: number }
  | { ok: false; error: "invalid" | "transaction_failed" };

/**
 * Dados derivados de saúde do coach (todas as `plan_change_proposals` do utilizador).
 * A LED-31 deve acrescentar triagem e lesões aqui.
 */
export async function deleteCoachHealthData(
  tx: DbClient,
  userId: string,
): Promise<number> {
  return deleteCoachProposals(tx, userId);
}

async function recordRevoked(
  tx: DbClient,
  userId: string,
  purpose: "coach_health" | "coach_chat",
  source: ConsentSource,
): Promise<void> {
  const saved = await createConsentRepository(tx).recordConsent(userId, {
    purpose,
    action: "revoked",
    source,
  });
  if (!saved.ok) {
    throw new Error("consent_invalid");
  }
}

export async function revokeCoachHealthConsent(
  db: AppDatabase,
  userId: string,
  source: ConsentSource,
): Promise<
  | { ok: true; deletedProposals: number }
  | { ok: false; error: "invalid" | "transaction_failed" }
> {
  try {
    const deletedProposals = await db.transaction(async (tx) => {
      await recordRevoked(tx, userId, "coach_health", source);
      return deleteCoachHealthData(tx, userId);
    });
    return { ok: true, deletedProposals };
  } catch (error) {
    if (error instanceof Error && error.message === "consent_invalid") {
      return { ok: false, error: "invalid" };
    }
    return { ok: false, error: "transaction_failed" };
  }
}

export async function revokeCoachChatConsent(
  db: AppDatabase,
  userId: string,
  source: ConsentSource,
): Promise<
  | { ok: true; deletedMessages: number }
  | { ok: false; error: "invalid" | "transaction_failed" }
> {
  try {
    const deletedMessages = await db.transaction(async (tx) => {
      await recordRevoked(tx, userId, "coach_chat", source);
      return deleteCoachChatHistory(tx, userId);
    });
    return { ok: true, deletedMessages };
  } catch (error) {
    if (error instanceof Error && error.message === "consent_invalid") {
      return { ok: false, error: "invalid" };
    }
    return { ok: false, error: "transaction_failed" };
  }
}

export async function revokeCoachConsent(
  db: AppDatabase,
  userId: string,
  source: ConsentSource = "profile",
): Promise<RevokeCoachConsentResult> {
  try {
    return await db.transaction(async (tx) => {
      await recordRevoked(tx, userId, "coach_health", source);
      const deletedProposals = await deleteCoachHealthData(tx, userId);
      await recordRevoked(tx, userId, "coach_chat", source);
      const deletedMessages = await deleteCoachChatHistory(tx, userId);
      return { ok: true, deletedMessages, deletedProposals };
    });
  } catch (error) {
    if (error instanceof Error && error.message === "consent_invalid") {
      return { ok: false, error: "invalid" };
    }
    return { ok: false, error: "transaction_failed" };
  }
}
