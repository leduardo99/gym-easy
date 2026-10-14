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

```bash
pnpm dev
```

O app abre em `http://127.0.0.1:3000`. `GET /api/health` responde `{ "status": "ok" }`. O catálogo visual fica em `/design` e responde 404 quando `VERCEL_ENV=production`.

`pnpm build` não precisa de um Postgres real. Durante o build, se `DATABASE_URL` estiver ausente, `src/lib/env.ts` usa um placeholder que não abre conexão. Em `pnpm dev` e `pnpm start` a variável continua obrigatória para qualquer código que chame `getDb()`.

## Banco

O schema Drizzle mora em `src/db/schema.ts`. O cliente usa o driver HTTP serverless do Neon (`@neondatabase/serverless` + `drizzle-orm/neon-http`).

```bash
pnpm db:generate   # gera SQL em src/db/migrations
pnpm db:migrate    # aplica no DATABASE_URL (host direct)
```

Não edite uma migração que já tenha sido aplicada.

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

| Variável       | Onde     | Notas                                                                                       |
| -------------- | -------- | ------------------------------------------------------------------------------------------- |
| `DATABASE_URL` | Servidor | Postgres do Neon. Obrigatória em runtime quando o banco é usado. Ausente no build é aceito. |

A ligação do projeto na Vercel fica fora deste repositório. Quando existir, defina `DATABASE_URL` em Development, Preview e Production. Não crie `NEXT_PUBLIC_DATABASE_URL`.

## CI

O workflow `.github/workflows/ci.yml` roda, em todo pull request: gitleaks, lint, Prettier, typecheck, Vitest, build, Playwright e `pnpm audit --audit-level high --ignore-unfixable`. O `--ignore-unfixable` só ignora advisory sem versão corrigida. Hoje isso cobre o `braces` transitivo do ESLint (`CVE-2026-93687`); quando sair patch, a CI volta a falhar até a atualização. Dependabot abre atualizações semanais de npm e GitHub Actions.
