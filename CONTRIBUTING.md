# Contribuir

1. Partir de uma issue Linear (team LED). Branch: `led-xx-slug` (ou `tipo/slug` para docs/chore).
2. Commits em [Conventional Commits](https://www.conventionalcommits.org/) (`feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`, `perf`, `build`), validados pelo commitlint. Scope opcional (`feat(coach): …`).
3. Título do PR: `tipo(scope): descrição (Refs LED-xx)`. No corpo usar **`Refs LED-xx`**, nunca `Fixes` nem `Closes` (para não fechar a issue no merge). Preencher o template.
4. Mudança grande: RFC primeiro (`docs/rfc/TEMPLATE.md`). Decisão duradoura: ADR.
5. Aprovações obrigatórias no **HEAD atual** do PR (reconfirmar após rebase): Arquitetura (Lambda), QA (Sigma) e Segurança (Delta). CI verde.
6. Merge em squash **só** com os três OKs no HEAD atual. **Só a Sigma (QA)** move a issue para Done no Linear; se uma issue for para Done antes do smoke em produção (`https://app.gaffer.pt`), volta para In Review.
7. Hotfix de produção: o mesmo fluxo — os três OKs **antes** do merge (sem exceção de revisão da Arquitetura só depois do merge).
