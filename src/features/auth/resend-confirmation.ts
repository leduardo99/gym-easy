import { settleEmailDelivery } from "./email/settle-delivery";
import type { EmailDelivery, EmailSender } from "./email/types";
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
  | { status: "sent"; deliver: () => Promise<EmailDelivery> }
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
  let deliver: () => Promise<EmailDelivery>;
  try {
    const token = deps.createToken();
    // The digest is discarded. Both branches pay the same hash cost.
    await deps.hasher.hash(token);
    if (!user) {
      deliver = settleEmailDelivery("auth.resend_email_failed", () =>
        Promise.all([deps.balance(), deps.emails.probe()]).then(
          () => undefined,
        ),
      );
    } else if (!user.emailVerifiedAt) {
      await deps.users.invalidateVerificationTokens(user.id, input.now);
      await deps.users.saveVerificationToken({
        tokenHash: sha256(token),
        userId: user.id,
        expiresAt: new Date(input.now.getTime() + CONFIRMATION_TTL_MS),
      });
      const confirmUrl = `${input.origin}/cadastro/confirmar?token=${encodeURIComponent(token)}`;
      deliver = settleEmailDelivery("auth.resend_email_failed", () =>
        deps.emails.sendAccountConfirmation({ to: user.email, confirmUrl }),
      );
    } else {
      deliver = settleEmailDelivery("auth.resend_email_failed", () =>
        deps.emails.sendAccountExistsNotice({ to: user.email }),
      );
    }
  } catch (error) {
    console.error(
      "auth.resend_email_failed",
      error instanceof Error ? error.name : "error",
    );
    deliver = settleEmailDelivery("auth.resend_email_failed", () =>
      deps.balance(),
    );
  }

  return { status: "sent", deliver };
}
