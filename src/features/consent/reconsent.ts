import type { AppDatabase } from "@/db";
import type { ConsentPurpose } from "@/db/domain";
import { isAllowedNext } from "@/features/auth/destination";

import { CONSENT_TEXTS } from "@/consent/texts";

import type { ConsentEvent } from "./repository";
import { createConsentRepository } from "./repository";

/** Finalidades que a página pode gravar, incluindo o chat. */
export const RECONSENT_SCOPES = [
  "body_data",
  "coach_health",
  "coach_chat",
  "analytics",
] as const satisfies readonly ConsentPurpose[];

export type ReconsentScope = (typeof RECONSENT_SCOPES)[number];

export const RECONSENT_FALLBACK = "/perfil";

export const RECONSENT_COPY = {
  intro:
    "O texto desta autorização mudou, ou ainda não há uma autorização atual. Leia a versão vigente para continuar.",
  accept: "Autorizar",
  refuse: "Agora não",
  refused: "Nada foi gravado. Sem esta autorização, a ação continua bloqueada.",
  checkbox: "Marque a autorização para continuar.",
  scope: "Esta finalidade não pode ser autorizada por aqui.",
  origin: "Não foi possível guardar. Atualize a página e tente de novo.",
} as const;

export function parseReconsentScope(
  value: string | null | undefined,
): ReconsentScope | null {
  if (!value) return null;
  return (RECONSENT_SCOPES as readonly string[]).includes(value)
    ? (value as ReconsentScope)
    : null;
}

/** Path relativo da allowlist. A própria página não serve de destino. */
export function safeReconsentNext(value: string | null | undefined): string {
  if (!value || !isAllowedNext(value)) return RECONSENT_FALLBACK;
  const path = value.split("?")[0]?.split("#")[0] ?? "";
  if (path === "/consentimento" || path.startsWith("/consentimento/")) {
    return RECONSENT_FALLBACK;
  }
  return value;
}

export function reconsentPath(
  scope: ReconsentScope,
  nextPath: string,
  notice?: "refused" | "checkbox" | "origin",
): string {
  const params = new URLSearchParams();
  params.set("scope", scope);
  params.set("next", safeReconsentNext(nextPath));
  if (notice === "refused") params.set("recusado", "1");
  if (notice === "checkbox") params.set("erro", "caixa");
  if (notice === "origin") params.set("erro", "origem");
  return `/consentimento?${params.toString()}`;
}

export type ReconsentSubmission = {
  scope: string;
  intent: "grant" | "refuse";
  accepted: boolean;
  transferAccepted?: boolean;
};

export type ReconsentSubmissionResult =
  | { status: "granted"; event: ConsentEvent }
  | { status: "refused" }
  | { status: "needs_checkbox" }
  | { status: "invalid_scope" }
  | { status: "invalid" };

export async function submitReconsent(
  db: AppDatabase,
  userId: string,
  input: ReconsentSubmission,
): Promise<ReconsentSubmissionResult> {
  const scope = parseReconsentScope(input.scope);
  if (!scope) return { status: "invalid_scope" };
  if (input.intent === "refuse") return { status: "refused" };
  if (!input.accepted) return { status: "needs_checkbox" };
  if (CONSENT_TEXTS[scope].transferCheckbox && !input.transferAccepted) {
    return { status: "needs_checkbox" };
  }

  const saved = await createConsentRepository(db).recordConsent(userId, {
    purpose: scope,
    action: "granted",
    source: "reconsent",
  });
  if (!saved.ok) return { status: "invalid" };
  return { status: "granted", event: saved.value };
}
