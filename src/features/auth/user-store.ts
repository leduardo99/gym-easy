export type StoredUser = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  emailVerifiedAt: Date | null;
  onboardingCompletedAt: Date | null;
};

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  emailVerifiedAt: Date | null;
  onboardingCompletedAt: Date | null;
};

export type StoredSession = {
  tokenHash: string;
  userId: string;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
};

export type StoredVerificationToken = {
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  usedAt: Date | null;
};

export function toPublicUser(user: StoredUser): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerifiedAt: user.emailVerifiedAt,
    onboardingCompletedAt: user.onboardingCompletedAt,
  };
}

export interface UserStore {
  insertUser(user: {
    id: string;
    name: string;
    email: string;
    passwordHash: string;
  }): Promise<"inserted" | "exists">;
  findUserByEmail(email: string): Promise<StoredUser | null>;
  findUserById(id: string): Promise<StoredUser | null>;
  saveVerificationToken(token: {
    tokenHash: string;
    userId: string;
    expiresAt: Date;
  }): Promise<void>;
  invalidateVerificationTokens(userId: string, at: Date): Promise<void>;
  takeUnusedVerificationToken(
    tokenHash: string,
    now: Date,
  ): Promise<{ userId: string } | null>;
  findVerificationToken(
    tokenHash: string,
  ): Promise<StoredVerificationToken | null>;
  markEmailVerified(userId: string, at: Date): Promise<void>;
  insertSession(session: StoredSession): Promise<void>;
  deleteSession(tokenHash: string): Promise<void>;
  findSession(tokenHash: string): Promise<StoredSession | null>;
  touchSession(tokenHash: string, at: Date): Promise<void>;
  markOnboardingComplete(userId: string, at: Date): Promise<void>;
}
