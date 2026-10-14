import { sql } from "drizzle-orm";

import type { AppDatabase } from "@/db";
import { authRateLimits } from "@/db/schema";

import type { RateLimiter } from "./rate-limit";

/**
 * Atomic windowed counter. A window older than `windowMs` resets to one hit,
 * matching `applyRateLimit`.
 */
export function createDrizzleRateLimiter(db: AppDatabase): RateLimiter {
  return {
    async hit(bucket, limit, windowMs) {
      const now = new Date();
      const cutoff = new Date(now.getTime() - windowMs);
      const rows = await db
        .insert(authRateLimits)
        .values({ bucket, hits: 1, windowStartedAt: now })
        .onConflictDoUpdate({
          target: authRateLimits.bucket,
          set: {
            hits: sql`case when ${authRateLimits.windowStartedAt} <= ${cutoff} then 1 else ${authRateLimits.hits} + 1 end`,
            windowStartedAt: sql`case when ${authRateLimits.windowStartedAt} <= ${cutoff} then ${now} else ${authRateLimits.windowStartedAt} end`,
          },
        })
        .returning({
          hits: authRateLimits.hits,
          windowStartedAt: authRateLimits.windowStartedAt,
        });

      const row = rows[0];
      if (!row) throw new Error("rate_limit_write_failed");

      const hits = Number(row.hits);
      const windowStartedAt =
        row.windowStartedAt instanceof Date
          ? row.windowStartedAt
          : new Date(row.windowStartedAt);
      const allowed = hits <= limit;
      const retryAfterSeconds = allowed
        ? 0
        : Math.max(
            1,
            Math.ceil(
              (windowStartedAt.getTime() + windowMs - now.getTime()) / 1000,
            ),
          );

      return { allowed, retryAfterSeconds };
    },
  };
}
