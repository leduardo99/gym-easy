# src/lib

Só utilitários sem domínio:

- `env.ts`: o único ponto de leitura de `process.env` (Zod). Rejeita segredos com `NEXT_PUBLIC_`.
- `app-url.ts`: o host e a origem canónicos a partir de `APP_URL`.
- `http/`: `assertSameOriginMutation()` e respostas de erro (alvo).
- `logger.ts`: logger JSON com redação (alvo).
- `cron-auth.ts`, `security-headers.ts`, `utils.ts`.
- `ai/`: **só o adaptador do AI SDK** (provider OpenRouter, seleção de modelos, zero retention, chamada estruturada e streaming). Prompts e regras do coach ficam em `features/coach`.

`lib` não importa de `features` nem de `app`.
