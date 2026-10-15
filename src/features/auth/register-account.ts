import { copy } from "./copy";
import { settleEmailDelivery } from "./email/settle-delivery";
import type { EmailDelivery, EmailSender } from "./email/types";
import type { PasswordBreachChecker } from "./hibp";
import type { PasswordHasher } from "./password";
import {
  RESEND_COOLDOWN_LIMIT,
  RESEND_COOLDOWN_WINDOW_MS,
  SIGNUP_IP_WINDOW_MS,
  resolveSignupIpLimit,
  resendCooldownBucket,
  signupIpBucket,
  type RateLimiter,
} from "./rate-limit";
import { fieldErrorsFromZod, signupSchema, type FieldErrors } from "./schemas";
import { CONFIRMATION_TTL_MS } from "./session-policy";
import { sha256 } from "./tokens";
import type { UserStore } from "./user-store";

export type RegisterResult =
  | {
      status: "pending";
      email: string;
      deliver: () => Promise<EmailDelivery>;
    }
  | { status: "invalid"; fieldErrors: FieldErrors }
  | { status: "breached" }
  | { status: "rate_limited"; retryAfterSeconds: number }
  | { status: "server_error" };

export async function registerAccount(
  input: {
    name: string;
    email: string;
    password: string;
    ip: string | null;
    origin: string;
    now: Date;
  },
  deps: {
    users: UserStore;
    emails: EmailSender;
    hasher: PasswordHasher;
    breaches: PasswordBreachChecker;
    rateLimiter: RateLimiter;
    createId: () => string;
    createToken: () => string;
  },
): Promise<RegisterResult> {
  const parsed = signupSchema.safeParse({
    name: input.name,
    email: input.email,
    password: input.password,
  });
  if (!parsed.success) {
    return {
      status: "invalid",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  if (input.ip) {
    const limit = await deps.rateLimiter.hit(
      signupIpBucket(input.ip),
      resolveSignupIpLimit(),
      SIGNUP_IP_WINDOW_MS,
    );
    if (!limit.allowed) {
      return {
        status: "rate_limited",
        retryAfterSeconds: limit.retryAfterSeconds,
      };
    }
  }

  if (await deps.breaches.isBreached(parsed.data.password)) {
    return { status: "breached" };
  }

  let deliver: () => Promise<EmailDelivery>;
  try {
    const existing = await deps.users.findUserByEmail(parsed.data.email);
    if (existing) {
      // argon2id of the received password is not stored.
      await deps.users.insertUser({
        id: deps.createId(),
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash: await deps.hasher.hash(parsed.data.password),
      });
      deliver = settleEmailDelivery("auth.signup_email_failed", () =>
        deps.emails.sendAccountExistsNotice({ to: parsed.data.email }),
      );
    } else {
      const id = deps.createId();
      const passwordHash = await deps.hasher.hash(parsed.data.password);
      const outcome = await deps.users.insertUser({
        id,
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
      });
      if (outcome === "exists") {
        deliver = settleEmailDelivery("auth.signup_email_failed", () =>
          deps.emails.sendAccountExistsNotice({ to: parsed.data.email }),
        );
      } else {
        const token = deps.createToken();
        const tokenHash = sha256(token);
        const expiresAt = new Date(input.now.getTime() + CONFIRMATION_TTL_MS);
        const confirmUrl = `${input.origin}/cadastro/confirmar?token=${encodeURIComponent(token)}`;
        deliver = settleEmailDelivery("auth.signup_email_failed", async () => {
          await deps.users.saveVerificationToken({
            tokenHash,
            userId: id,
            expiresAt,
          });
          await deps.emails.sendAccountConfirmation({
            to: parsed.data.email,
            confirmUrl,
          });
        });
      }
    }
  } catch {
    return { status: "server_error" };
  }

  await deps.rateLimiter.hit(
    resendCooldownBucket(parsed.data.email),
    RESEND_COOLDOWN_LIMIT,
    RESEND_COOLDOWN_WINDOW_MS,
  );

  return { status: "pending", email: parsed.data.email, deliver };
}

export function signupFieldMessage(status: "breached"): string {
  return status === "breached" ? copy.passwordBreached : copy.server;
}
