# Incidente de IA (OpenRouter)

Sintoma: o coach falha, há latência alta ou os custos disparam.

1. Ver o estado do OpenRouter e os logs `ai.request` (modelo, fallback, erros).
2. Indisponibilidade: o coach mostra o fallback. Se precisar, remover a chave ou os modelos (`COACH_MODELS`) para desligar.
3. Custos: baixar os limites de rate e cooldown e confirmar que só são usados endpoints com zero retention.
4. Nunca pôr conteúdo de mensagens nos logs para fazer debug.
