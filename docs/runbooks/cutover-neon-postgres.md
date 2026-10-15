# Cutover Neon → Postgres partilhado

1. No bootstrap da infra (não por migração Drizzle): criar a BD e os roles `gym_easy_migrator`, `gym_easy_app` e `gym_easy_purge` **sem** `SUPERUSER`, `CREATEROLE` nem `BYPASSRLS`; `gym_easy_purge` é **`NOLOGIN`**. Ligação com `sslmode=verify-full` e a **CA do Coolify** na `DATABASE_URL`.
2. Janela de manutenção: parar as escritas (pôr a app em modo manutenção ou parar o contentor).
3. `pg_dump` do Neon → `pg_restore` no destino. Comparar a contagem de linhas por tabela.
4. Atualizar `DATABASE_URL` e `DATABASE_URL_MIGRATOR` no Coolify e fazer deploy (as migrações devem ser no-op).
5. Smoke test: login, perfil e treino.
6. **Reconsentimento:** após a migração para o Postgres partilhado, executar o fluxo de reconsentimento com o texto **LED-15b** (sem depender do Neon nem de Frankfurt).
7. Manter o Neon como **fallback** até a QA (Sigma) validar em `https://app.gaffer.pt`. Depois: **pausar** o projeto Neon (não apagar), **rodar as credenciais** do Neon (condição LED-63). Rollback até à validação: repor as URLs para o Neon.
8. Verificar permissões: `\dp consent_log` — a role `gym_easy_app` só tem `SELECT`/`INSERT` (após a migração `0010_consent_hardening`).
9. Depois do cutover estável: entra o PR do host canónico (`APP_URL`, ADR 0006).
