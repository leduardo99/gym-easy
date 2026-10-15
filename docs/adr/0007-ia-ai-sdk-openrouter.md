# ADR 0007: IA via AI SDK + OpenRouter

- Estado: Aceite
- Data: 2026-10-15

## Contexto

O coach precisa de vários modelos, fallback e privacidade.

## Decisão

AI SDK com o provider OpenRouter, pedindo zero retention/no-training. Adaptador em `lib/ai`; prompts e regras em `features/coach`.

## Consequências

É possível trocar de modelo sem mexer no domínio. Os logs nunca levam conteúdo.
