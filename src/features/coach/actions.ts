"use server";

import { headers } from "next/headers";

import { getDb } from "@/db";
import { createDrizzleRateLimiter } from "@/features/auth/drizzle-rate-limiter";
import { lookupSession } from "@/features/auth/lookup-session";
import { rateLimitMessage } from "@/features/auth/copy";
import { isAllowedOriginFromHeaders } from "@/lib/allowed-origin";

import { COACH_PRIVACY_COPY } from "./copy";
import { deleteUserCoachChatHistory } from "./delete-chat-history";
import {
  COACH_PRIVACY_LIMIT,
  COACH_PRIVACY_WINDOW_MS,
  coachPrivacyBucket,
} from "./rate-limit";
import { revokeCoachConsent } from "./revoke-consent";
import { coachPrivacyMutationSchema } from "./schemas";

export type CoachPrivacyFormError = {
  code: "origin" | "unauthorized" | "rate_limit" | "server";
  message: string;
  retryAfterSeconds?: number;
};

export type CoachPrivacyActionResult =
  | { ok: true; deletedCount: number }
  | { ok: false; formError: CoachPrivacyFormError };

async function coachPrivacyContext(): Promise<
  { ok: true; userId: string } | { ok: false; formError: CoachPrivacyFormError }
> {
  const headerStore = await headers();
  if (!isAllowedOriginFromHeaders(headerStore)) {
    return {
      ok: false,
      formError: { code: "origin", message: COACH_PRIVACY_COPY.originError },
    };
  }
  const session = await lookupSession();
  if (session.status !== "ok") {
    return {
      ok: false,
      formError: {
        code: "unauthorized",
        message: COACH_PRIVACY_COPY.unauthorized,
      },
    };
  }
  const limiter = createDrizzleRateLimiter(getDb());
  const limited = await limiter.hit(
    coachPrivacyBucket(session.user.id),
    COACH_PRIVACY_LIMIT,
    COACH_PRIVACY_WINDOW_MS,
  );
  if (!limited.allowed) {
    return {
      ok: false,
      formError: {
        code: "rate_limit",
        message: rateLimitMessage(limited.retryAfterSeconds),
        retryAfterSeconds: limited.retryAfterSeconds,
      },
    };
  }
  return { ok: true, userId: session.user.id };
}

export async function deleteCoachChatHistoryAction(): Promise<CoachPrivacyActionResult> {
  const context = await coachPrivacyContext();
  if (!context.ok) return context;
  const parsed = coachPrivacyMutationSchema.safeParse({});
  if (!parsed.success) {
    return {
      ok: false,
      formError: { code: "server", message: COACH_PRIVACY_COPY.serverError },
    };
  }
  try {
    const deletedCount = await deleteUserCoachChatHistory(
      getDb(),
      context.userId,
    );
    return { ok: true, deletedCount };
  } catch {
    return {
      ok: false,
      formError: { code: "server", message: COACH_PRIVACY_COPY.serverError },
    };
  }
}

export async function revokeCoachConsentAction(): Promise<CoachPrivacyActionResult> {
  const context = await coachPrivacyContext();
  if (!context.ok) return context;
  const parsed = coachPrivacyMutationSchema.safeParse({});
  if (!parsed.success) {
    return {
      ok: false,
      formError: { code: "server", message: COACH_PRIVACY_COPY.serverError },
    };
  }
  try {
    const result = await revokeCoachConsent(getDb(), context.userId);
    if (!result.ok) {
      return {
        ok: false,
        formError: { code: "server", message: COACH_PRIVACY_COPY.serverError },
      };
    }
    return { ok: true, deletedCount: result.deletedMessages };
  } catch {
    return {
      ok: false,
      formError: { code: "server", message: COACH_PRIVACY_COPY.serverError },
    };
  }
}
