# Restauro de backup

1. Identificar o ponto de restauro (backup do Coolify/Omega).
2. Restaurar para uma BD nova e validar o schema (`drizzle-kit check`) e as contagens.
3. Trocar `DATABASE_URL` e fazer deploy. Guardar a BD antiga para análise.
4. Registar o RPO real e abrir uma issue com as causas.
