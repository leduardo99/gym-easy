/** IP enviado ao rate limit de cadastro; captura de email (só e2e/CI) não usa bucket por IP. */
export function signupRegistrationIp(
  emailCapturePath: string | null,
  clientIp: string | null,
): string | null {
  return emailCapturePath ? null : clientIp;
}
