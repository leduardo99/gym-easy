"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getDb } from "@/db";
import { loginRedirectPath } from "@/features/auth/destination";
import { lookupSession } from "@/features/auth/lookup-session";
import { isAllowedOriginFromHeaders } from "@/lib/allowed-origin";

import {
  RECONSENT_FALLBACK,
  parseReconsentScope,
  reconsentPath,
  safeReconsentNext,
  submitReconsent,
} from "./reconsent";

function readField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

async function requireSameOriginSession(
  returnPath: string,
): Promise<{ ok: true; userId: string } | { ok: false }> {
  const headerStore = await headers();
  if (!isAllowedOriginFromHeaders(headerStore)) return { ok: false };
  const session = await lookupSession();
  if (session.status !== "ok") {
    redirect(loginRedirectPath(session.status, returnPath));
  }
  return { ok: true, userId: session.user.id };
}

export async function acceptReconsentAction(formData: FormData) {
  const scopeValue = readField(formData, "scope");
  const scope = parseReconsentScope(scopeValue);
  const nextPath = safeReconsentNext(readField(formData, "next"));
  const returnPath = scope
    ? reconsentPath(scope, nextPath)
    : RECONSENT_FALLBACK;
  const session = await requireSameOriginSession(returnPath);
  if (!session.ok) {
    redirect(
      scope ? reconsentPath(scope, nextPath, "origin") : RECONSENT_FALLBACK,
    );
  }

  const result = await submitReconsent(getDb(), session.userId, {
    scope: scopeValue,
    intent: "grant",
    accepted: formData.get("accepted") === "sim",
    transferAccepted: formData.get("transferAccepted") === "sim",
  });
  if (result.status === "granted") redirect(nextPath);
  if (result.status === "needs_checkbox" && scope) {
    redirect(reconsentPath(scope, nextPath, "checkbox"));
  }
  redirect(RECONSENT_FALLBACK);
}

export async function refuseReconsentAction(formData: FormData) {
  const scopeValue = readField(formData, "scope");
  const scope = parseReconsentScope(scopeValue);
  const nextPath = safeReconsentNext(readField(formData, "next"));
  const returnPath = scope
    ? reconsentPath(scope, nextPath)
    : RECONSENT_FALLBACK;
  const session = await requireSameOriginSession(returnPath);
  if (!session.ok) {
    redirect(
      scope ? reconsentPath(scope, nextPath, "origin") : RECONSENT_FALLBACK,
    );
  }

  await submitReconsent(getDb(), session.userId, {
    scope: scopeValue,
    intent: "refuse",
    accepted: false,
  });
  if (!scope) redirect(RECONSENT_FALLBACK);
  redirect(reconsentPath(scope, nextPath, "refused"));
}
