# ADR 0007: IA via AI SDK + OpenRouter

- Estado: Aceite
- Data: 2026-10-15

## Contexto

O coach precisa de vários modelos, fallback e privacidade.

## Decisão

AI SDK com o provider OpenRouter, pedindo zero retention/no-training. Implementação em `lib/ai` (provider, prompts, tools e histórico). Extrair `features/coach` é **alvo** para alinhar com a organização por feature.

## Consequências

É possível trocar de modelo sem mexer no domínio de treino. Os logs nunca levam conteúdo.
