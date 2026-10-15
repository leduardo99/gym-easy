# Migração falhada no arranque
Sintoma: o contentor sai com código diferente de zero e o log de `migrate-on-deploy` mostra erro.
1. Não reiniciar em loop. Ver o log (lock, permissões, SQL).
2. Lock preso: confirmar que não há outro contentor e verificar `pg_locks` para o advisory lock.
3. Permissões: confirmar que `DATABASE_URL_MIGRATOR` usa `gym_easy_migrator`.
4. Erro de SQL: corrigir com uma migração nova (nunca editar a aplicada) e voltar a fazer deploy. Se necessário, fazer rollback da imagem.
