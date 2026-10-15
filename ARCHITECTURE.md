# Arquitetura: Gym Easy

## Contexto

O utilizador regista treinos, vê a sua evolução e conversa com um coach de IA. Sistemas externos: Postgres (partilhado, Coolify), Resend (email), OpenRouter (LLM) e Coolify/Traefik (proxy, TLS, Scheduled Tasks).

```
Browser ──HTTPS──> Traefik (Coolify) ──> Next.js standalone (arm64, non-root)
                                           ├─ Postgres (gym_easy_app / gym_easy_migrator)
                                           ├─ Resend (email)
                                           └─ OpenRouter via AI SDK
Scheduled Task do Coolify ──POST + Bearer CRON_SECRET──> /api/cron/*
```

## Camadas

| Camada            | Pasta              | Pode importar             |
| ----------------- | ------------------ | ------------------------- |
| Rotas/UI          | `src/app`          | features, components, lib |
| Domínio           | `src/features/<f>` | db, lib, components       |
| Dados             | `src/db`           | lib                       |
| Infra/utilitários | `src/lib`          | nada interno              |
| UI base           | `src/components`   | lib                       |

## Fluxos

- **Página:** `proxy.ts` (CSP com nonce, headers) → layout → `requireUser` → função da feature → repositório.
- **Mutação:** Server Action → mesma origem contra `APP_URL` → sessão → Zod → caso de uso → `ActionResult`.
- **API:** route handler com a mesma ordem; crons só por **POST**, com `CRON_SECRET` obrigatório em produção e comparação `timingSafeEqual` sobre **SHA-256** do bearer e do segredo (hoje inline em `api/cron/purge-consent-proofs/route.ts`; extrair para `@/lib/cron-auth` é **alvo; ainda não existe**).
- **Coach (alvo; ainda não existe em `main`):** `api/ai/coach` → `features/coach` (prompt, tools, risco, histórico) → `lib/ai` (adaptador AI SDK/OpenRouter, zero retention).

## Dados

Drizzle + postgres.js e migrações SQL versionadas em `src/db/migrations`, aplicadas no arranque do contentor sob `pg_advisory_lock`. Roles separados para migração e runtime. `consent_log` é append-only para a app.

## Segurança

Auth própria (argon2id, sessões opacas em BD, cookies HttpOnly), rate limit em BD, HIBP, CSP com nonce, HSTS, host canónico em `APP_URL` (não confiar em `host`, `x-forwarded-host` nem outros `X-Forwarded-*` / `Forwarded` forjados pelo cliente), segredos de runtime só nas env do Coolify, env validado por Zod.

## Deploy

Imagem Docker standalone multi-stage em **linux/arm64**, publicada no Coolify. Produção em `https://app.gaffer.pt`. Healthcheck em `/api/health`. Sem previews da Vercel para validação. Ver `docs/runbooks/`.

## Decisões

Ver `docs/adr/0001` a `0009`.
