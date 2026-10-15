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
import {
  revokeCoachChatConsent,
  revokeCoachHealthConsent,
} from "./revoke-consent";
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

async function runPrivacyMutation(
  work: (
    userId: string,
  ) => Promise<{ ok: true; deletedCount: number } | { ok: false }>,
): Promise<CoachPrivacyActionResult> {
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
    const result = await work(context.userId);
    if (!result.ok) {
      return {
        ok: false,
        formError: { code: "server", message: COACH_PRIVACY_COPY.serverError },
      };
    }
    return { ok: true, deletedCount: result.deletedCount };
  } catch {
    return {
      ok: false,
      formError: { code: "server", message: COACH_PRIVACY_COPY.serverError },
    };
  }
}

export async function deleteCoachChatHistoryAction(): Promise<CoachPrivacyActionResult> {
  return runPrivacyMutation(async (userId) => {
    const deletedCount = await deleteUserCoachChatHistory(getDb(), userId);
    return { ok: true, deletedCount };
  });
}

export async function revokeCoachHealthConsentAction(): Promise<CoachPrivacyActionResult> {
  return runPrivacyMutation(async (userId) => {
    const result = await revokeCoachHealthConsent(getDb(), userId, "profile");
    if (!result.ok) return { ok: false };
    return { ok: true, deletedCount: result.deletedProposals };
  });
}

export async function revokeCoachChatConsentAction(): Promise<CoachPrivacyActionResult> {
  return runPrivacyMutation(async (userId) => {
    const result = await revokeCoachChatConsent(getDb(), userId, "profile");
    if (!result.ok) return { ok: false };
    return { ok: true, deletedCount: result.deletedMessages };
  });
}
