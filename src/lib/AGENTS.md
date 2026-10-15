# src/lib

Só utilitários sem domínio:

- `env.ts`: o único ponto de leitura de `process.env` (Zod). Rejeita segredos com `NEXT_PUBLIC_`.
- `app-url.ts`: o host e a origem canónicos a partir de `APP_URL`.
- `allowed-origin.ts`: `isAllowedOrigin` / `isAllowedOriginFromHeaders` — compara só `Origin` ou `Referer` (fallback) com `getServerEnv().APP_URL`; nunca usa `Host` nem `X-Forwarded-*`.
- `http/`: respostas de erro HTTP partilhadas (**alvo; ainda não existe**).
- `logger.ts`: logger JSON com redação (**alvo; ainda não existe**).
- `cron-auth.ts`: `unauthorizedCron` e comparação segura do bearer dos crons.
- `security-headers.ts`, `utils.ts`.
- `ai/`: coach — adaptador AI SDK/OpenRouter, prompts, tools, risco e histórico (ver `ai/README.md`). Só este diretório importa `ai` e `@openrouter/ai-sdk-provider`. Extrair domínio para `features/coach` é **alvo**.

`lib` não importa de `features` nem de `app` (exceção temporária: o coach em `ai/` acede a consentimento/sessão via APIs públicas das features).
