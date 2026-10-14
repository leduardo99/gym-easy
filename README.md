# Gym Easy

App de treino (V1). Next.js (App Router) + TypeScript estrito + Tailwind CSS v4 + Drizzle no Neon.

## Requisitos

- Node.js 22 ou mais recente
- pnpm 10 (`packageManager` do `package.json`)
- [gitleaks](https://github.com/gitleaks/gitleaks) v8.30.1 no `PATH` (hook de pre-commit)

## Setup local

```bash
pnpm install
cp .env.example .env.local
```

Preencha `DATABASE_URL` em `.env.local` com a connection string do Neon. Use o host **pooled** para o app e o host **direct** para migrações. A variável é só de servidor: não use o prefixo `NEXT_PUBLIC_`.

`RESEND_API_KEY` e `EMAIL_FROM` também são só de servidor e opcionais. Sem a chave, o app usa o adapter de log (sem email, link ou corpo da mensagem). O remetente padrão é `onboarding@resend.dev`. O app não cria conta no Resend. `EMAIL_CAPTURE_PATH` existe só para o e2e local e é ignorado quando `VERCEL_ENV=production`.

```bash
pnpm dev
```

O app abre em `http://127.0.0.1:3000`. `GET /api/health` executa `select 1` e responde `{ "status": "ok", "db": "ok" }`. Se o banco falhar, responde 503 `{ "status": "error", "db": "unavailable" }` sem detalhes do erro. O catálogo visual fica em `/design` e responde 404 quando `VERCEL_ENV=production`.

`pnpm build` não precisa de um Postgres real. Durante o build, se `DATABASE_URL` estiver ausente, `src/lib/env.ts` usa um placeholder que não abre conexão. Em `pnpm dev` e `pnpm start` a variável continua obrigatória para qualquer código que chame `getDb()`.

## Banco

O schema Drizzle mora em `src/db/schema.ts`. Na Vercel o cliente usa o driver HTTP serverless do Neon (`@neondatabase/serverless` + `drizzle-orm/neon-http`). Postgres local e a CI usam o protocolo wire (`pg`) quando `DATABASE_DRIVER=pg` ou quando o host é `localhost` / `127.0.0.1`.

```bash
pnpm db:generate   # gera SQL em src/db/migrations
pnpm db:migrate    # aplica no DATABASE_URL (host direct)
```

`pnpm db:migrate` aplica só o SQL pendente. Use o host direct do Neon, sem `-pooler`.

- No pull request, a CI sobe um Postgres 16 e migra só esse banco.
- Na branch Neon `dev`, aplique com o host direct dessa branch. A branch `main` do Neon é produção: não migre a partir de uma branch de feature.
- Em produção, `.github/workflows/migrate.yml` roda em todo push na `main` e executa `pnpm db:migrate`. O valor vem do secret `DATABASE_URL_UNPOOLED` do environment `production` no GitHub (Settings → Environments → production → Environment secrets). Use a connection string direct da branch Neon `main`. O job falha se o secret estiver vazio ou se o host tiver `-pooler`, e não imprime a URL. O deploy da Vercel na `main` pode começar em paralelo; o job é idempotente. Este repositório não aplica a migração de produção sozinho.

Não edite uma migração que já tenha sido aplicada.

## Autenticação

Cadastro, confirmação de email, login e logout ficam em `/cadastro`, `/cadastro/confirme`, `/cadastro/confirmar` e `/login`. A senha usa argon2id. A sessão é um cookie `ge_session` (`HttpOnly`, `Secure` em HTTPS, `SameSite=Lax`) cujo valor no banco é só o hash. Rotas do app (`/inicio`, `/onboarding`, `/treinos`, `/historico`, `/perfil`) exigem sessão. O cadastro sempre responde "Se o email for válido, enviamos um link para continuar." Conta nova recebe um link de confirmação; email já usado avisa o dono. Sem `RESEND_API_KEY`, esses envios só entram no log.

## Qualidade

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

Commits seguem Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`). O pre-commit roda lint-staged e gitleaks; o commit-msg roda commitlint.

## Variáveis de ambiente

| Variável                | Onde           | Notas                                                                                                                                      |
| ----------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`          | Servidor       | Postgres do Neon, host pooled. Obrigatória em runtime. Ausente no build (`NEXT_PHASE=phase-production-build`) é aceito e não abre conexão. |
| `RESEND_API_KEY`        | Servidor       | Opcional. Sem ela, os emails de auth vão para o log, sem dados sensíveis.                                                                  |
| `EMAIL_FROM`            | Servidor       | Opcional. Padrão `onboarding@resend.dev`.                                                                                                  |
| `DATABASE_URL_UNPOOLED` | GitHub Actions | Secret do environment `production`. Host direct da branch Neon `main`. Não entra no app.                                                   |

Na Vercel, Preview usa a branch `dev` do Neon e Production usa a branch `main`. Não crie `NEXT_PUBLIC_DATABASE_URL`.

## CORS

A CDN da Vercel acrescenta `Access-Control-Allow-Origin: *` em HTML prerenderizado e arquivos estáticos, depois do proxy. O proxy apaga o header, mas a plataforma o recoloca nesses recursos. `vercel.json` substitui o `*` por `https://gym-easy.vercel.app`. Rotas `/api` não recebem o `*` da plataforma e ficam fora dessa regra.

## CI

O workflow `.github/workflows/ci.yml` sobe um Postgres 16, aplica `pnpm db:migrate` nele e roda, em todo pull request: gitleaks (histórico completo e checksum do binário), lint, Prettier, typecheck, Vitest, build, Playwright, `pnpm audit --audit-level high` e `pnpm audit --prod`. A única exceção de audit é `CVE-2026-93687` (`braces`, dependência de desenvolvimento do ESLint, sem patch), registrada em `pnpm-workspace.yaml` com dono `leduardo99` e expiração em 2026-11-13. Dependabot abre atualizações semanais de npm e GitHub Actions.
