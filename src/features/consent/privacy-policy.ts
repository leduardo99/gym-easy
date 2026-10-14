const CONTACT_EMAIL = "contacto@gaffer.pt";

export const PRIVACY_POLICY = {
  retentionYears: 3,
  contactEmail: CONTACT_EMAIL,
  paragraphs: [
    "O Gym Easy registra quando você autoriza ou retira o uso dos seus dados. A prova guarda a finalidade, a ação, a versão do texto e a origem. Ela não guarda email, endereço IP, identificador do navegador nem dados de saúde.",
    "Ao apagar a conta, o vínculo com o seu usuário sai do registro. No lugar fica um pseudônimo HMAC, que não reconstrói a conta. Essa prova fica retida por 3 anos depois da exclusão, somente para defesa legal de coimas e reclamações, e não entra em análise de uso.",
    "Passados esses 3 anos, um processo diário apaga esses registros.",
  ],
  rights: {
    id: "direitos-do-titular",
    heading: "Direitos do titular",
    paragraphs: [
      `Para exercer os direitos de acesso, retificação, apagamento, limitação do tratamento, oposição e portabilidade, escreva para ${CONTACT_EMAIL}. Esse endereço é o contato do responsável pelo tratamento e do encarregado de proteção de dados.`,
    ],
  },
  processorsHeading: "Subprocessadores",
  processorsId: "subprocessadores",
  processors: [
    {
      name: "Neon",
      role: "Banco de dados",
      region: "eu-central-1",
    },
    {
      name: "Oracle Cloud Infrastructure",
      role: "Hospedagem da aplicação e cópias de segurança (backups), na mesma região",
      region: "eu-madrid-1",
    },
  ],
} as const;

export function privacyPolicyText(): string {
  return [
    ...PRIVACY_POLICY.paragraphs,
    PRIVACY_POLICY.rights.heading,
    ...PRIVACY_POLICY.rights.paragraphs,
    PRIVACY_POLICY.processorsHeading,
    ...PRIVACY_POLICY.processors.map(
      (processor) =>
        `${processor.name}: ${processor.role}. Região ${processor.region}.`,
    ),
  ].join("\n");
}
