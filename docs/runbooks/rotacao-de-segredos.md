# Rotação de segredos

Segredos de runtime: só nas variáveis de ambiente do **Coolify** (não no repositório).

Lista: `CRON_SECRET`, `CONFIRM_EMAIL_SECRET`, `CONSENT_PSEUDONYM_KEY`, `RESEND_API_KEY`, `OPENROUTER_API_KEY`, passwords da BD, **chave GPG dos backups** (Omega/OCI; rodada a 15/10/2026 — cópia offline; backups antigos ainda precisam da chave antiga até expirarem os 7 dias de retenção).

1. Gerar (sem imprimir o valor no terminal): `openssl rand -base64 32 | pbcopy` ou colar diretamente no Coolify.
2. Atualizar no Coolify e no environment GitHub **`production`** (só segredos de deploy) e voltar a fazer deploy. Atualizar também a Scheduled Task do Coolify quando rodar `CRON_SECRET`.
3. Efeitos: `CONFIRM_EMAIL_SECRET` invalida os cookies de confirmação pendentes. `CONSENT_PSEUDONYM_KEY` já foi rodada a 15/10/2026 ao abrigo de um plano documentado — nova rotação exige RFC e plano de re-ligação das provas. `CRON_SECRET` exige atualizar a Scheduled Task do Coolify.
4. Fuga: rodar de imediato, revogar no provider e avisar a Delta (ver também `incidente-ia.md` para `OPENROUTER_API_KEY`).
