# Incidente de email (Resend)
Sintoma: `email.delivery_failed` ou utilizadores sem email de confirmação.
1. Ver o estado do Resend e a validade de `RESEND_API_KEY`.
2. Verificar o domínio (SPF/DKIM) de `EMAIL_FROM`.
3. Os utilizadores podem pedir reenvio (há cooldown). Não mudar para SMTP em produção (o `env.ts` rejeita).
