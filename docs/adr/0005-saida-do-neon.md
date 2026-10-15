# ADR 0005: Saída do Neon para o Postgres partilhado

- Estado: Aceite
- Data: 2026-10-15

## Contexto
Concentrar a infraestrutura no Coolify.

## Decisão
`DATABASE_URL` aponta para o Postgres partilhado com TLS. O Neon fica como fallback até ao fim do cutover (runbook).

## Consequências
Backups e upgrades passam a ser responsabilidade da Omega.
