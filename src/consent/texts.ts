import { createHash } from "node:crypto";

import type { ConsentPurpose } from "@/db/domain";

export const CONSENT_TEXTS = {
  body_data: {
    version: "body_data-2026-10-14",
    text: "Autorizo o Gym Easy a guardar e usar meu peso, altura, sexo e ano de nascimento para personalizar o app.",
  },
  coach_health: {
    version: "coach_health-2026-10-14",
    text: "Li e concordo. Autorizo o uso dos meus dados de treino e saúde para personalizar o plano.",
  },
  analytics: {
    version: "analytics-2026-10-14",
    text: "Opcional: compartilhar dados de uso anônimos para melhorar o coach. Nada de saúde ou conversas.",
  },
} as const satisfies Record<ConsentPurpose, { version: string; text: string }>;

export function consentTextSha256(purpose: ConsentPurpose): string {
  return createHash("sha256").update(CONSENT_TEXTS[purpose].text).digest("hex");
}
