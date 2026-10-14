import { createHash } from "node:crypto";

/**
 * Textos publicados da LED-45, versão final 2026-10-14c (pt-BR).
 * Uma vírgula nova exige outro id de versão: o hash é da forma canónica.
 */
export const CONSENT_TEXT_PURPOSES = [
  "body_data",
  "coach_health",
  "coach_chat",
  "analytics",
] as const;

export type ConsentTextPurpose = (typeof CONSENT_TEXT_PURPOSES)[number];

export const CONSENT_LOCALE = "pt-BR" as const;

export type ConsentLocale = typeof CONSENT_LOCALE;

export type ConsentCopy = {
  purpose: ConsentTextPurpose;
  locale: ConsentLocale;
  version: string;
  title: string;
  body: string;
  checkbox: string;
};

function copy(
  purpose: ConsentTextPurpose,
  title: string,
  paragraphs: readonly string[],
  checkbox: string,
): ConsentCopy {
  return {
    purpose,
    locale: CONSENT_LOCALE,
    version: `${purpose}-${CONSENT_LOCALE}-2026-10-14c`,
    title,
    body: paragraphs.join("\n"),
    checkbox,
  };
}

export const CONSENT_TEXTS_BY_LOCALE = {
  "pt-BR": {
    body_data: copy(
      "body_data",
      "Seus dados do corpo",
      [
        "Peso, altura e sexo ajudam o Gym Easy a mostrar sua evolução e ajustar sugestões. Usamos também o ano de nascimento para calcular a faixa etária. Esses dados são considerados dados de saúde, por isso só os usamos se você autorizar, e só para personalizar o app para você: não vendemos nem usamos para publicidade.",
        "Quem trata: o Gym Easy é o responsável (contato: contacto@gaffer.pt). Os dados ficam no nosso banco de dados na Neon, em Frankfurt, Alemanha (União Europeia), e o app é hospedado na Oracle Cloud Infrastructure (servidor gerido pelo responsável), região eu-madrid-1 (Madrid, Espanha, UE), onde ficam também as cópias de segurança (backups), num bucket privado da Oracle Cloud Infrastructure. O Tailscale é usado só para acesso administrativo ao servidor, sem dados dos usuários.",
        "Por quanto tempo: enquanto sua conta existir ou até você retirar a autorização em Perfil > Privacidade; ao retirar, apagamos peso, altura, sexo e histórico de peso. Guardamos a prova desta autorização, pseudonimizada, por 3 anos após a exclusão da conta.",
      ],
      "Autorizo o Gym Easy a guardar e usar meu peso, altura, sexo e ano de nascimento para calcular a faixa etária, para personalizar o app.",
    ),
    coach_health: copy(
      "coach_health",
      "Seus dados de saúde no Coach",
      [
        "O Coach usa suas respostas do questionário de saúde (PAR-Q+), as lesões ou dores que você informar e seus treinos para criar e ajustar seu plano. Os cálculos e as regras de segurança rodam nos nossos servidores.",
        "O que vai para a inteligência artificial: para gerar o plano, enviamos ao OpenRouter (modelos gratuitos; sem garantia de região, os dados podem ser processados fora da UE) só categorias e faixas: faixa etária, faixa de altura e de peso, objetivo, experiência, dias por semana, tempo por treino, equipamento, regiões e intensidade das lesões e o resultado do questionário (sim/não por categoria). Nunca enviamos seu nome, email, ano de nascimento, valores exatos nem texto livre. Atenção: o OpenRouter e os fornecedores dos modelos gratuitos podem guardar esses dados e usá-los para treinar modelos; não há garantia de retenção zero. O plano funciona sem o chat; o chat tem autorização própria.",
        "O Coach é uma ferramenta de apoio ao treino. Não substitui aconselhamento médico e não faz diagnóstico.",
        "Quem trata: o Gym Easy é o responsável (contato: contacto@gaffer.pt); subcontratantes: Neon (banco de dados), em Frankfurt, União Europeia; hospedagem na Oracle Cloud Infrastructure (servidor gerido pelo responsável), região eu-madrid-1 (Madrid, Espanha, UE), onde ficam também as cópias de segurança (backups), num bucket privado da Oracle Cloud Infrastructure; Tailscale só para acesso administrativo, sem dados dos usuários; e OpenRouter (inteligência artificial; sem garantia de região, os dados podem ser processados fora da UE), sem base adequada de transferência para fora da UE (sem decisão de adequação, Data Privacy Framework nem cláusulas contratuais-padrão); isso é aceito porque o Gym Easy é usado apenas pelo próprio dono, para uso pessoal.",
        "Por quanto tempo: enquanto sua conta existir ou até você retirar a autorização em Perfil > Privacidade > Coach de IA. Triagens substituídas e lesões resolvidas são apagadas após 12 meses. Ao retirar, apagamos suas respostas de saúde e lesões e o Coach é desativado. Guardamos a prova desta autorização, pseudonimizada, por 3 anos após a exclusão da conta.",
      ],
      "Autorizo o Gym Easy a usar minhas respostas de saúde, lesões e treinos para criar e ajustar meu plano no Coach.",
    ),
    coach_chat: copy(
      "coach_chat",
      "Chat com o Coach",
      [
        "No chat, as mensagens que você escreve são enviadas como texto livre ao OpenRouter (modelos gratuitos; sem garantia de região, os dados podem ser processados fora da UE), junto com o contexto do seu plano, para que o Coach responda. Não há base adequada de transferência para fora da UE (sem decisão de adequação, Data Privacy Framework nem cláusulas contratuais-padrão); isso é aceito porque o Gym Easy é usado apenas pelo próprio dono, para uso pessoal. Não compartilhe dados de saúde além do necessário para a sua dúvida sobre o treino, nem dados de outras pessoas. Atenção: o OpenRouter e os fornecedores dos modelos gratuitos podem guardar suas mensagens e usá-las para treinar modelos; não há garantia de retenção zero. Suas conversas nunca entram em logs nem em estatísticas.",
        "Quem trata: o Gym Easy é o responsável (contato: contacto@gaffer.pt); subcontratantes: Neon (banco de dados), em Frankfurt, União Europeia; hospedagem na Oracle Cloud Infrastructure (servidor gerido pelo responsável), região eu-madrid-1 (Madrid, Espanha, UE), onde ficam também as cópias de segurança (backups), num bucket privado da Oracle Cloud Infrastructure; Tailscale só para acesso administrativo, sem dados dos usuários; e OpenRouter (inteligência artificial; sem garantia de região, os dados podem ser processados fora da UE).",
        'Por quanto tempo: guardamos cada conversa por 90 dias para dar contexto ao Coach; depois ela é apagada. Você pode apagar o histórico a qualquer momento em "Apagar histórico". Ao retirar esta autorização em Perfil > Privacidade, o chat é desligado e todo o histórico é apagado; seu plano continua funcionando. Guardamos a prova desta autorização, pseudonimizada, por 3 anos após a exclusão da conta.',
      ],
      "Autorizo o Gym Easy a enviar as mensagens que eu escrever no chat ao OpenRouter para o Coach responder.",
    ),
    analytics: copy(
      "analytics",
      "Estatísticas de uso",
      [
        "Opcional. Se você permitir, registramos como você usa o app (por exemplo, telas abertas e botões tocados) com um identificador pseudônimo, para melhorar o Gym Easy e o Coach. Nunca incluímos dados de saúde, respostas do questionário, lesões, medidas do corpo ou conversas. Os relatórios são só agregados e grupos com menos de 5 pessoas não aparecem.",
        "Quem trata: o Gym Easy (contato: contacto@gaffer.pt), com dados na Neon em Frankfurt, União Europeia, e o app hospedado na Oracle Cloud Infrastructure (servidor gerido pelo responsável), região eu-madrid-1 (Madrid, Espanha, UE), onde ficam também as cópias de segurança (backups), num bucket privado da Oracle Cloud Infrastructure.",
        "Por quanto tempo: os eventos ficam guardados por até 13 meses. Se você desligar em Perfil > Privacidade, paramos na hora e apagamos seus eventos em até 30 dias.",
      ],
      "Opcional: autorizo o registro pseudônimo de como uso o app para melhorar o Gym Easy e o Coach. Nada de saúde ou conversas.",
    ),
  },
} as const satisfies Record<
  ConsentLocale,
  Record<ConsentTextPurpose, ConsentCopy>
>;

/** Textos do locale publicado. `recordConsent` grava `version` desta tabela. */
export const CONSENT_TEXTS = CONSENT_TEXTS_BY_LOCALE[CONSENT_LOCALE];

/** Título, linha em branco, corpo, linha em branco, checkbox. NFC e sem espaço no fim da linha. */
export function canonicalConsentText(copy: {
  title: string;
  body: string;
  checkbox: string;
}): string {
  return `${copy.title}\n\n${copy.body}\n\n${copy.checkbox}`
    .normalize("NFC")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n");
}

export function consentTextSha256(purpose: ConsentTextPurpose): string {
  return createHash("sha256")
    .update(canonicalConsentText(CONSENT_TEXTS[purpose]), "utf8")
    .digest("hex");
}
