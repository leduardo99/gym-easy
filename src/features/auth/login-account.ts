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

/** Failed attempts in the account window: 0 ms, then 0.5, 1, 2 and 4 s. */
export const LOGIN_FAILURE_DELAY_CAP_MS = 4_000;

export function loginFailureDelayMs(failures: number): number {
  if (failures <= 1) return 0;
  const step = Math.min(failures - 2, 3);
  return Math.min(LOGIN_FAILURE_DELAY_CAP_MS, 500 * 2 ** step);
}

function waitForFailureDelay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export type LoginResult =
  | { status: "invalid"; fieldErrors: FieldErrors }
  | { status: "rate_limited"; retryAfterSeconds: number }
  | { status: "invalid_credentials" }
  | { status: "authenticated"; token: string; destination: string };

export async function loginAccount(
  input: {
    email: string;
    password: string;
    ip: string | null;
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
    delay?: (ms: number) => Promise<void>;
  },
): Promise<LoginResult> {
  const parsed = loginSchema.safeParse({
    email: input.email,
    password: input.password,
  });
  if (!parsed.success) {
    return { status: "invalid", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const accountLimit = await deps.rateLimiter.hit(
    loginAccountBucket(parsed.data.email),
    LOGIN_ACCOUNT_LIMIT,
    LOGIN_ACCOUNT_WINDOW_MS,
  );
  const ipLimit = input.ip
    ? await deps.rateLimiter.hit(
        loginIpBucket(input.ip),
        LOGIN_IP_LIMIT,
        LOGIN_IP_WINDOW_MS,
      )
    : { allowed: true, retryAfterSeconds: 0 };
  const limit = stricterRetry(accountLimit, ipLimit);
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
    const waitMs = loginFailureDelayMs(accountLimit.hits);
    if (waitMs > 0) {
      await (deps.delay ?? waitForFailureDelay)(waitMs);
    }
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
