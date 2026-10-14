export const RED_FLAG_RESPONSE =
  "Pare o treino agora e procure atendimento. Se estiver em perigo imediato, ligue para o número de emergência local (112, 192 ou 911). O coach não substitui aconselhamento médico e não faz diagnóstico.";

export const SELF_HARM_RESPONSE =
  "Se estiver em perigo imediato, ligue para o número de emergência local (112 ou 192). No Brasil, o CVV atende em 188. Em Portugal, o SNS 24 atende em 808 24 24 24. Você não está sozinho.";

export const UNAVAILABLE_RESPONSE =
  "O coach está indisponível agora. Seu treino não é afetado.";

export const RATE_LIMIT_RESPONSE =
  "Você atingiu o limite diário de mensagens do coach. O treino continua disponível.";

export const CONSENT_RESPONSE =
  "O chat do coach precisa das autorizações vigentes de dados do corpo e de saúde.";

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
