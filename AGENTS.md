# AGENTS.md: Gym Easy

App de registo de treinos. Next.js 16 (App Router, Cache Components), React 19, TypeScript estrito, Drizzle + postgres.js, Zod 4, shadcn/Tailwind 4, AI SDK + OpenRouter. Deploy: **Coolify em arm64** (imagem standalone), Postgres partilhado. Não é Vercel.

## Comandos

`pnpm lint` · `pnpm typecheck` · `pnpm format:check` · `pnpm test` · `pnpm test:e2e` · `pnpm build` · `pnpm db:generate` (nunca editar migrações aplicadas).

## Mapa

| Pasta              | Papel                                                         | Guia                       |
| ------------------ | ------------------------------------------------------------- | -------------------------- |
| `src/app`          | Rotas finas que só compõem features                           | `src/app/AGENTS.md`        |
| `src/features/<f>` | Domínio: actions, schemas, casos de uso, repositório          | `src/features/AGENTS.md`   |
| `src/db`           | Schema, migrações, seeds, cliente                             | `src/db/AGENTS.md`         |
| `src/lib`          | Utilitários sem domínio (env, http, logger, adaptador AI SDK) | `src/lib/AGENTS.md`        |
| `src/components`   | `ui/` (shadcn) e composição                                   | `src/components/AGENTS.md` |
| `tests`            | e2e Playwright                                                | `tests/AGENTS.md`          |

Os imports seguem uma direção: `app → features → (db | lib)` e `components → lib`. Uma feature não importa outra feature: o que é partilhado sobe para `lib` ou passa por uma interface pública (`index.ts`).

## Regras inegociáveis

- O host canónico vem de `APP_URL` (`getServerEnv()`). Nunca de `host` nem de `x-forwarded-host`.
- Todo o input do servidor é validado com Zod. Segredos nunca em `NEXT_PUBLIC_`.
- Só os repositórios tocam na BD. As queries de dados do utilizador filtram pelo `user.id` da sessão.
- Sem `console.*`: usar o logger. Nunca registar PII, dados de saúde nem conteúdo do coach.
- TDD: o teste primeiro e a verificação antes de dizer "feito" (correr os comandos acima).
- PRs pequenos (< 400 linhas úteis), Conventional Commits, `Refs LED-xx`. Aprovação de Arquitetura (Lambda), QA (Sigma) e Segurança (Delta). Só a Qualidade move para Done.

## Docs

`ARCHITECTURE.md` · `docs/adr/` · `docs/rfc/TEMPLATE.md` · `STYLE_GUIDE.md` · `CONTRIBUTING.md` · `docs/DEFINITION_OF_DONE.md` · `docs/TESTING.md` · `docs/OBSERVABILITY.md` · `docs/runbooks/`.

## Skills recomendadas

vercel-react-best-practices, next-best-practices, next-cache-components, next-upgrade, vercel-composition-patterns, web-design-guidelines, ai-sdk, shadcn, context7 (docs atuais), superpowers TDD/verification, ce-code-review. Não usar skills de deploy na Vercel nem de Neon.
