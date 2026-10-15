# Arquitetura: Gym Easy

## Contexto
O utilizador regista treinos, vê a sua evolução e conversa com um coach de IA. Sistemas externos: Postgres (partilhado, Coolify), Resend (email), OpenRouter (LLM) e Coolify/Traefik (proxy, TLS, cron).

```
Browser ──HTTPS──> Traefik (Coolify) ──> Next.js standalone (arm64, non-root)
                                           ├─ Postgres (gym_easy_app / gym_easy_migrator)
                                           ├─ Resend (email)
                                           └─ OpenRouter via AI SDK
Coolify cron ──Bearer CRON_SECRET──> /api/cron/*
```

## Camadas
| Camada | Pasta | Pode importar |
|---|---|---|
| Rotas/UI | `src/app` | features, components, lib |
| Domínio | `src/features/<f>` | db, lib, components |
| Dados | `src/db` | lib |
| Infra/utilitários | `src/lib` | nada interno |
| UI base | `src/components` | lib |

## Fluxos
- **Página:** `proxy.ts` (CSP com nonce, headers) → layout → `requireUser` → função da feature → repositório.
- **Mutação:** Server Action → mesma origem contra `APP_URL` → sessão → Zod → caso de uso → `ActionResult`.
- **API:** route handler com a mesma ordem; crons com bearer (`lib/cron-auth`).
- **Coach:** `api/ai/coach` → `features/coach` (prompt, tools, risco, histórico) → `lib/ai` (adaptador AI SDK/OpenRouter, zero retention).

## Dados
Drizzle + postgres.js e migrações SQL versionadas em `src/db/migrations`, aplicadas no arranque do contentor sob `pg_advisory_lock`. Roles separados para migração e runtime. `consent_log` é append-only para a app.

## Segurança
Auth própria (argon2id, sessões opacas em BD, cookies HttpOnly), rate limit em BD, HIBP, CSP com nonce, HSTS, host canónico em `APP_URL`, env validado por Zod.

## Deploy
Imagem Docker standalone multi-stage em **linux/arm64**, publicada no Coolify. Healthcheck em `/api/health`. Ver `docs/runbooks/`.

## Decisões
Ver `docs/adr/0001` a `0009`.
