## O quê

<!-- Resumo da mudança. -->

## Por quê

<!-- Issue (LED-XX) e o problema que isso resolve. -->

## Como testar

- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm test:e2e`
- [ ] `pnpm build` sem `DATABASE_URL` real

## Checklist de revisão

- [ ] Testes cobrem o comportamento novo
- [ ] Tipos estritos (`strict` + `noUncheckedIndexedAccess`), sem `any` injustificado e sem `@ts-ignore`
- [ ] Acessibilidade: rótulos, foco visível, alvo de toque de 44px
- [ ] Performance: sem trabalho extra no caminho crítico

## Checklist de segurança

- [ ] Nenhum segredo no repositório (gitleaks limpo; nada em `NEXT_PUBLIC_` que seja secreto)
- [ ] `.env.example` atualizado se houve variável nova; valor real só na Vercel
- [ ] Toda entrada no servidor validada com zod
- [ ] Queries só via Drizzle (parametrizadas), filtradas pelo `user_id` da sessão quando houver dados de usuário
- [ ] IDOR: nenhum id de usuário, treino ou recurso vem do cliente para autorizar a query; há teste quando a rota lê ou altera dados de usuário
- [ ] Rate limit em login, reset de senha e outras rotas sensíveis, quando essas rotas existirem
- [ ] Uploads validados (tipo, tamanho e conteúdo) e armazenados sem execução do arquivo
- [ ] Saída de IA tratada como não confiável: não executar, não renderizar HTML cru, validar com zod antes de persistir ou exibir
- [ ] Headers de segurança em todas as rotas: CSP, `frame-ancestors 'none'` e `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` restritiva e HSTS em produção
- [ ] Novas dependências justificadas na descrição
- [ ] Se mexe em auth ou dados pessoais: revisão do agente de Segurança

## Dependências novas

<!-- Liste cada pacote adicionado e por que ele é necessário. Escreva "nenhuma" se não houver. -->
