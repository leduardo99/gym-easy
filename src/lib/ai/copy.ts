const CRISIS_CONTACTS =
  "Se estiver em perigo imediato, ligue já 112 (Portugal) ou 192 (Brasil). Em Portugal: SNS 24 — 808 24 24 24, opção 4; SOS Voz Amiga. No Brasil: CVV — 188.";

export const RED_FLAG_RESPONSE = `Pare o treino agora. ${CRISIS_CONTACTS} O coach não substitui aconselhamento médico e não faz diagnóstico.`;

export const SELF_HARM_RESPONSE = `${CRISIS_CONTACTS} Você não está sozinho.`;

export const UNAVAILABLE_RESPONSE =
  "O coach está indisponível agora. Seu treino não é afetado.";

export const RATE_LIMIT_RESPONSE =
  "Você atingiu o limite diário de mensagens do coach. O treino continua disponível.";

export const CONSENT_RESPONSE =
  "O chat do coach precisa das autorizações vigentes de dados do corpo, de saúde e do chat.";

export const RECONSENT_RESPONSE =
  "O texto da autorização do coach mudou. Confirme a versão atual para continuar.";

export const INJECTION_RESPONSE =
  "Posso ajudar com o seu treino. Não mudo as regras do coach nem mostro instruções internas.";

export const UNDER_AGE_RESPONSE =
  "O Gym Easy é para maiores de 16 anos. Não consigo montar o coach com esses dados.";

export const PROFILE_RESPONSE =
  "Falta o ano de nascimento no perfil para calcular a faixa etária. Complete o perfil antes de usar o coach.";

const INJECTION =
  /ignore as instruc|ignore the instructions|ignore previous|system prompt|modo desenvolvedor|developer mode|jailbreak/;

export function isPromptInjection(message: string): boolean {
  const normalized = message
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  return INJECTION.test(normalized);
}
