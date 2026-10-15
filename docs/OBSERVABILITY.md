# Observabilidade

## Logs

- `@/lib/logger` (**alvo; ainda não existe**) — pino, JSON em `stdout`, recolhido pelo Coolify. Retenção no Coolify: **30–90 dias** (conforme política da infra). Campos: `level`, `event`, `requestId`, `userId` pseudonimizado (chave **diferente** de `CONSENT_PSEUDONYM_KEY`), `durationMs`.
- Redação obrigatória: email, IP, passwords, cabeçalhos `Authorization` / `Cookie` / `Set-Cookie`, segredos de env, query strings com token (`?token=` — o `#fragment` não chega ao servidor), corpos de pedido, dados de saúde e conteúdo do coach.
- Eventos com nome estável (`auth.login_failed`, `email.delivery_failed`, `ai.request`).

## Traces e métricas

- OpenTelemetry via `src/instrumentation.ts` (exporter OTLP configurável; desligado sem endpoint).
- Métricas: latência p95 por rota, taxa de 5xx, falhas de email, **tokens de IA** (não confundir com tokens de sessão/email), custo e fallback de IA, duração das migrações.

## Health

- `/api/health`: liveness (usado pelo `HEALTHCHECK`). Alvo: `/api/ready` verifica a BD.

## SLOs

- Disponibilidade: 99,5%/30 dias. p95 das páginas < 500 ms. Erro do coach < 5%.
- Alertas (Coolify/Uptime Kuma): healthcheck a falhar 3×, 5xx > 2% durante 10 min, falha de migração.
