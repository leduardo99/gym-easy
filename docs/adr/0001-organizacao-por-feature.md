# ADR 0001: Organização por feature

- Estado: Aceite
- Data: 2026-10-15

## Contexto

O código estava espalhado entre `lib`, `consent` e `features`.

## Decisão

Uma pasta por domínio em `src/features`, rotas finas em `src/app`, utilitários sem domínio em `src/lib`. Direção dos imports `app → features → (db|lib)`, imposta por ESLint.

## Consequências

Coesão por domínio e menos acoplamento. Obriga a mover `src/consent` e o código de domínio de `src/lib/ai` (**alvo; ainda não existe**).
