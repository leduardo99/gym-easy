# tests

- `tests/e2e`: Playwright contra o build de produção (`pnpm build && pnpm test:e2e`). Cobre só os fluxos críticos: registo, confirmação, login, reset, consentimento, perfil/treino e coach.
- Os testes unitários e de integração ficam ao lado do código (`*.test.ts`, `*.integration.test.ts`). A integração corre contra Postgres e Mailpit reais (ver CI). Duplos em `src/test/` (hoje só `server-only-stub.ts`; ver `docs/TESTING.md`).
- Sem `.only` nem `.skip` em commits. Sem sleeps: esperar por estados.
- Ver `docs/TESTING.md`.
