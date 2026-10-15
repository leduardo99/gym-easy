# src/db

- `schema.ts` é a fonte de verdade. Mudanças de schema são feitas com `pnpm db:generate` e a migração gerada é revista à mão.
- **Nunca editar uma migração já aplicada.** As correções fazem-se com uma migração nova.
- Roles: `gym_easy_migrator` (DDL, usado no arranque com `RUN_MIGRATIONS=true`), `gym_easy_app` (runtime, sem UPDATE/DELETE em `consent_log`) e `gym_easy_purge`. Toda a migração que cria tabelas tem de declarar os GRANTs.
- Cada migração com lógica (funções, GRANTs, triggers) leva um teste em `migrations/*.test.ts`.
- O cliente vem de `getDb()` (`index.ts`, com `server-only`). O pool é configurado por `DB_*` (`driver.ts`).
- O alvo é o Postgres partilhado no Coolify, com TLS. O Neon é só fallback até ao cutover.
