const MEDICATION =
  /\b\d+\s*mg\b|\bibuprofeno\b|\bparacetamol\b|\banabolizante\b|\bwinstrol\b/i;

export const FILTERED_OUTPUT =
  "Não posso orientar sobre medicamentos ou diagnóstico. Posso ajudar com o seu treino.";

export function sanitizeCoachOutput(text: string): {
  text: string;
  filtered: boolean;
} {
  if (MEDICATION.test(text)) {
    return { text: FILTERED_OUTPUT, filtered: true };
  }
  const stripped = text
    .replace(/<[^>]*>/g, "")
    .replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "");
  return { text: stripped.trim(), filtered: stripped !== text };
}
