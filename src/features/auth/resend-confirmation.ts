import type { EmailSender } from "./email/types";
import type { PasswordHasher } from "./password";
import {
  RESEND_COOLDOWN_LIMIT,
  RESEND_COOLDOWN_WINDOW_MS,
  RESEND_HOUR_LIMIT,
  RESEND_HOUR_WINDOW_MS,
  resendCooldownBucket,
  resendHourBucket,
  type RateLimiter,
} from "./rate-limit";
import { emailSchema } from "./schemas";
import { CONFIRMATION_TTL_MS } from "./session-policy";
import { sha256 } from "./tokens";
import type { UserStore } from "./user-store";

export type ResendResult =
  | { status: "sent" }
  | { status: "cooldown"; retryAfterSeconds: number }
  | { status: "rate_limited"; retryAfterSeconds: number }
  | { status: "invalid" }
  | { status: "server_error" };

export async function resendConfirmation(
  input: { email: string; origin: string; now: Date },
  deps: {
    users: UserStore;
    emails: EmailSender;
    hasher: PasswordHasher;
    rateLimiter: RateLimiter;
    createToken: () => string;
    balance: () => Promise<void>;
  },
): Promise<ResendResult> {
  const parsed = emailSchema.safeParse(input.email);
  if (!parsed.success) return { status: "invalid" };

  const cooldown = await deps.rateLimiter.hit(
    resendCooldownBucket(parsed.data),
    RESEND_COOLDOWN_LIMIT,
    RESEND_COOLDOWN_WINDOW_MS,
  );
  if (!cooldown.allowed) {
    return {
      status: "cooldown",
      retryAfterSeconds: cooldown.retryAfterSeconds,
    };
  }

  const hour = await deps.rateLimiter.hit(
    resendHourBucket(parsed.data),
    RESEND_HOUR_LIMIT,
    RESEND_HOUR_WINDOW_MS,
  );
  if (!hour.allowed) {
    return {
      status: "rate_limited",
      retryAfterSeconds: hour.retryAfterSeconds,
    };
  }

  const user = await deps.users.findUserByEmail(parsed.data);
  try {
    if (!user) {
      await deps.hasher.hash(deps.createToken());
      await deps.balance();
      return { status: "sent" };
    }

    if (!user.emailVerifiedAt) {
      await deps.users.invalidateVerificationTokens(user.id, input.now);
      const token = deps.createToken();
      await deps.users.saveVerificationToken({
        tokenHash: sha256(token),
        userId: user.id,
        expiresAt: new Date(input.now.getTime() + CONFIRMATION_TTL_MS),
      });
      await deps.emails.sendAccountConfirmation({
        to: user.email,
        confirmUrl: `${input.origin}/cadastro/confirmar?token=${encodeURIComponent(token)}`,
      });
      return { status: "sent" };
    }

    await deps.emails.sendAccountExistsNotice({ to: user.email });
    return { status: "sent" };
  } catch (error) {
    console.error(
      "auth.resend_email_failed",
      error instanceof Error ? error.name : "error",
    );
    try {
      await deps.hasher.hash(deps.createToken());
    } catch {
      // The extra hash only keeps the failure near the unknown-email path.
    }
    await deps.balance();
    return { status: "sent" };
  }
}
