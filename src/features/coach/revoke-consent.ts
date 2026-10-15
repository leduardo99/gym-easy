import type { AppDatabase } from "@/db";
import { createConsentRepository } from "@/features/consent/repository";
import { deleteCoachChatHistory } from "@/lib/ai/messages";

export type RevokeCoachConsentResult =
  { ok: true; deletedMessages: number } | { ok: false; error: "invalid" };

const COACH_PURPOSES = ["coach_health", "coach_chat"] as const;

export async function revokeCoachConsent(
  db: AppDatabase,
  userId: string,
): Promise<RevokeCoachConsentResult> {
  const consents = createConsentRepository(db);
  for (const purpose of COACH_PURPOSES) {
    const saved = await consents.recordConsent(userId, {
      purpose,
      action: "revoked",
      source: "profile",
    });
    if (!saved.ok) return { ok: false, error: "invalid" };
  }
  const deletedMessages = await deleteCoachChatHistory(db, userId);
  return { ok: true, deletedMessages };
}
