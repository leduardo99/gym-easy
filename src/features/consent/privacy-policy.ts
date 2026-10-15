import { MINIMUM_AGE_YEARS } from "@/features/profile/age";

const CONTACT_EMAIL = "contacto@gaffer.pt";

export const PRIVACY_POLICY_MINIMUM_AGE_ID = "privacy-policy-minimum-age";
export const PRIVACY_POLICY_BIRTH_YEAR_MINIMUM_AGE_ID =
  "privacy-policy-birth-year-minimum-age";

export function privacyPolicyMinimumAgeSentence(
  minimumAgeYears: number = MINIMUM_AGE_YEARS,
): string {
  return `A idade mínima para usar o Gym Easy é ${minimumAgeYears} anos.`;
}

function buildProfileBodyDataParagraphs(minimumAgeYears: number) {
  return {
    intro:
      "Guardamos o perfil de treino para executar o contrato consigo e personalizar planos. Com a autorização «Dados do corpo», guardamos peso, altura e sexo, alinhado ao texto de consentimento publicado. O ano de nascimento fica no perfil de treino para calcular a faixa etária e verificar elegibilidade.",
    minimumAge: privacyPolicyMinimumAgeSentence(minimumAgeYears),
    revoke: `Se você retirar a autorização «Dados do corpo», apagamos altura, sexo e os registos de peso. O ano de nascimento permanece na conta para executar o contrato consigo, demonstrar que você tem pelo menos ${minimumAgeYears} anos e respeitar o art. 8.º do RGPD (idade mínima no serviço da sociedade da informação). Essa conservação apoia-se no art. 6.º, n.º 1, alíneas b) e c), do RGPD (execução do contrato e obrigação legal). O ano de nascimento só é apagado quando você apaga a conta.`,
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
    trainingProfile: {
      heading: "Perfil de treino",
      basis: "execução do contrato",
      fields: [
        "ano de nascimento (birthYear)",
        "objetivo de treino (goal)",
        "nível de treino (level)",
        "dias de treino por semana (daysPerWeek)",
        "duração da sessão em minutos (sessionMinutes)",
        "local de treino (trainingPlace)",
      ],
    },
    bodyData: {
      heading: "Dados do corpo",
      basis: "consentimento body_data",
      fields: [
        "sexo (sex)",
        "altura em centímetros (heightCm)",
        "registos de peso (weight_kg)",
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
    ...profileFieldGroupText(profileBodyData.trainingProfile),
    ...profileFieldGroupText(profileBodyData.bodyData),
    ...profileBodyDataParagraphList(),
    PRIVACY_POLICY.rights.heading,
    ...PRIVACY_POLICY.rights.paragraphs,
    PRIVACY_POLICY.dataLocation.heading,
    ...PRIVACY_POLICY.dataLocation.paragraphs,
    PRIVACY_POLICY.processorsHeading,
    ...PRIVACY_POLICY.processors.map((processor) => processorText(processor)),
  ].join("\n");
}
