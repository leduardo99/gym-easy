export const copy = {
  signupPending: "Se o email for válido, enviamos um link para continuar.",
  accountExistsNotice:
    "Alguém tentou criar uma conta com este email. Se foi você, entre ou redefina sua senha. Se não foi, pode ignorar.",
  loginInvalid: "Email ou senha incorretos.",
  rateLimitUnknown: "Muitas tentativas. Tente de novo em alguns minutos.",
  network: "Sem conexão. Verifique sua internet e tente de novo.",
  server: "Algo deu errado do nosso lado. Tente de novo em instantes.",
  nameRequired: "Informe seu nome.",
  nameMax: "Use até 80 caracteres.",
  emailRequired: "Informe seu email.",
  emailInvalid: "Digite um email válido, como nome@exemplo.com.",
  passwordRequired: "Informe sua senha.",
  passwordMin: "A senha precisa de pelo menos 8 caracteres.",
  passwordMax: "Use no máximo 64 caracteres.",
  passwordBreached:
    "Essa senha é muito comum ou já apareceu em vazamentos. Escolha outra.",
  passwordHint: "Mínimo 8 caracteres.",
  linkExpired: "Este link expirou ou já foi usado.",
  resendToast: "Link reenviado",
  sessionExpired: "Sua sessão expirou. Entre de novo.",
  confirmSubject: "Confirme seu email",
  accountExistsSubject: "Tentativa de cadastro",
} as const;

export function rateLimitMessage(retryAfterSeconds?: number): string {
  if (retryAfterSeconds === undefined) return copy.rateLimitUnknown;
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `Muitas tentativas. Aguarde ${minutes} minuto(s) e tente de novo.`;
}

export function fieldSummary(count: number): string | null {
  if (count < 2) return null;
  return `Corrija ${count} campos para continuar.`;
}

export function formatCooldown(seconds: number): string {
  const safe = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `Reenviar em ${minutes}:${rest.toString().padStart(2, "0")}`;
}
