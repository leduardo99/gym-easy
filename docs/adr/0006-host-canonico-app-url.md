# ADR 0006: Host canónico a partir de APP_URL

- Estado: Aceite
- Data: 2026-10-15

## Contexto

As verificações de origem usavam `host`/`x-forwarded-host`, que o cliente pode forjar.

## Decisão

`APP_URL` é fixa por ambiente, validada no arranque em `env.ts` (HTTPS em produção, sem path). A origem e o host canónicos vêm **só** deste valor — única base para links de email e tokens (confirmação, reset, export LED-48), CSRF e CORS. Não confiar em `host`, `x-forwarded-host`, `x-forwarded-proto` nem outros `X-Forwarded-*` / `Forwarded` enviados pelo cliente.

## Consequências

Fecha o spoofing de host (inclui o cenário de host forjado da LED-72). Cada ambiente precisa de `APP_URL` correta (`https://app.gaffer.pt` em produção).
