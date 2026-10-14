import { settleEmailDelivery } from "./email/settle-delivery";
import type { EmailDelivery, EmailSender } from "./email/types";
import {
  RESEND_COOLDOWN_LIMIT,
  RESEND_COOLDOWN_WINDOW_MS,
  RESEND_HOUR_LIMIT,
  RESEND_HOUR_WINDOW_MS,
  passwordResetCooldownBucket,
  passwordResetHourBucket,
  type RateLimiter,
} from "./rate-limit";
import { emailSchema, fieldErrorsFromZod, type FieldErrors } from "./schemas";
import type { UserStore } from "./user-store";

export type PasswordResetResult =
  | { status: "accepted"; deliver: () => Promise<EmailDelivery> }
  | { status: "invalid"; fieldErrors: FieldErrors }
  | { status: "cooldown"; retryAfterSeconds: number }
  | { status: "rate_limited"; retryAfterSeconds: number };

export async function requestPasswordReset(
  input: { email: string },
  deps: {
    users: UserStore;
    emails: EmailSender;
    rateLimiter: RateLimiter;
    balance: () => Promise<void>;
  },
): Promise<PasswordResetResult> {
  const parsed = emailSchema.safeParse(input.email);
  if (!parsed.success) {
    return { status: "invalid", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const cooldown = await deps.rateLimiter.hit(
    passwordResetCooldownBucket(parsed.data),
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
    passwordResetHourBucket(parsed.data),
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
  const deliver = user
    ? settleEmailDelivery("auth.password_reset_email_failed", () =>
        deps.emails.sendPasswordReset({ to: user.email }),
      )
    : settleEmailDelivery("auth.password_reset_email_failed", () =>
        Promise.all([deps.balance(), deps.emails.probe()]).then(
          () => undefined,
        ),
      );

  return { status: "accepted", deliver };
}
