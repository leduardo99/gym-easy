# Rotação de segredos

Segredos: `CRON_SECRET`, `CONFIRM_EMAIL_SECRET`, `CONSENT_PSEUDONYM_KEY`, `RESEND_API_KEY`, `OPENROUTER_API_KEY`, passwords da BD.

1. Gerar: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`.
2. Atualizar no Coolify (e nos secrets do GitHub, se aplicável) e voltar a fazer deploy.
3. Efeitos: `CONFIRM_EMAIL_SECRET` invalida os cookies de confirmação pendentes. `CONSENT_PSEUDONYM_KEY` **não roda sem um plano**, porque quebra a ligação das provas de consentimento: abrir uma RFC. `CRON_SECRET` exige atualizar também o cron do Coolify.
4. Fuga: rodar de imediato, revogar no provider e avisar a Delta.
