# ADR 0002: Drizzle + postgres.js e política de migrações

- Estado: Aceite
- Data: 2026-10-15

## Contexto

É preciso SQL tipado, migrações revistas e roles com privilégios mínimos.

## Decisão

Drizzle ORM com postgres.js. As migrações são geradas por `drizzle-kit`, revistas, imutáveis depois de aplicadas, com teste quando têm lógica, e aplicadas no arranque com `gym_easy_migrator`.

## Consequências

O schema fica tipado e as migrações são auditáveis. O CI tem de verificar o drift (`drizzle-kit check`).
