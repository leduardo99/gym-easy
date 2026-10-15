# ADR 0005: Saída do Neon para o Postgres partilhado

- Estado: Aceite
- Data: 2026-10-15

## Contexto

Concentrar a infraestrutura no Coolify.

## Decisão

`DATABASE_URL` aponta para o Postgres partilhado com `sslmode=verify-full` e a CA do Coolify. O Neon permanece como fallback até a QA (Sigma) validar o cutover (runbook); depois o projeto Neon é **pausado** (não apagado) e as credenciais Neon são **rodadas**.

## Consequências

Backups e upgrades passam a ser responsabilidade da Omega.
