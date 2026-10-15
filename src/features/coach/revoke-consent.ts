import type { AppDatabase } from "@/db";
import { createConsentRepository } from "@/features/consent/repository";
import { deleteCoachChatHistory } from "@/lib/ai/messages";

export type RevokeCoachConsentResult =
  | { ok: true; deletedMessages: number }
  | { ok: false; error: "invalid" | "transaction_failed" };

const COACH_PURPOSES = ["coach_health", "coach_chat"] as const;

export async function revokeCoachConsent(
  db: AppDatabase,
  userId: string,
): Promise<RevokeCoachConsentResult> {
  try {
    return await db.transaction(async (tx) => {
      const consents = createConsentRepository(tx);
      for (const purpose of COACH_PURPOSES) {
        const saved = await consents.recordConsent(userId, {
          purpose,
          action: "revoked",
          source: "profile",
        });
        if (!saved.ok) {
          throw new Error("consent_invalid");
        }
      }
      const deletedMessages = await deleteCoachChatHistory(tx, userId);
      return { ok: true, deletedMessages };
    });
  } catch (error) {
    if (error instanceof Error && error.message === "consent_invalid") {
      return { ok: false, error: "invalid" };
    }
    return { ok: false, error: "transaction_failed" };
  }
}
