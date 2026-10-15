# ADR 0008: Política de versões de dependências

- Estado: Aceite
- Data: 2026-10-15

## Contexto
Há ranges mistos (fixos vs `^`).

## Decisão
Os runtime críticos (`next`, `react`, `react-dom`, `ai`, provider) ficam fixos. O resto usa `^` com lockfile. Dependabot agrupado e semanal. Majors com issue e PR próprios. `@types/node` acompanha o Node da imagem.

## Consequências
Upgrades previsíveis e majors sempre isolados.
