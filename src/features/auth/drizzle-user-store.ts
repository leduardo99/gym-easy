import { and, eq, gt, isNull } from "drizzle-orm";

import type { DbClient } from "@/db";
import { emailVerificationTokens, sessions, users } from "@/db/schema";

import type {
  StoredSession,
  StoredUser,
  StoredVerificationToken,
  UserStore,
} from "./user-store";

function mustDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function optionalDate(value: Date | string | null): Date | null {
  if (value === null) return null;
  return mustDate(value);
}

function mapUser(row: typeof users.$inferSelect): StoredUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.passwordHash,
    emailVerifiedAt: optionalDate(row.emailVerifiedAt),
    onboardingCompletedAt: optionalDate(row.onboardingCompletedAt),
  };
}

export function createDrizzleUserStore(db: DbClient): UserStore {
  return {
    async insertUser(user) {
      const rows = await db
        .insert(users)
        .values(user)
        .onConflictDoNothing({ target: users.email })
        .returning({ id: users.id });
      return rows.length > 0 ? "inserted" : "exists";
    },
    async findUserByEmail(email) {
      const rows = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      const row = rows[0];
      return row ? mapUser(row) : null;
    },
    async findUserById(id) {
      const rows = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      const row = rows[0];
      return row ? mapUser(row) : null;
    },
    async saveVerificationToken(token) {
      await db.insert(emailVerificationTokens).values(token);
    },
    async invalidateVerificationTokens(userId, at) {
      await db
        .update(emailVerificationTokens)
        .set({ usedAt: at })
        .where(
          and(
            eq(emailVerificationTokens.userId, userId),
            isNull(emailVerificationTokens.usedAt),
          ),
        );
    },
    async takeUnusedVerificationToken(tokenHash, now) {
      const rows = await db
        .update(emailVerificationTokens)
        .set({ usedAt: now })
        .where(
          and(
            eq(emailVerificationTokens.tokenHash, tokenHash),
            isNull(emailVerificationTokens.usedAt),
            gt(emailVerificationTokens.expiresAt, now),
          ),
        )
        .returning({ userId: emailVerificationTokens.userId });
      const row = rows[0];
      return row ? { userId: row.userId } : null;
    },
    async findVerificationToken(tokenHash) {
      const rows = await db
        .select()
        .from(emailVerificationTokens)
        .where(eq(emailVerificationTokens.tokenHash, tokenHash))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      const token: StoredVerificationToken = {
        tokenHash: row.tokenHash,
        userId: row.userId,
        expiresAt: mustDate(row.expiresAt),
        usedAt: optionalDate(row.usedAt),
      };
      return token;
    },
    async markEmailVerified(userId, at) {
      await db
        .update(users)
        .set({ emailVerifiedAt: at, updatedAt: at })
        .where(eq(users.id, userId));
    },
    async insertSession(session) {
      await db.insert(sessions).values(session);
    },
    async deleteSession(tokenHash) {
      await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
    },
    async findSession(tokenHash) {
      const rows = await db
        .select()
        .from(sessions)
        .where(eq(sessions.tokenHash, tokenHash))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      const session: StoredSession = {
        tokenHash: row.tokenHash,
        userId: row.userId,
        createdAt: mustDate(row.createdAt),
        lastSeenAt: mustDate(row.lastSeenAt),
        expiresAt: mustDate(row.expiresAt),
      };
      return session;
    },
    async touchSession(tokenHash, at) {
      await db
        .update(sessions)
        .set({ lastSeenAt: at })
        .where(eq(sessions.tokenHash, tokenHash));
    },
    async markOnboardingComplete(userId, at) {
      await db
        .update(users)
        .set({ onboardingCompletedAt: at, updatedAt: at })
        .where(eq(users.id, userId));
    },
  };
}
