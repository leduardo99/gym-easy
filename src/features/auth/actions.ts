"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getDb } from "@/db";
import { getServerEnv } from "@/lib/env";

import { confirmEmail } from "./confirm-email";
import { openConfirmEmail, sealConfirmEmail } from "./confirm-email-cookie";
import { copy, rateLimitMessage } from "./copy";
import { RESEND_COOLDOWN_WINDOW_MS } from "./rate-limit";
import { postAuthDestination } from "./destination";
import { createDrizzleRateLimiter } from "./drizzle-rate-limiter";
import { createDrizzleUserStore } from "./drizzle-user-store";
import { createEmailSender } from "./email/create-email-sender";
import type { EmailSender } from "./email/types";
import { createHibpBreachChecker } from "./hibp";
import { loginAccount } from "./login-account";
import { lookupSession } from "./lookup-session";
import { argon2Hasher, getDummyPasswordHash } from "./password";
import { registerAccount } from "./register-account";
import { requestPasswordReset } from "./request-password-reset";
import { resendConfirmation } from "./resend-confirmation";
import {
  CONFIRM_EMAIL_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  clientIp,
  confirmEmailCookieOptions,
  isSameOrigin,
  requestOrigin,
  sessionCookieOptions,
  shouldUseSecureCookie,
} from "./session-cookie";
import type { FieldErrors } from "./schemas";
import { createOpaqueToken, createUserId, sha256 } from "./tokens";

export type AuthFormError = {
  code:
    "credentials" | "rate_limit" | "server" | "cooldown" | "expired" | "email";
  message: string;
  retryAfterSeconds?: number;
};

export type AuthActionResult =
  | { ok: true; redirectTo: string }
  | { ok: false; fieldErrors?: FieldErrors; formError?: AuthFormError };

export type ResendActionResult =
  { ok: true } | { ok: false; formError: AuthFormError };

export type PasswordResetActionResult =
  | { ok: true; message: string }
  | {
      ok: false;
      formError?: AuthFormError;
      fieldErrors?: FieldErrors;
    };

function emailSendError(): AuthFormError {
  return {
    code: "email",
    message: copy.emailSendFailed,
    retryAfterSeconds: RESEND_COOLDOWN_WINDOW_MS / 1000,
  };
}

let lastEmailMs = 200;

function timedEmailSender(inner: EmailSender): EmailSender {
  return {
    async sendAccountConfirmation(message) {
      const started = performance.now();
      try {
        await inner.sendAccountConfirmation(message);
      } finally {
        lastEmailMs = performance.now() - started;
      }
    },
    async sendAccountExistsNotice(message) {
      const started = performance.now();
      try {
        await inner.sendAccountExistsNotice(message);
      } finally {
        lastEmailMs = performance.now() - started;
      }
    },
    async sendPasswordReset(message) {
      const started = performance.now();
      try {
        await inner.sendPasswordReset(message);
      } finally {
        lastEmailMs = performance.now() - started;
      }
    },
    async probe() {
      const started = performance.now();
      try {
        await inner.probe();
      } finally {
        lastEmailMs = performance.now() - started;
      }
    },
  };
}

function serverError(): AuthFormError {
  return { code: "server", message: copy.server };
}

function readString(input: unknown, key: string): string {
  if (!input || typeof input !== "object" || !(key in input)) return "";
  const value = (input as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

function readNext(input: unknown): string | null {
  if (!input || typeof input !== "object" || !("next" in input)) return null;
  const value = (input as { next?: unknown }).next;
  return typeof value === "string" ? value : null;
}

async function mutationContext() {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  if (!isSameOrigin(headerStore.get("origin"), host)) return null;
  const origin = requestOrigin(headerStore);
  if (!origin) return null;
  const jar = await cookies();
  const existing = jar.get(SESSION_COOKIE_NAME)?.value;
  return {
    ip: clientIp(headerStore),
    secure: shouldUseSecureCookie(headerStore.get("x-forwarded-proto")),
    existingTokenHash: existing ? sha256(existing) : null,
  };
}

function logAuthFailure(event: string, error: unknown) {
  console.error(event, error instanceof Error ? error.name : "error");
}

export async function signupAction(input: unknown): Promise<AuthActionResult> {
  const context = await mutationContext();
  if (!context) return { ok: false, formError: serverError() };

  try {
    const result = await registerAccount(
      {
        name: readString(input, "name"),
        email: readString(input, "email"),
        password: readString(input, "password"),
        ip: context.ip,
        origin: getServerEnv().APP_URL,
        now: new Date(),
      },
      {
        users: createDrizzleUserStore(getDb()),
        emails: timedEmailSender(createEmailSender(getServerEnv())),
        hasher: argon2Hasher,
        breaches: createHibpBreachChecker(),
        rateLimiter: createDrizzleRateLimiter(getDb()),
        createId: createUserId,
        createToken: createOpaqueToken,
      },
    );

    if (result.status === "pending") {
      const delivery = await result.deliver();
      const jar = await cookies();
      jar.set(
        CONFIRM_EMAIL_COOKIE_NAME,
        sealConfirmEmail(result.email, getServerEnv().CONFIRM_EMAIL_SECRET),
        confirmEmailCookieOptions(context.secure),
      );
      const failed = delivery === "failed" ? "&delivery=failed" : "";
      return {
        ok: true,
        redirectTo: `/cadastro/confirme?fresh=1${failed}`,
      };
    }
    if (result.status === "invalid") {
      return { ok: false, fieldErrors: result.fieldErrors };
    }
    if (result.status === "breached") {
      return { ok: false, fieldErrors: { password: copy.passwordBreached } };
    }
    if (result.status === "rate_limited") {
      return {
        ok: false,
        formError: {
          code: "rate_limit",
          message: rateLimitMessage(result.retryAfterSeconds),
          retryAfterSeconds: result.retryAfterSeconds,
        },
      };
    }
    return { ok: false, formError: serverError() };
  } catch (error) {
    logAuthFailure("auth.signup_failed", error);
    return { ok: false, formError: serverError() };
  }
}

export async function loginAction(input: unknown): Promise<AuthActionResult> {
  const context = await mutationContext();
  if (!context) return { ok: false, formError: serverError() };

  try {
    const result = await loginAccount(
      {
        email: readString(input, "email"),
        password: readString(input, "password"),
        ip: context.ip,
        next: readNext(input),
        now: new Date(),
        existingTokenHash: context.existingTokenHash,
      },
      {
        users: createDrizzleUserStore(getDb()),
        hasher: argon2Hasher,
        rateLimiter: createDrizzleRateLimiter(getDb()),
        dummyHash: await getDummyPasswordHash(),
        createToken: createOpaqueToken,
      },
    );

    if (result.status === "authenticated") {
      const jar = await cookies();
      jar.set(
        SESSION_COOKIE_NAME,
        result.token,
        sessionCookieOptions(context.secure),
      );
      return { ok: true, redirectTo: result.destination };
    }
    if (result.status === "invalid") {
      return { ok: false, fieldErrors: result.fieldErrors };
    }
    if (result.status === "rate_limited") {
      return {
        ok: false,
        formError: {
          code: "rate_limit",
          message: rateLimitMessage(result.retryAfterSeconds),
          retryAfterSeconds: result.retryAfterSeconds,
        },
      };
    }
    return {
      ok: false,
      formError: { code: "credentials", message: copy.loginInvalid },
    };
  } catch (error) {
    logAuthFailure("auth.login_failed", error);
    return { ok: false, formError: serverError() };
  }
}

export async function confirmEmailAction(
  input: unknown,
): Promise<AuthActionResult> {
  const context = await mutationContext();
  if (!context) return { ok: false, formError: serverError() };

  try {
    const result = await confirmEmail(
      readString(input, "token"),
      { now: new Date(), existingTokenHash: context.existingTokenHash },
      {
        users: createDrizzleUserStore(getDb()),
        createToken: createOpaqueToken,
      },
    );
    if (result.status !== "confirmed") {
      return {
        ok: false,
        formError: { code: "expired", message: copy.linkExpired },
      };
    }
    const jar = await cookies();
    jar.set(
      SESSION_COOKIE_NAME,
      result.token,
      sessionCookieOptions(context.secure),
    );
    return { ok: true, redirectTo: "/onboarding" };
  } catch (error) {
    logAuthFailure("auth.confirm_failed", error);
    return { ok: false, formError: serverError() };
  }
}

export async function resendConfirmationAction(): Promise<ResendActionResult> {
  const context = await mutationContext();
  if (!context) return { ok: false, formError: serverError() };
  const jar = await cookies();
  const email =
    openConfirmEmail(
      jar.get(CONFIRM_EMAIL_COOKIE_NAME)?.value ?? "",
      getServerEnv().CONFIRM_EMAIL_SECRET,
    ) ?? "";

  try {
    const result = await resendConfirmation(
      {
        email,
        origin: getServerEnv().APP_URL,
        now: new Date(),
      },
      {
        users: createDrizzleUserStore(getDb()),
        emails: timedEmailSender(createEmailSender(getServerEnv())),
        hasher: argon2Hasher,
        rateLimiter: createDrizzleRateLimiter(getDb()),
        createToken: createOpaqueToken,
        balance: () =>
          new Promise((resolve) => {
            setTimeout(resolve, lastEmailMs);
          }),
      },
    );
    if (result.status === "sent") {
      const delivery = await result.deliver();
      if (delivery === "failed") {
        return { ok: false, formError: emailSendError() };
      }
      return { ok: true };
    }
    if (result.status === "cooldown") {
      return {
        ok: false,
        formError: {
          code: "cooldown",
          message: rateLimitMessage(result.retryAfterSeconds),
          retryAfterSeconds: result.retryAfterSeconds,
        },
      };
    }
    if (result.status === "rate_limited") {
      return {
        ok: false,
        formError: {
          code: "rate_limit",
          message: rateLimitMessage(result.retryAfterSeconds),
          retryAfterSeconds: result.retryAfterSeconds,
        },
      };
    }
    return { ok: false, formError: serverError() };
  } catch (error) {
    logAuthFailure("auth.resend_failed", error);
    return { ok: false, formError: serverError() };
  }
}

export async function requestPasswordResetAction(
  input: unknown,
): Promise<PasswordResetActionResult> {
  const context = await mutationContext();
  if (!context) return { ok: false, formError: serverError() };

  try {
    const result = await requestPasswordReset(
      { email: readString(input, "email") },
      {
        users: createDrizzleUserStore(getDb()),
        emails: timedEmailSender(createEmailSender(getServerEnv())),
        rateLimiter: createDrizzleRateLimiter(getDb()),
        balance: () =>
          new Promise((resolve) => {
            setTimeout(resolve, lastEmailMs);
          }),
      },
    );
    if (result.status === "accepted") {
      const delivery = await result.deliver();
      if (delivery === "failed") {
        return { ok: false, formError: emailSendError() };
      }
      return { ok: true, message: copy.passwordResetAccepted };
    }
    if (result.status === "invalid") {
      return { ok: false, fieldErrors: result.fieldErrors };
    }
    if (result.status === "cooldown" || result.status === "rate_limited") {
      return {
        ok: false,
        formError: {
          code: result.status === "cooldown" ? "cooldown" : "rate_limit",
          message: rateLimitMessage(result.retryAfterSeconds),
          retryAfterSeconds: result.retryAfterSeconds,
        },
      };
    }
    return { ok: false, formError: serverError() };
  } catch (error) {
    logAuthFailure("auth.password_reset_failed", error);
    return { ok: false, formError: serverError() };
  }
}

export async function logoutAction(): Promise<void> {
  const context = await mutationContext();
  if (context?.existingTokenHash) {
    await createDrizzleUserStore(getDb()).deleteSession(
      context.existingTokenHash,
    );
  }
  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, "", {
    ...sessionCookieOptions(context?.secure ?? false),
    maxAge: 0,
  });
  redirect("/");
}

export async function skipOnboardingAction(): Promise<void> {
  const context = await mutationContext();
  if (!context) redirect("/onboarding");
  const session = await lookupSession();
  if (session.status !== "ok") redirect("/login?next=%2Fonboarding");
  await createDrizzleUserStore(getDb()).markOnboardingComplete(
    session.user.id,
    new Date(),
  );
  redirect(
    postAuthDestination({ onboardingCompletedAt: new Date() }, "/inicio"),
  );
}
