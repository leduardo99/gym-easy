## O quê

<!-- Uma intenção por PR. -->

## Porquê

Refs LED-xx

## Como testar

- [ ] `pnpm lint` · `pnpm typecheck` · `pnpm format:check`
- [ ] `pnpm test` · `pnpm test:e2e` · `pnpm build`

## Checklist de arquitetura

- [ ] PR pequeno (< 400 linhas úteis) e sem misturar refactor com comportamento
- [ ] Respeita as camadas (`app → features → db|lib`); nenhuma feature importa outra
- [ ] Server Actions: origem (`APP_URL`) → sessão → Zod → caso de uso → `ActionResult`
- [ ] Sem `any`, `@ts-ignore`, `console.*`, código morto nem TODO sem issue
- [ ] Docs/ADR/AGENTS.md atualizados quando há decisão ou convenção nova
- [ ] Testes no nível certo; bug com teste de regressão

## Checklist de segurança

- [ ] Nenhum segredo no repo; nada secreto em `NEXT_PUBLIC_`; `.env.example` atualizado
- [ ] Todo o input do servidor validado com Zod; queries filtradas pelo `user.id` da sessão (sem IDOR)
- [ ] Host/origem só a partir de `APP_URL`
- [ ] Rate limit nas rotas sensíveis
- [ ] Saída de IA tratada como não confiável; logs sem PII, dados de saúde nem conteúdo do coach
- [ ] Headers de segurança mantidos (CSP com nonce, HSTS, `frame-ancestors 'none'`)
- [ ] Mexe em auth, consent, env, Docker ou dados pessoais → revisão da Delta

## Deploy

- [ ] Migração gerada, revista, com GRANTs e plano de rollback (ou "nenhuma")
- [ ] Compatível com Coolify em linux/arm64

## Dependências novas

<!-- Pacote e justificação, ou "nenhuma". -->
