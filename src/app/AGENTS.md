# src/app

- As páginas e os layouts só compõem: leem a sessão (`requireUser`), chamam funções da feature e renderizam. Não têm SQL nem regras de negócio.
- Server Components por omissão. `"use client"` só no componente folha que precisa de estado ou eventos.
- `cacheComponents` está ativo: o que é dinâmico (cookies, headers, sessão) fica dentro de `<Suspense>` ou usa `connection()`. Dados partilhados e cacheáveis usam `"use cache"` + `cacheTag`.
- Alvo: grupos `(public)` e `(app)`. O layout de `(app)` chama `requireUser`. Cada grupo tem `error.tsx`, `loading.tsx` e `not-found.tsx`; a raiz tem `global-error.tsx`.
- Route handlers (`api/**`) seguem esta ordem: mesma origem (contra `APP_URL`) → content-type → sessão/bearer → Zod → caso de uso. Os erros respondem com JSON `{ error }` e o status certo.
- Crons (`api/cron/**`): só **POST**, `unauthorizedCron` de `@/lib/cron-auth` (bearer `CRON_SECRET`, SHA-256 + `timingSafeEqual`).
- Nomes de rota em pt-PT e sem ambiguidade (ver LED: `cadastro/confirmar` vs `confirme`).
