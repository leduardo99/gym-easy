/**
 * Classificador INTERINO. A LED-35 substitui este módulo pelo motor puro
 * `classifyChatRisk` (mesma assinatura). Não chama modelo e não registra
 * o texto da mensagem.
 */
export const RISK_RULES_VERSION = "interim-led-35";

export type ChatRisk = "none" | "caution" | "red_flag";

export type ChatLocale = "pt" | "en";

export type ChatRiskResult = {
  risk: ChatRisk;
  matched: string[];
};

type RiskRule = {
  id: string;
  test: (text: string) => boolean;
};

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/['’]/g, "");
}

function includesAny(text: string, parts: readonly string[]): boolean {
  return parts.some((part) => text.includes(part));
}

const RED_FLAG_RULES: readonly RiskRule[] = [
  {
    id: "chest_pain",
    test: (text) =>
      includesAny(text, [
        "dor no peito",
        "aperto no peito",
        "pressao no peito",
        "chest pain",
      ]),
  },
  {
    id: "syncope",
    test: (text) =>
      includesAny(text, [
        "desmaiei",
        "desmaio",
        "apaguei",
        "perdi a consciencia",
        "fainted",
        "passed out",
      ]),
  },
  {
    id: "breath",
    test: (text) =>
      text.includes("nao consigo respirar") ||
      text.includes("cant breathe") ||
      (text.includes("falta de ar") &&
        includesAny(text, ["repouso", "nao passa", "forte"])),
  },
  {
    id: "neuro",
    test: (text) =>
      text.includes("fala enrolada") ||
      text.includes("numbness") ||
      (text.includes("visao turva") && text.includes("treino")) ||
      (includesAny(text, ["dormencia", "formigamento"]) &&
        includesAny(text, ["braco", "rosto", "um lado"])),
  },
  {
    id: "heart",
    test: (text) =>
      text.includes("palpitacao forte") ||
      text.includes("batimento irregular") ||
      (text.includes("coracao disparado") &&
        includesAny(text, ["repouso", "nao para"])),
  },
  {
    id: "acute_pain",
    test: (text) =>
      text.includes("dor aguda") ||
      text.includes("nao consigo apoiar") ||
      text.includes("inchou muito") ||
      text.includes("ouvi um estalo") ||
      text.includes("acho que parti") ||
      text.includes("acho que quebrei") ||
      (text.includes("estalo") && text.includes("dor")) ||
      (/\bosso\b/.test(text) &&
        includesAny(text, [
          "dor",
          "estalo",
          "partido",
          "parti",
          "quebrado",
          "quebrei",
          "fratura",
          "trincado",
        ])),
  },
  {
    id: "pregnancy_symptom",
    test: (text) =>
      includesAny(text, ["gravida", "gestante"]) &&
      includesAny(text, ["sangramento", "contracao", "dor"]),
  },
  {
    id: "rhabdo",
    test: (text) =>
      includesAny(text, ["urina escura", "xixi escuro", "dark urine"]),
  },
  {
    id: "self_harm",
    test: (text) =>
      includesAny(text, ["me machucar", "nao quero viver", "suicid"]),
  },
];

const CAUTION_PARTS = [
  "dorzinha",
  "incomodo",
  "remedio",
  "medicamento",
  "suplemento",
  "anabolizante",
  "esteroide",
  "dieta para",
  "diabetes",
  "pressao alta",
  "lesao",
  "fisioterapia",
  "gravida",
  "gestante",
] as const;

const NEGATION =
  /\b(nao tenho|nao sinto|sem dor|without|no chest pain|i dont have|i do not have)\b/;

export function classifyChatRisk(
  message: string,
  locale: ChatLocale,
): ChatRiskResult {
  if (locale !== "pt" && locale !== "en") {
    return { risk: "none", matched: [] };
  }

  const text = normalize(message);
  const matched = RED_FLAG_RULES.filter((rule) => rule.test(text)).map(
    (rule) => rule.id,
  );

  if (matched.length > 0) {
    const downgrade = !matched.includes("self_harm") && NEGATION.test(text);
    return { risk: downgrade ? "caution" : "red_flag", matched };
  }

  if (includesAny(text, CAUTION_PARTS)) {
    return { risk: "caution", matched: ["caution"] };
  }

  return { risk: "none", matched: [] };
}
