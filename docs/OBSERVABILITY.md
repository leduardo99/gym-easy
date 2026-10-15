# Observabilidade

## Logs

- `@/lib/logger` (pino, JSON em stdout, recolhido pelo Coolify). Campos: `level`, `event`, `requestId`, `userId` pseudonimizado, `durationMs`.
- Redação obrigatória: email, IP, tokens, cookies, dados de saúde e conteúdo do coach.
- Eventos com nome estável (`auth.login_failed`, `email.delivery_failed`, `ai.request`).

## Traces e métricas

- OpenTelemetry via `src/instrumentation.ts` (exporter OTLP configurável; desligado sem endpoint).
- Métricas: latência p95 por rota, taxa de 5xx, falhas de email, tokens, custo e fallback de IA, duração das migrações.

## Health

- `/api/health`: liveness (usado pelo `HEALTHCHECK`). Alvo: `/api/ready` verifica a BD.

## SLOs

- Disponibilidade: 99,5%/30 dias. p95 das páginas < 500 ms. Erro do coach < 5%.
- Alertas (Coolify/Uptime Kuma): healthcheck a falhar 3×, 5xx > 2% durante 10 min, falha de migração.
