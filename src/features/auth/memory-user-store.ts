import type {
  StoredSession,
  StoredUser,
  StoredVerificationToken,
  UserStore,
} from "./user-store";

export function createMemoryUserStore(): UserStore {
  const users = new Map<string, StoredUser>();
  const tokens = new Map<string, StoredVerificationToken>();
  const sessions = new Map<string, StoredSession>();

  return {
    async insertUser(user) {
      if (
        [...users.values()].some((existing) => existing.email === user.email)
      ) {
        return "exists";
      }
      users.set(user.id, {
        ...user,
        emailVerifiedAt: null,
        onboardingCompletedAt: null,
      });
      return "inserted";
    },
    async findUserByEmail(email) {
      return [...users.values()].find((user) => user.email === email) ?? null;
    },
    async findUserById(id) {
      return users.get(id) ?? null;
    },
    async saveVerificationToken(token) {
      tokens.set(token.tokenHash, { ...token, usedAt: null });
    },
    async invalidateVerificationTokens(userId, at) {
      for (const token of tokens.values()) {
        if (token.userId === userId && !token.usedAt) token.usedAt = at;
      }
    },
    async takeUnusedVerificationToken(tokenHash, now) {
      const token = tokens.get(tokenHash);
      if (
        !token ||
        token.usedAt ||
        token.expiresAt.getTime() <= now.getTime()
      ) {
        return null;
      }
      token.usedAt = now;
      return { userId: token.userId };
    },
    async findVerificationToken(tokenHash) {
      return tokens.get(tokenHash) ?? null;
    },
    async markEmailVerified(userId, at) {
      const user = users.get(userId);
      if (user) user.emailVerifiedAt = at;
    },
    async insertSession(session) {
      sessions.set(session.tokenHash, session);
    },
    async deleteSession(tokenHash) {
      sessions.delete(tokenHash);
    },
    async findSession(tokenHash) {
      return sessions.get(tokenHash) ?? null;
    },
    async touchSession(tokenHash, at) {
      const session = sessions.get(tokenHash);
      if (session) session.lastSeenAt = at;
    },
    async markOnboardingComplete(userId, at) {
      const user = users.get(userId);
      if (user) user.onboardingCompletedAt = at;
    },
  };
}
