import type { AppDatabase } from "@/db";
import type { ConsentPurpose } from "@/db/domain";
import { isAllowedNext } from "@/features/auth/destination";

import { CONSENT_TEXTS } from "@/consent/texts";

import {
  revokeCoachChatConsent,
  revokeCoachHealthConsent,
} from "@/features/coach";

import type { ConsentEvent } from "./repository";
import { createConsentRepository } from "./repository";
import { revokeBodyDataConsent } from "./revoke-body-data";

/** Finalidades que a página pode gravar, incluindo o chat. */
export const RECONSENT_SCOPES = [
  "body_data",
  "coach_health",
  "coach_chat",
  "analytics",
] as const satisfies readonly ConsentPurpose[];

export type ReconsentScope = (typeof RECONSENT_SCOPES)[number];

export const RECONSENT_FALLBACK = "/perfil";

/** Resumo de riscos (UI apenas; não entra no hash do consentimento -15b). */
export const COACH_TRANSFER_RISK_HEADING = "Riscos";
export const COACH_TRANSFER_RISK_LINE =
  "Sem decisão de adequação nem cláusulas-padrão. Seus dados podem ficar sujeitos a leis de outros países, inclusive acesso por autoridades, com proteção menor que a da UE. Pode ser difícil exercer seus direitos, e não conseguimos apagar o que os fornecedores já guardaram.";

export const RECONSENT_COPY = {
  intro:
    "O texto desta autorização mudou, ou ainda não há uma autorização atual. Leia a versão vigente para continuar.",
  accept: "Autorizar",
  refuse: "Agora não",
  refused: "Nada foi gravado. Sem esta autorização, a ação continua bloqueada.",
  refusedCoachHealth:
    "A autorização de saúde foi retirada e as sugestões de plano do Coach foram apagadas. O histórico do chat foi mantido. O Coach não responde até você autorizar saúde de novo.",
  refusedCoachChat:
    "A autorização do chat foi retirada e o histórico de conversas foi apagado. O Coach não envia mais mensagens ao OpenRouter até você autorizar o chat de novo.",
  refusedBodyData:
    "A autorização dos dados do corpo foi retirada. Apagamos altura, sexo e o histórico de peso. O ano de nascimento no perfil foi mantido. Para guardar altura ou peso de novo, autorize quando pedirmos.",
  refuseConfirmTitle: "Recusar autorização?",
  refuseConfirmBodyData:
    "Apagamos altura, sexo e todo o histórico de peso da sua conta. O ano de nascimento no perfil não é alterado.",
  refuseConfirmCoachHealth:
    "O coach fica desligado e as sugestões de plano do coach são apagadas.",
  refuseConfirmCoachChat:
    "O coach fica desligado e o histórico de conversas é apagado.",
  refuseConfirmAction: "Recusar autorização",
  refuseConfirmCancel: "Voltar",
  checkbox: "Marque a autorização para continuar.",
  scope: "Esta finalidade não pode ser autorizada por aqui.",
  origin: "Não foi possível guardar. Atualize a página e tente de novo.",
} as const;

export type ReconsentNotice =
  | "refused"
  | "refused_body_data"
  | "refused_coach_health"
  | "refused_coach_chat"
  | "checkbox"
  | "origin";

export function reconsentRefuseRequiresConfirmation(
  scope: ReconsentScope,
): boolean {
  return (
    scope === "body_data" || scope === "coach_health" || scope === "coach_chat"
  );
}

export function reconsentRefuseNoticeForScope(
  scope: ReconsentScope,
): ReconsentNotice {
  if (scope === "body_data") return "refused_body_data";
  if (scope === "coach_health") return "refused_coach_health";
  if (scope === "coach_chat") return "refused_coach_chat";
  return "refused";
}

export function reconsentNoticeMessage(notice: ReconsentNotice): string {
  switch (notice) {
    case "refused_body_data":
      return RECONSENT_COPY.refusedBodyData;
    case "refused_coach_health":
      return RECONSENT_COPY.refusedCoachHealth;
    case "refused_coach_chat":
      return RECONSENT_COPY.refusedCoachChat;
    case "refused":
      return RECONSENT_COPY.refused;
    case "checkbox":
      return RECONSENT_COPY.checkbox;
    case "origin":
      return RECONSENT_COPY.origin;
  }
}

export function parseReconsentNotice(
  recusado: string | undefined,
  erro: string | undefined,
): ReconsentNotice | null {
  if (recusado === "corpo") return "refused_body_data";
  if (recusado === "saude") return "refused_coach_health";
  if (recusado === "chat") return "refused_coach_chat";
  if (recusado === "1") return "refused";
  if (erro === "caixa") return "checkbox";
  if (erro === "origem") return "origin";
  return null;
}

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
  notice?: ReconsentNotice,
): string {
  const params = new URLSearchParams();
  params.set("scope", scope);
  params.set("next", safeReconsentNext(nextPath));
  if (notice === "refused") params.set("recusado", "1");
  if (notice === "refused_body_data") params.set("recusado", "corpo");
  if (notice === "refused_coach_health") params.set("recusado", "saude");
  if (notice === "refused_coach_chat") params.set("recusado", "chat");
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
  if (input.intent === "refuse") {
    if (scope === "body_data") {
      const revoked = await revokeBodyDataConsent(db, userId, {
        source: "reconsent",
      });
      if (!revoked.ok) return { status: "invalid" };
    }
    if (scope === "coach_health") {
      const revoked = await revokeCoachHealthConsent(db, userId, "reconsent");
      if (!revoked.ok) return { status: "invalid" };
    }
    if (scope === "coach_chat") {
      const revoked = await revokeCoachChatConsent(db, userId, "reconsent");
      if (!revoked.ok) return { status: "invalid" };
    }
    return { status: "refused" };
  }
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
