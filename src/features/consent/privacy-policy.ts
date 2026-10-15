const CONTACT_EMAIL = "contacto@gaffer.pt";

export const PRIVACY_POLICY = {
  retentionYears: 3,
  contactEmail: CONTACT_EMAIL,
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

export function privacyPolicyText(): string {
  return [
    ...PRIVACY_POLICY.paragraphs,
    PRIVACY_POLICY.rights.heading,
    ...PRIVACY_POLICY.rights.paragraphs,
    PRIVACY_POLICY.dataLocation.heading,
    ...PRIVACY_POLICY.dataLocation.paragraphs,
    PRIVACY_POLICY.processorsHeading,
    ...PRIVACY_POLICY.processors.map((processor) => processorText(processor)),
  ].join("\n");
}
