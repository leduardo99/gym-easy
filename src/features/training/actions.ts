"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getDb } from "@/db";
import {
  loginRedirectPath,
  postAuthDestination,
} from "@/features/auth/destination";
import { createDrizzleRateLimiter } from "@/features/auth/drizzle-rate-limiter";
import { createDrizzleUserStore } from "@/features/auth/drizzle-user-store";
import { lookupSession } from "@/features/auth/lookup-session";
import {
  parseOnboardingBirthYearForm,
  parseProfileFormData,
  profileFormErrorFlag,
  type ProfileFormValidationError,
} from "@/features/profile/parse-profile-form";
import {
  PROFILE_SAVE_LIMIT,
  PROFILE_SAVE_WINDOW_MS,
  profileSaveBucket,
} from "@/features/profile/rate-limit";
import { isAllowedOriginFromHeaders } from "@/lib/allowed-origin";
import { reconsentPath } from "@/features/consent/reconsent";

import { createTrainingRepository } from "./repository";
import {
  createOnboardingBirthYearInputSchema,
  createProfileInputSchema,
} from "./schemas";

type ProfileRedirectFlag =
  "guardado" | ProfileFormValidationError | "origem" | "limite";

function redirectToProfile(flag: ProfileRedirectFlag): never {
  if (flag === "guardado") redirect("/perfil?guardado=1");
  redirect(`/perfil?erro=${flag}`);
}

function redirectToOnboarding(flag: ProfileRedirectFlag): never {
  if (flag === "guardado") redirect("/onboarding?guardado=1");
  redirect(`/onboarding?erro=${flag}`);
}

async function enforceProfileSaveRateLimit(
  userId: string,
  target: "perfil" | "onboarding",
): Promise<void> {
  const limited = await createDrizzleRateLimiter(getDb()).hit(
    profileSaveBucket(userId),
    PROFILE_SAVE_LIMIT,
    PROFILE_SAVE_WINDOW_MS,
  );
  if (!limited.allowed) {
    if (target === "perfil") redirectToProfile("limite");
    redirectToOnboarding("limite");
  }
}

async function saveProfileFromForm(
  formData: FormData,
  userId: string,
): Promise<
  | { ok: true }
  | {
      ok: false;
      error: "consent_required" | "invalid" | "repo";
      flag?: ProfileFormValidationError;
    }
> {
  const parsed = createProfileInputSchema(new Date()).safeParse(
    parseProfileFormData(formData),
  );
  if (!parsed.success) {
    return { ok: false, error: "invalid", flag: profileFormErrorFlag(parsed) };
  }

  const result = await createTrainingRepository(getDb()).saveProfile(
    userId,
    parsed.data,
  );
  if (!result.ok && result.error === "consent_required") {
    return { ok: false, error: "consent_required" };
  }
  if (!result.ok) return { ok: false, error: "repo", flag: "perfil" };
  return { ok: true };
}

export async function saveProfileAction(formData: FormData) {
  const headerStore = await headers();
  if (!isAllowedOriginFromHeaders(headerStore)) {
    redirectToProfile("origem");
  }
  const session = await lookupSession();
  if (session.status !== "ok") {
    redirect(loginRedirectPath(session.status, "/perfil"));
  }

  await enforceProfileSaveRateLimit(session.user.id, "perfil");

  const saved = await saveProfileFromForm(formData, session.user.id);
  if (!saved.ok && saved.error === "consent_required") {
    redirect(reconsentPath("body_data", "/perfil"));
  }
  if (!saved.ok) redirectToProfile(saved.flag ?? "perfil");
  redirectToProfile("guardado");
}

export async function saveOnboardingProfileAction(formData: FormData) {
  const headerStore = await headers();
  if (!isAllowedOriginFromHeaders(headerStore)) {
    redirectToOnboarding("origem");
  }
  const session = await lookupSession();
  if (session.status !== "ok") {
    redirect(loginRedirectPath(session.status, "/onboarding"));
  }

  await enforceProfileSaveRateLimit(session.user.id, "onboarding");

  const now = new Date();
  const parsed = createOnboardingBirthYearInputSchema(now).safeParse(
    parseOnboardingBirthYearForm(formData),
  );
  if (!parsed.success) {
    redirectToOnboarding(profileFormErrorFlag(parsed));
  }

  const completedAt = new Date();
  const db = getDb();
  await db.transaction(async (tx) => {
    const result = await createTrainingRepository(tx).saveProfile(
      session.user.id,
      { birthYear: parsed.data.birthYear },
    );
    if (!result.ok && result.error === "consent_required") {
      redirect(reconsentPath("body_data", "/onboarding"));
    }
    if (!result.ok) redirectToOnboarding("perfil");
    await createDrizzleUserStore(tx).markOnboardingComplete(
      session.user.id,
      completedAt,
    );
  });
  redirect(
    postAuthDestination({ onboardingCompletedAt: completedAt }, "/inicio"),
  );
}
