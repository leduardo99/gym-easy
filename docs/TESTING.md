# Testes

| Nível      | Peso | Ferramenta                        | O quê                                                                   |
| ---------- | ---- | --------------------------------- | ----------------------------------------------------------------------- |
| Unitário   | ~70% | Vitest + happy-dom                | Lógica pura (casos de uso, schemas, policies), componentes isolados     |
| Integração | ~20% | Vitest + Postgres e Mailpit reais | Repositórios, migrações (`migrations/*.test.ts`), email SMTP, crons     |
| E2E        | ~10% | Playwright (build de produção)    | Registo, confirmação, login, reset, consentimento, perfil/treino, coach |

- Ficheiros: `x.test.ts` (unitário) e `x.integration.test.ts` (integração) ao lado do código; e2e em `tests/e2e`.
- Duplos de teste em `src/test/`. A rede externa (Resend, OpenRouter, HIBP) é sempre falsa.
- Cobertura (v8): mínimo de 80% em `src/features/**` e `src/lib/**`, sem descer face a `main`.
- Server Actions: testar o caso de uso diretamente. A action tem um teste de contrato (origem, sessão, Zod).
