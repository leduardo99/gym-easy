# ADR 0009: Logger e observabilidade

- Estado: Aceite
- Data: 2026-10-15

## Contexto
Há `console.*` espalhados e nenhum padrão.

## Decisão
Logger JSON único (`lib/logger`, pino) com redação, `requestId`, OpenTelemetry via `instrumentation.ts` e SLOs em `docs/OBSERVABILITY.md`.

## Consequências
Diagnóstico consistente. O lint proíbe `console`.
