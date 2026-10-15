import { MINIMUM_AGE_YEARS } from "@/features/profile/age";

const CONTACT_EMAIL = "contacto@gaffer.pt";

export const PRIVACY_POLICY_MINIMUM_AGE_ID = "privacy-policy-minimum-age";
export const PRIVACY_POLICY_BIRTH_YEAR_MINIMUM_AGE_ID =
  "privacy-policy-birth-year-minimum-age";
export const PRIVACY_POLICY_BIRTH_YEAR_AGE_BAND_ID =
  "privacy-policy-birth-year-age-band";
export const PRIVACY_POLICY_BODY_DATA_GATE_ID =
  "privacy-policy-body-data-technical-gate";

export function privacyPolicyMinimumAgeSentence(
  minimumAgeYears: number = MINIMUM_AGE_YEARS,
): string {
  return `A idade mínima para usar o Gym Easy é ${minimumAgeYears} anos.`;
}

export function privacyPolicyBirthYearAgeBandSentence(): string {
  return "O texto de consentimento «Dados do corpo» em vigor (body_data, versão 2026-10-15b) também nomeia o ano de nascimento (birthYear) ao pedir autorização para peso, altura e sexo: com body_data ativo, usamos o birthYear já guardado no perfil, juntamente com sexo, altura e registos de peso, para calcular a faixa etária na análise dos dados do corpo. O birthYear continua a ser recolhido e conservado com base contratual e no art. 8.º, como acima — o consentimento não substitui essa base de armazenamento.";
}

export function privacyPolicyBodyDataTechnicalGateSentence(): string {
  return "Nota técnica temporária: nesta versão da app, o interruptor «Dados do corpo» precisa estar ligado para guardar qualquer alteração ao perfil ou registo de peso. É uma limitação de implementação prevista para remoção (LED-146); não altera as bases legais descritas acima.";
}

function buildProfileBodyDataParagraphs(minimumAgeYears: number) {
  return {
    intro:
      "O perfil de treino — ano de nascimento (birthYear), objetivo, nível, dias por semana, duração da sessão e local — recolhe-se desde o início com fundamento contratual (art. 6.º, n.º 1, alínea b), do RGPD), sem mudança de base. O birthYear tem ainda fundamento legal para a verificação de idade mínima (art. 8.º). Sexo, altura e registos de peso recolhem-se apenas com a autorização «Dados do corpo» (consentimento body_data).",
    birthYearAgeBand: privacyPolicyBirthYearAgeBandSentence(),
    technicalGate: privacyPolicyBodyDataTechnicalGateSentence(),
    minimumAge: privacyPolicyMinimumAgeSentence(minimumAgeYears),
    revoke: `Se você retirar a autorização «Dados do corpo», apagamos sexo, altura e os registos de peso. O ano de nascimento e o resto do perfil de treino (objetivo, nível, dias por semana, duração da sessão e local) permanecem na conta para executar o contrato consigo, demonstrar que você tem pelo menos ${minimumAgeYears} anos e respeitar o art. 8.º do RGPD (idade mínima no serviço da sociedade da informação). Essa conservação apoia-se no art. 6.º, n.º 1, alíneas b) e c), do RGPD (execução do contrato e obrigação legal). O ano de nascimento só é apagado quando você apaga a conta.`,
    coachHealth:
      "O Coach só usa dados de saúde ou do corpo no chat quando você tem a autorização «Saúde no Coach» (coach_health) ativa. Sem essa autorização, o Coach não trata esses dados, mesmo que outros campos do perfil existam.",
    aiLogs:
      "Mensagens do Coach podem citar peso ou altura que você escreveu; ficam até 90 dias ou até você usar «Apagar histórico» em Privacidade. Os registos técnicos da IA (ai_generation_logs) não guardam texto de conversa nem registos de peso; guardam metadados técnicos (pseudónimo, modelo, resultado, tokens, latência, política de dados, indicação ZDR).",
  };
}

const profileBodyDataParagraphs =
  buildProfileBodyDataParagraphs(MINIMUM_AGE_YEARS);

export const PRIVACY_POLICY = {
  retentionYears: 3,
  contactEmail: CONTACT_EMAIL,
  profileBodyData: {
    id: "dados-do-perfil-e-corpo",
    heading: "Dados do perfil e do corpo",
    minimumAgeYears: MINIMUM_AGE_YEARS,
    contractualProfile: {
      heading: "Perfil de treino e ano de nascimento",
      basis:
        "execução do contrato (ano de nascimento também art. 8.º para idade mínima)",
      fields: [
        "ano de nascimento (birthYear)",
        "objetivo de treino (goal)",
        "nível de treino (level)",
        "dias de treino por semana (daysPerWeek)",
        "duração da sessão em minutos (sessionMinutes)",
        "local de treino (trainingPlace)",
      ],
    },
    bodyDataConsent: {
      heading: "Dados do corpo",
      basis: "consentimento body_data",
      fields: [
        "sexo (sex)",
        "altura em centímetros (heightCm)",
        "registos de peso (weight_kg)",
      ],
    },
    retainedAfterRevoke: {
      heading: "Conservados após revogar «Dados do corpo»",
      basis:
        "execução do contrato e obrigações legais (art. 6.º(1)(b)(c) e art. 8.º)",
      fields: [
        "ano de nascimento (birthYear)",
        "objetivo de treino (goal)",
        "nível de treino (level)",
        "dias de treino por semana (daysPerWeek)",
        "duração da sessão em minutos (sessionMinutes)",
        "local de treino (trainingPlace)",
      ],
    },
    paragraphs: profileBodyDataParagraphs,
  },
  paragraphs: [
    "O Gym Easy registra quando você autoriza ou retira o uso dos seus dados. A prova guarda a finalidade, a ação, a versão do texto e a origem. Ela não guarda email, endereço IP, identificador do navegador nem dados de saúde.",
    "Ao apagar a conta, o vínculo com o seu usuário sai do registro. No lugar fica um pseudônimo HMAC, que não reconstrói a conta. Essa prova fica retida por 3 anos depois da exclusão, somente para defesa legal de coimas e reclamações, e não entra em análise de uso.",
    "Passados esses 3 anos, um processo diário apaga esses registros.",
    'Guardamos cada conversa por 90 dias para dar contexto ao Coach; depois ela é apagada. Você pode apagar o histórico a qualquer momento em "Apagar histórico".',
  ],
  rights: {
    id: "direitos-do-titular",
    heading: "Direitos do titular",
    paragraphs: [
      `Para exercer os direitos de acesso, retificação, apagamento, limitação do tratamento, oposição e portabilidade, escreva para ${CONTACT_EMAIL}. Esse endereço é o contato do responsável pelo tratamento e do encarregado de proteção de dados.`,
      `Você pode retirar o consentimento a qualquer momento, nas definições da app ou por ${CONTACT_EMAIL}. A retirada não afeta a licitude do tratamento anterior (RGPD art. 7.º/3).`,
      "Você pode apresentar reclamação à autoridade de controlo, a CNPD (www.cnpd.pt), conforme o art. 77.º.",
    ],
  },
  dataLocation: {
    id: "onde-ficam-os-dados",
    heading: "Onde ficam os dados",
    paragraphs: [
      "Os dados da aplicação ficam num banco de dados PostgreSQL gerido pela equipe do Gym Easy no servidor Oracle Cloud Infrastructure, região eu-madrid-1 (Madrid, Espanha, UE), no mesmo servidor onde o app é hospedado, com conexões criptografadas. Incluem dados do corpo, saúde do Coach, chat, estatísticas de uso e prova de consentimento, conforme as autorizações vigentes.",
      "Os dados guardados no servidor e nas cópias de segurança (backups) permanecem na União Europeia e não saem da UE.",
    ],
  },
  processorsHeading: "Subprocessadores",
  processorsId: "subprocessadores",
  processors: [
    {
      name: "Oracle Cloud Infrastructure",
      role: "Hospedagem da aplicação e cópias de segurança (backups) diárias e criptografadas, na mesma região (Madrid, UE); dados apagados saem dos backups em até 8 dias",
      region: "eu-madrid-1",
    },
    {
      name: "Tailscale",
      role: "Rede privada da infraestrutura, usado só para acesso administrativo ao servidor, sem dados dos usuários",
      region: null,
    },
    {
      name: "OpenRouter",
      role: "Inteligência artificial do Coach (modelos gratuitos; sem garantia de região, os dados podem ser processados fora da UE), sem base adequada de transferência para fora da UE (sem decisão de adequação, Data Privacy Framework nem cláusulas contratuais-padrão). O OpenRouter e os fornecedores dos modelos gratuitos podem guardar esses dados e usá-los para treinar modelos; não há garantia de retenção zero",
      region: null,
    },
    {
      name: "Resend",
      role: "Email transacional, opcional, só em produção",
      region: null,
    },
  ],
} as const;

export function processorText(processor: {
  name: string;
  role: string;
  region: string | null;
}): string {
  const role = processor.role.endsWith(".")
    ? processor.role
    : `${processor.role}.`;
  if (!processor.region) return `${processor.name}: ${role}`;
  return `${processor.name}: ${role} Região ${processor.region}.`;
}

function profileFieldGroupText(group: {
  heading: string;
  basis: string;
  fields: readonly string[];
}): string[] {
  return [
    `${group.heading} (${group.basis}):`,
    ...group.fields.map((field) => `• ${field}`),
  ];
}

export function profileBodyDataParagraphList(
  minimumAgeYears: number = MINIMUM_AGE_YEARS,
): string[] {
  const paragraphs = buildProfileBodyDataParagraphs(minimumAgeYears);
  return [
    paragraphs.intro,
    paragraphs.birthYearAgeBand,
    paragraphs.technicalGate,
    paragraphs.minimumAge,
    paragraphs.revoke,
    paragraphs.coachHealth,
    paragraphs.aiLogs,
  ];
}

export function privacyPolicyText(): string {
  const { profileBodyData } = PRIVACY_POLICY;
  return [
    ...PRIVACY_POLICY.paragraphs,
    profileBodyData.heading,
    ...profileFieldGroupText(profileBodyData.contractualProfile),
    ...profileFieldGroupText(profileBodyData.bodyDataConsent),
    ...profileFieldGroupText(profileBodyData.retainedAfterRevoke),
    ...profileBodyDataParagraphList(),
    PRIVACY_POLICY.rights.heading,
    ...PRIVACY_POLICY.rights.paragraphs,
    PRIVACY_POLICY.dataLocation.heading,
    ...PRIVACY_POLICY.dataLocation.paragraphs,
    PRIVACY_POLICY.processorsHeading,
    ...PRIVACY_POLICY.processors.map((processor) => processorText(processor)),
  ].join("\n");
}
