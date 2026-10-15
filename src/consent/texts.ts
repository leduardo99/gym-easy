import { createHash } from "node:crypto";

/**
 * Textos publicados (pt-BR).
 * `body_data` está em 2026-10-15c (LED-146); demais finalidades em 2026-10-15b.
 * `coach_health` e `coach_chat` incluem o segundo checkbox da transferência
 * para fora da UE (RGPD art. 49(1)(a)).
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
  transferCheckbox?: string;
};

function copy(
  purpose: ConsentTextPurpose,
  title: string,
  paragraphs: readonly string[],
  checkbox: string,
  options?: { version?: string; transferCheckbox?: string },
): ConsentCopy {
  return {
    purpose,
    locale: CONSENT_LOCALE,
    version: options?.version ?? `${purpose}-${CONSENT_LOCALE}-2026-10-15b`,
    title,
    body: paragraphs.join("\n"),
    checkbox,
    ...(options?.transferCheckbox
      ? { transferCheckbox: options.transferCheckbox }
      : {}),
  };
}

export const CONSENT_TEXTS_BY_LOCALE = {
  "pt-BR": {
    body_data: copy(
      "body_data",
      "Seus dados do corpo",
      [
        "Peso, altura e sexo ajudam o Gym Easy a mostrar sua evolução e ajustar sugestões. Esses dados são considerados dados de saúde, por isso só os usamos se você autorizar, e só para personalizar o app para você: não vendemos nem usamos para publicidade.",
        "Quem trata: o Gym Easy é o responsável (contato: contacto@gaffer.pt). Os dados ficam num banco de dados PostgreSQL gerido pela equipe do Gym Easy no seu próprio servidor na Oracle Cloud Infrastructure, região eu-madrid-1 (Madrid, Espanha, UE), no mesmo servidor onde o app é hospedado, com conexões criptografadas; o acesso administrativo ao banco de dados é feito só pela rede privada (tailnet) (a rede privada Tailscale é usada só para acesso administrativo, sem dados dos usuários); as cópias de segurança (backups) são diárias, criptografadas e guardadas no próprio servidor e em armazenamento privado da Oracle Cloud Infrastructure na mesma região (Madrid, Espanha, UE), sem sair da UE; dados apagados saem dos backups em até 8 dias.",
        "Por quanto tempo: enquanto sua conta existir ou até você retirar a autorização em Perfil > Privacidade; ao retirar, apagamos peso, altura, sexo e histórico de peso. Guardamos a prova desta autorização, pseudonimizada, por 3 anos após a exclusão da conta.",
      ],
      "Autorizo o Gym Easy a guardar e usar meu peso, altura e sexo para personalizar o app.",
      { version: "body_data-pt-BR-2026-10-15c" },
    ),
    coach_health: copy(
      "coach_health",
      "Seus dados de saúde no Coach",
      [
        "O Coach usa suas respostas do questionário de saúde (PAR-Q+), as lesões ou dores que você informar e seus treinos para criar e ajustar seu plano. Os cálculos e as regras de segurança rodam nos nossos servidores.",
        "O que vai para a inteligência artificial: para gerar o plano, enviamos ao OpenRouter (modelos gratuitos; sem garantia de região, os dados podem ser processados fora da UE) só categorias e faixas: faixa etária, faixa de altura e de peso, objetivo, experiência, dias por semana, tempo por treino, equipamento, regiões e intensidade das lesões e o resultado do questionário (sim/não por categoria). Nunca enviamos seu nome, email, ano de nascimento, valores exatos nem texto livre. Atenção: o OpenRouter e os fornecedores dos modelos gratuitos podem guardar esses dados e usá-los para treinar modelos; não há garantia de retenção zero. O plano funciona sem o chat; o chat tem autorização própria.",
        "O Coach é uma ferramenta de apoio ao treino. Não substitui aconselhamento médico e não faz diagnóstico.",
        "Quem trata: o Gym Easy é o responsável (contato: contacto@gaffer.pt); os dados ficam num banco de dados PostgreSQL gerido pela equipe do Gym Easy no seu próprio servidor na Oracle Cloud Infrastructure, região eu-madrid-1 (Madrid, Espanha, UE), no mesmo servidor onde o app é hospedado, com conexões criptografadas; o acesso administrativo ao banco de dados é feito só pela rede privada (tailnet) (a rede privada Tailscale é usada só para acesso administrativo, sem dados dos usuários); as cópias de segurança (backups) são diárias, criptografadas e guardadas no próprio servidor e em armazenamento privado da Oracle Cloud Infrastructure na mesma região (Madrid, Espanha, UE), sem sair da UE; dados apagados saem dos backups em até 8 dias; subcontratante: OpenRouter (inteligência artificial; sem garantia de região, os dados podem ser processados fora da UE). O OpenRouter e os fornecedores dos modelos gratuitos podem estar fora da União Europeia (por exemplo, nos EUA) e não sabemos de antemão qual será usado. Tentamos primeiro modelos que não guardam os dados (retenção zero); se nenhum estiver disponível, as categorias e faixas do seu perfil podem ir para outro modelo gratuito, que pode guardá-las e registrá-las. Para essa transferência para fora da UE não existe decisão de adequação nem cláusulas contratuais-padrão com esses fornecedores. Por isso, ela só acontece com o seu consentimento explícito, e você deve conhecer os riscos: seus dados podem ficar sujeitos a leis de outros países, inclusive ao acesso por autoridades públicas, com proteção menor que a da UE, e pode ser difícil exercer seus direitos (acesso, correção, apagamento) junto a esses fornecedores. Você pode retirar este consentimento a qualquer momento em Perfil > Privacidade > Coach de IA: o Coach deixa de receber os dados do seu perfil e nada mais é enviado ao OpenRouter, mas não conseguimos apagar o que os fornecedores já tenham guardado.",
        "Por quanto tempo: enquanto sua conta existir ou até você retirar a autorização em Perfil > Privacidade > Coach de IA. Triagens substituídas e lesões resolvidas são apagadas após 12 meses. Ao retirar, apagamos suas respostas de saúde e lesões e o Coach é desativado. Guardamos a prova desta autorização, pseudonimizada, por 3 anos após a exclusão da conta.",
      ],
      "Autorizo o Gym Easy a usar minhas respostas de saúde, lesões e treinos para criar e ajustar meu plano no Coach.",
      {
        transferCheckbox:
          "Entendo os riscos e autorizo que as categorias e faixas do meu perfil sejam transferidas para o OpenRouter e fornecedores de modelos fora da União Europeia, sem garantias adequadas de proteção.",
      },
    ),
    coach_chat: copy(
      "coach_chat",
      "Chat com o Coach",
      [
        "No chat, as mensagens que você escreve são enviadas como texto livre ao OpenRouter (modelos gratuitos; sem garantia de região, os dados podem ser processados fora da UE), junto com o contexto do seu plano, para que o Coach responda. O OpenRouter e os fornecedores dos modelos gratuitos podem estar fora da União Europeia (por exemplo, nos EUA) e não sabemos de antemão qual será usado. Tentamos primeiro modelos que não guardam os dados (retenção zero); se nenhum estiver disponível, a mensagem pode ir para outro modelo gratuito, que pode guardá-la e registrá-la. Para essa transferência para fora da UE não existe decisão de adequação nem cláusulas contratuais-padrão com esses fornecedores. Por isso, ela só acontece com o seu consentimento explícito, e você deve conhecer os riscos: seus dados podem ficar sujeitos a leis de outros países, inclusive ao acesso por autoridades públicas, com proteção menor que a da UE, e pode ser difícil exercer seus direitos (acesso, correção, apagamento) junto a esses fornecedores. Você pode retirar este consentimento a qualquer momento em Perfil > Privacidade > Coach de IA: o chat é desligado e nada mais é enviado ao OpenRouter, mas não conseguimos apagar o que os fornecedores já tenham guardado. Não compartilhe dados de saúde além do necessário para a sua dúvida sobre o treino, nem dados de outras pessoas. Atenção: o OpenRouter e os fornecedores dos modelos gratuitos podem guardar suas mensagens e usá-las para treinar modelos; não há garantia de retenção zero. Suas conversas nunca entram em logs nem em estatísticas.",
        "Quem trata: o Gym Easy é o responsável (contato: contacto@gaffer.pt); os dados ficam num banco de dados PostgreSQL gerido pela equipe do Gym Easy no seu próprio servidor na Oracle Cloud Infrastructure, região eu-madrid-1 (Madrid, Espanha, UE), no mesmo servidor onde o app é hospedado, com conexões criptografadas; o acesso administrativo ao banco de dados é feito só pela rede privada (tailnet) (a rede privada Tailscale é usada só para acesso administrativo, sem dados dos usuários); as cópias de segurança (backups) são diárias, criptografadas e guardadas no próprio servidor e em armazenamento privado da Oracle Cloud Infrastructure na mesma região (Madrid, Espanha, UE), sem sair da UE; dados apagados saem dos backups em até 8 dias; subcontratante: OpenRouter (inteligência artificial; sem garantia de região, os dados podem ser processados fora da UE).",
        'Por quanto tempo: guardamos cada conversa por 90 dias para dar contexto ao Coach; depois ela é apagada. Você pode apagar o histórico a qualquer momento em "Apagar histórico". Ao retirar esta autorização em Perfil > Privacidade > Coach de IA, o chat é desligado e todo o histórico é apagado; seu plano continua funcionando. Guardamos a prova desta autorização, pseudonimizada, por 3 anos após a exclusão da conta.',
      ],
      "Autorizo o Gym Easy a enviar as mensagens que eu escrever no chat ao OpenRouter para o Coach responder.",
      {
        transferCheckbox:
          "Entendo os riscos e autorizo que minhas mensagens sejam transferidas para o OpenRouter e fornecedores de modelos fora da União Europeia, sem garantias adequadas de proteção.",
      },
    ),
    analytics: copy(
      "analytics",
      "Estatísticas de uso",
      [
        "Opcional. Se você permitir, registramos como você usa o app (por exemplo, telas abertas e botões tocados) com um identificador pseudônimo, para melhorar o Gym Easy e o Coach. Nunca incluímos dados de saúde, respostas do questionário, lesões, medidas do corpo ou conversas. Os relatórios são só agregados e grupos com menos de 5 pessoas não aparecem.",
        "Quem trata: o Gym Easy (contato: contacto@gaffer.pt), com dados num banco de dados PostgreSQL gerido pela equipe do Gym Easy no seu próprio servidor na Oracle Cloud Infrastructure, região eu-madrid-1 (Madrid, Espanha, UE), no mesmo servidor onde o app é hospedado, com conexões criptografadas; o acesso administrativo ao banco de dados é feito só pela rede privada (tailnet); as cópias de segurança (backups) são diárias, criptografadas e guardadas no próprio servidor e em armazenamento privado da Oracle Cloud Infrastructure na mesma região (Madrid, Espanha, UE), sem sair da UE; dados apagados saem dos backups em até 8 dias.",
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

/**
 * Título, linha em branco, corpo, linha em branco, checkbox.
 * Com dois checkboxes: mais uma linha em branco e o checkbox da transferência.
 * NFC e sem espaço no fim da linha.
 */
export function canonicalConsentText(copy: {
  title: string;
  body: string;
  checkbox: string;
  transferCheckbox?: string;
}): string {
  const base = `${copy.title}\n\n${copy.body}\n\n${copy.checkbox}`;
  const canonical = copy.transferCheckbox
    ? `${base}\n\n${copy.transferCheckbox}`
    : base;
  return canonical
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

/** Hash canónico do texto body_data-pt-BR-2026-10-15b (LED-45); ainda vigente sem reconsentimento (LED-146). */
export const BODY_DATA_CONSENT_TEXT_SHA256_15B =
  "5df4e14e0c7d5126112a2158c8a4559ecb8b8b12f95b2318de7bb9b3b715f052";

const BODY_DATA_CONSENT_VERSION_15B = "body_data-pt-BR-2026-10-15b";

/** Grants body_data válidos após o estreitamento do texto (LED-146). */
export function isValidBodyDataConsentGrant(event: {
  action: "granted" | "revoked";
  version: string;
  textSha256: string;
}): boolean {
  if (event.action !== "granted") return false;
  if (
    event.version === CONSENT_TEXTS.body_data.version &&
    event.textSha256 === consentTextSha256("body_data")
  ) {
    return true;
  }
  return (
    event.version === BODY_DATA_CONSENT_VERSION_15B &&
    event.textSha256 === BODY_DATA_CONSENT_TEXT_SHA256_15B
  );
}
