# Testes

| Nível      | Peso | Ferramenta                        | O quê                                                                   |
| ---------- | ---- | --------------------------------- | ----------------------------------------------------------------------- |
| Unitário   | ~70% | Vitest + happy-dom                | Lógica pura (casos de uso, schemas, policies), componentes isolados     |
| Integração | ~20% | Vitest + Postgres e Mailpit reais | Repositórios, migrações (`migrations/*.test.ts`), email SMTP, crons     |
| E2E        | ~10% | Playwright (build de produção)    | Registo, confirmação, login, reset, consentimento, perfil/treino, coach |

- Ficheiros: `x.test.ts` (unitário) e `x.integration.test.ts` (integração) ao lado do código; e2e em `tests/e2e`.
- Duplos de teste em `src/test/` (hoje só `server-only-stub.ts`; `memory-*` / `capture-*` são **alvo; ainda não existem**). A rede externa (Resend, OpenRouter, HIBP) é sempre falsa.
- Cobertura (v8): mínimo de 80% em `src/features/**` e `src/lib/**`, sem descer face a `main`.
- Server Actions: testar o caso de uso diretamente. A action tem um teste de contrato (origem, sessão, Zod).

## Regras de QA (Sigma)

- **Neon:** só **leitura** para QA e agentes (sem migrações, sem escritas, sem branches destrutivas).
- **Email:**
  - **Dev:** Mailpit (`EMAIL_TRANSPORT=smtp` no compose com profile `dev`).
  - **Produção:** Resend obrigatório e **fail-closed** (`EMAIL_TRANSPORT=resend`; `smtp` e `log` rejeitados no arranque).
  - **Smoke local com Docker Compose:** `EMAIL_TRANSPORT=log` (sem enviar email real).
  - Endereços reais de teste em produção/staging com Resend: só `qa-gymeasy+<tag>@mail.grokbot.com` (quota do Resend).
- **Smoke manual de aceitação:** sempre em `https://app.gaffer.pt` (produção, `APP_URL`). Não usar previews da Vercel nem URLs de deploy temporário para fechar issues.
- **Linear:** usar `Refs LED-xx` nos PRs, nunca `Fixes`/`Closes`. Só a **Sigma** move para Done; se Done aparecer antes do smoke, a issue volta a In Review.
