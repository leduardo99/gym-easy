# Restauro de backup

A única fonte de restauro é o backup diário da **Omega**, cifrado com GPG (AES256), no OCI Object Storage `eu-madrid-1` (bucket privado), retenção de 7 dias. Os backups agendados do Coolify estão desligados e foram apagados.

1. Identificar o objeto no OCI (data/hora do ponto de restauro desejado).
2. Descarregar o ficheiro cifrado. **Decifrar com a chave GPG** (cópia offline da passphrase; nunca registar a passphrase em logs, tickets nem histórico da shell).
3. Restaurar o dump decifrado para uma **BD nova** com os mesmos roles e GRANTs (`gym_easy_migrator`, `gym_easy_app`, `gym_easy_purge`).
4. Validar o schema (`drizzle-kit check`) e as contagens por tabela.
5. Trocar `DATABASE_URL` / `DATABASE_URL_MIGRATOR` no Coolify e fazer deploy. Guardar a BD antiga para análise.
6. **Apagar o dump decifrado** do disco assim que o restauro estiver validado.
7. Registar o RPO real e abrir uma issue com as causas.
