# ADR 0006: Host canónico a partir de APP_URL

- Estado: Aceite
- Data: 2026-10-15

## Contexto
As verificações de origem usavam `host`/`x-forwarded-host`, que o cliente pode forjar.

## Decisão
A origem e o host canónicos vêm só de `APP_URL`, validada em `env.ts`. CSRF, links de email e CORS usam esse valor.

## Consequências
Fecha o spoofing de host, mas cada ambiente precisa de `APP_URL` correta.
