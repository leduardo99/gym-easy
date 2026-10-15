# src/features

Uma pasta por domínio (`auth`, `consent`, `training`, `profile`, `coach` — `coach` é **alvo; ainda não existe** em `main`).

```
<feature>/
  actions.ts        # "use server": origem → sessão → Zod → caso de uso → ActionResult
  schemas.ts        # Zod + tipos inferidos
  <caso-de-uso>.ts  # lógica pura e testável; dependências injetadas (store, clock, sender)
  repository.ts     # único ponto de acesso à BD da feature (um ficheiro por agregado quando passa as ~300 linhas)
  components/       # UI específica da feature (opcional)
  index.ts          # API pública para as outras camadas
```

- As Server Actions devolvem `ActionResult<T>` (`{ ok: true, data } | { ok: false, fieldErrors?, formError? }`). Usam `redirect()` só para navegar quando tudo correu bem.
- `features/coach` (**alvo; ainda não existe**): prompts, tools, regras de risco, histórico e propostas. O adaptador do provider (OpenRouter/AI SDK) fica em `lib/ai` (**alvo; ainda não existe**).
- Duplos de teste `memory-*` / `capture-*` (**alvo; ainda não existem**) vivem em `src/test/` (hoje só `server-only-stub.ts`), não aqui.
- Uma feature não importa outra feature: usa o `index.ts` da outra ou sobe a peça para `lib`.
