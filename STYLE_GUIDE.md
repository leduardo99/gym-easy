# Guia de estilo

Baseado no [Google Engineering Practices](https://google.github.io/eng-practices/) e no [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html), com as exceções do Next.js.

## Mudanças (CLs)

- Uma intenção por PR. Alvo < 200 linhas úteis; limite de 400 (aviso) e 800 (falha no CI). Refactors e comportamento nunca no mesmo PR.
- A descrição explica o porquê e não só o quê.

## Code review

- Prioridade: design → funcionalidade → complexidade → testes → nomes → comentários → estilo.
- Aprovar quando melhora a saúde do código, mesmo que não esteja perfeito. Prefixo `Nit:` para o que não é bloqueante.
- Primeira resposta em menos de 1 dia útil.

## TypeScript

- Named exports. `export default` só onde o Next exige (page, layout, error, config).
- `any` é proibido; usar `unknown` + narrowing. `!` só com justificação. `as` só em fronteiras validadas.
- `const` por omissão; `readonly` em props e tipos de dados. Sem `namespace`, sem `enum` (usar unions de literais).
- Tipos derivados de Zod (`z.infer`). Um conceito, um tipo.
- Nomes: `camelCase` para valores, `PascalCase` para tipos e componentes, `UPPER_SNAKE` para constantes de módulo, ficheiros em `kebab-case`.
- Funções pequenas e sem efeitos escondidos. Dependências injetadas para testar.
- Comentários explicam o porquê. JSDoc em APIs públicas de `lib`.

## React/Next

- Server Components por omissão; o estado fica na folha; composição em vez de props booleanas.
- Sem estado mutável ao nível do módulo em código de servidor.

## Idioma

Código em inglês. UI, docs e mensagens de erro ao utilizador em **pt-PT**.
