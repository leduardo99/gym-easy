# Cutover Neon → Postgres partilhado
1. Criar a BD e os roles no servidor (`gym_easy_migrator`, `gym_easy_app`, `gym_easy_purge`) com TLS.
2. Janela de manutenção: parar as escritas (pôr a app em modo manutenção ou parar o contentor).
3. `pg_dump` do Neon → `pg_restore` no destino. Comparar a contagem de linhas por tabela.
4. Atualizar `DATABASE_URL` e `DATABASE_URL_MIGRATOR` no Coolify e fazer deploy (as migrações devem ser no-op).
5. Smoke test: login, perfil e treino.
6. Manter o Neon só em leitura por 7 dias como fallback. Rollback: repor as URLs.
7. Depois do cutover: entra o PR do host canónico (`APP_URL`, ADR 0006).
