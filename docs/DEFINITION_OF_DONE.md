# Definition of Done

- [ ] Critérios de aceitação da issue cumpridos e demonstrados
- [ ] Testes no nível certo (ver `TESTING.md`); bug corrigido com teste de regressão
- [ ] `lint`, `typecheck`, `format:check`, `test`, `build` e `e2e` verdes no CI
- [ ] Sem código morto, `console.*` nem TODO sem issue
- [ ] Docs atualizadas (AGENTS.md, ARCHITECTURE.md, ADR, runbook ou `.env.example`)
- [ ] Migração gerada, revista, com GRANTs e plano de rollback
- [ ] Logs e métricas para o novo caminho, sem PII
- [ ] Aprovações de Arquitetura (Lambda), QA (Sigma) e Segurança (Delta) no HEAD atual do PR
- [ ] Smoke de QA em produção: `https://app.gaffer.pt` (`APP_URL`), deploy no Coolify com healthcheck OK — **sem previews da Vercel** nem outro host temporário
- [ ] Só a **Sigma (QA)** move a issue para Done (ver `CONTRIBUTING.md` e `TESTING.md`)
