"use server";

import { headers } from "next/headers";

import { getDb } from "@/db";
import { rateLimitMessage } from "@/features/auth/copy";
import { createDrizzleRateLimiter } from "@/features/auth/drizzle-rate-limiter";
import { lookupSession } from "@/features/auth/lookup-session";
import { isAllowedOriginFromHeaders } from "@/lib/allowed-origin";

import { BODY_DATA_PRIVACY_COPY } from "./body-data-copy";
import {
  BODY_DATA_PRIVACY_LIMIT,
  BODY_DATA_PRIVACY_WINDOW_MS,
  bodyDataPrivacyBucket,
} from "./rate-limit";
import { revokeBodyDataConsent } from "./revoke-body-data";

export type BodyDataPrivacyFormError = {
  code: "origin" | "unauthorized" | "rate_limit" | "server";
  message: string;
  retryAfterSeconds?: number;
};

export type BodyDataPrivacyActionResult =
  { ok: true } | { ok: false; formError: BodyDataPrivacyFormError };

async function bodyDataPrivacyContext(): Promise<
  | { ok: true; userId: string }
  | { ok: false; formError: BodyDataPrivacyFormError }
> {
  const headerStore = await headers();
  if (!isAllowedOriginFromHeaders(headerStore)) {
    return {
      ok: false,
      formError: {
        code: "origin",
        message: BODY_DATA_PRIVACY_COPY.originError,
      },
    };
  }
  const session = await lookupSession();
  if (session.status !== "ok") {
    return {
      ok: false,
      formError: {
        code: "unauthorized",
        message: BODY_DATA_PRIVACY_COPY.unauthorized,
      },
    };
  }
  const limiter = createDrizzleRateLimiter(getDb());
  const limited = await limiter.hit(
    bodyDataPrivacyBucket(session.user.id),
    BODY_DATA_PRIVACY_LIMIT,
    BODY_DATA_PRIVACY_WINDOW_MS,
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

export async function revokeBodyDataConsentAction(): Promise<BodyDataPrivacyActionResult> {
  const context = await bodyDataPrivacyContext();
  if (!context.ok) return context;
  try {
    const result = await revokeBodyDataConsent(getDb(), context.userId);
    if (!result.ok) {
      return {
        ok: false,
        formError: {
          code: "server",
          message: BODY_DATA_PRIVACY_COPY.serverError,
        },
      };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      formError: {
        code: "server",
        message: BODY_DATA_PRIVACY_COPY.serverError,
      },
    };
  }
}
