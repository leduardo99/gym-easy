export const PRIVACY_POLICY = {
  retentionYears: 3,
  paragraphs: [
    "O Gym Easy registra quando você autoriza ou retira o uso dos seus dados. A prova guarda a finalidade, a ação, a versão do texto e a origem. Ela não guarda email, endereço IP, identificador do navegador nem dados de saúde.",
    "Ao apagar a conta, o vínculo com o seu usuário sai do registro. No lugar fica um pseudônimo HMAC, que não reconstrói a conta. Essa prova fica retida por 3 anos depois da exclusão, somente para defesa legal de coimas e reclamações, e não entra em análise de uso.",
    "Passados esses 3 anos, um processo diário apaga esses registros.",
  ],
} as const;

export function privacyPolicyText(): string {
  return PRIVACY_POLICY.paragraphs.join("\n");
}
