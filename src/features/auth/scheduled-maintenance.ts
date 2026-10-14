import { lt } from "drizzle-orm";

import type { AppDatabase } from "@/db";
import { authRateLimits, emailVerificationTokens, sessions } from "@/db/schema";

import { RATE_LIMIT_RETENTION_MS } from "./rate-limit";

export async function runScheduledMaintenance(
  db: AppDatabase,
  now: Date,
): Promise<void> {
  await db.delete(sessions).where(lt(sessions.expiresAt, now));
  await db
    .delete(emailVerificationTokens)
    .where(lt(emailVerificationTokens.expiresAt, now));
  await db
    .delete(authRateLimits)
    .where(
      lt(
        authRateLimits.windowStartedAt,
        new Date(now.getTime() - RATE_LIMIT_RETENTION_MS),
      ),
    );
}
