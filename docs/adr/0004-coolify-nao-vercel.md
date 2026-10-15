# ADR 0004: Deploy no Coolify (arm64), não na Vercel

- Estado: Aceite
- Data: 2026-10-15

## Contexto

Custos e controlo do homelab; o servidor é arm64.

## Decisão

Imagem standalone multi-stage para linux/arm64, non-root, com healthcheck, deployada no Coolify atrás do Traefik. Os crons são do Coolify.

## Consequências

Sem features exclusivas da Vercel. Os binários nativos têm de existir em arm64. Somos nós a gerir TLS, logs e backups.
