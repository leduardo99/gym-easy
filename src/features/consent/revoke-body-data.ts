import type { AppDatabase } from "@/db";
import type { ConsentSource } from "@/db/domain";

import { createConsentRepository } from "./repository";
import { purgeBodyDataRows } from "./purge-body-data";

export type RevokeBodyDataConsentResult =
  { ok: true } | { ok: false; error: "invalid" | "transaction_failed" };

export async function revokeBodyDataConsent(
  db: AppDatabase,
  userId: string,
  options?: { source?: ConsentSource },
): Promise<RevokeBodyDataConsentResult> {
  const source = options?.source ?? "profile";
  try {
    await db.transaction(async (tx) => {
      const consents = createConsentRepository(tx);
      const saved = await consents.recordConsent(userId, {
        purpose: "body_data",
        action: "revoked",
        source,
      });
      if (!saved.ok) {
        throw new Error("consent_invalid");
      }
      await purgeBodyDataRows(tx, userId);
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.message === "consent_invalid") {
      return { ok: false, error: "invalid" };
    }
    return { ok: false, error: "transaction_failed" };
  }
}
