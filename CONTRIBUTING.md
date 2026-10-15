# Contribuir

1. Partir de uma issue Linear (team LED). Branch: `led-xx-slug` (ou `tipo/slug` para docs/chore).
2. Commits em [Conventional Commits](https://www.conventionalcommits.org/) (`feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`, `perf`, `build`), validados pelo commitlint. Scope opcional (`feat(coach): …`).
3. Título do PR: `tipo(scope): descrição (Refs LED-xx)`. O corpo inclui `Refs LED-xx` e preenche o template.
4. Mudança grande: RFC primeiro (`docs/rfc/TEMPLATE.md`). Decisão duradoura: ADR.
5. Aprovações obrigatórias: Arquitetura (Lambda), QA (Sigma) e Segurança (Delta). CI verde.
6. Merge em squash. **Só a Qualidade move a issue para Done.**
7. Fixes urgentes de produção podem ser revistos depois do merge pela Arquitetura, mas nunca sem QA e Segurança.
