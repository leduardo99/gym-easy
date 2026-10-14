import { postAuthDestination } from "./destination";
import type { PasswordHasher } from "./password";
import {
  LOGIN_ACCOUNT_LIMIT,
  LOGIN_ACCOUNT_WINDOW_MS,
  LOGIN_IP_LIMIT,
  LOGIN_IP_WINDOW_MS,
  loginAccountBucket,
  loginIpBucket,
  stricterRetry,
  type RateLimiter,
} from "./rate-limit";
import { fieldErrorsFromZod, loginSchema, type FieldErrors } from "./schemas";
import { ABSOLUTE_SESSION_MS } from "./session-policy";
import { sha256 } from "./tokens";
import type { UserStore } from "./user-store";

export type LoginResult =
  | { status: "invalid"; fieldErrors: FieldErrors }
  | { status: "rate_limited"; retryAfterSeconds: number }
  | { status: "invalid_credentials" }
  | { status: "authenticated"; token: string; destination: string };

export async function loginAccount(
  input: {
    email: string;
    password: string;
    ip: string;
    next: string | null;
    now: Date;
    existingTokenHash: string | null;
  },
  deps: {
    users: UserStore;
    hasher: PasswordHasher;
    rateLimiter: RateLimiter;
    dummyHash: string;
    createToken: () => string;
  },
): Promise<LoginResult> {
  const parsed = loginSchema.safeParse({
    email: input.email,
    password: input.password,
  });
  if (!parsed.success) {
    return { status: "invalid", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const limit = stricterRetry(
    await deps.rateLimiter.hit(
      loginAccountBucket(parsed.data.email),
      LOGIN_ACCOUNT_LIMIT,
      LOGIN_ACCOUNT_WINDOW_MS,
    ),
    await deps.rateLimiter.hit(
      loginIpBucket(input.ip),
      LOGIN_IP_LIMIT,
      LOGIN_IP_WINDOW_MS,
    ),
  );
  if (!limit.allowed) {
    return {
      status: "rate_limited",
      retryAfterSeconds: limit.retryAfterSeconds,
    };
  }

  const user = await deps.users.findUserByEmail(parsed.data.email);
  const passwordHash = user?.passwordHash ?? deps.dummyHash;
  const matches = await deps.hasher.verify(passwordHash, parsed.data.password);
  if (!user || !user.emailVerifiedAt || !matches) {
    return { status: "invalid_credentials" };
  }

  if (input.existingTokenHash) {
    await deps.users.deleteSession(input.existingTokenHash);
  }

  const token = deps.createToken();
  await deps.users.insertSession({
    tokenHash: sha256(token),
    userId: user.id,
    createdAt: input.now,
    lastSeenAt: input.now,
    expiresAt: new Date(input.now.getTime() + ABSOLUTE_SESSION_MS),
  });

  return {
    status: "authenticated",
    token,
    destination: postAuthDestination(user, input.next),
  };
}
