"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getDb } from "@/db";
import { loginRedirectPath } from "@/features/auth/destination";
import { lookupSession } from "@/features/auth/lookup-session";
import { isAllowedOriginFromHeaders } from "@/lib/allowed-origin";
import { reconsentPath } from "@/features/consent/reconsent";

import { createTrainingRepository } from "./repository";
import { createProfileInputSchema } from "./schemas";

function redirectToProfile(flag: "guardado" | "altura" | "origem"): never {
  if (flag === "guardado") redirect("/perfil?guardado=1");
  redirect(`/perfil?erro=${flag}`);
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

  const raw = formData.get("heightCm");
  const text = typeof raw === "string" ? raw.trim() : "";
  const heightCm = /^\d+$/.test(text) ? Number(text) : Number.NaN;
  const parsed = createProfileInputSchema(new Date()).safeParse({ heightCm });
  if (!parsed.success) redirectToProfile("altura");

  const result = await createTrainingRepository(getDb()).saveProfile(
    session.user.id,
    parsed.data,
  );
  if (!result.ok && result.error === "consent_required") {
    redirect(reconsentPath("body_data", "/perfil"));
  }
  if (!result.ok) redirectToProfile("altura");
  redirectToProfile("guardado");
}
