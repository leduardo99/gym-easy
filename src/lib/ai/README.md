# `src/lib/ai`

Camada do coach. Só este diretório importa `ai` e `@openrouter/ai-sdk-provider`. O lint recusa essas importações no resto de `src`.

## Ambiente

- `OPENROUTER_API_KEY` — opcional. Sem chave, o chat não chama modelo.
- `COACH_MODELS` e `PLAN_MODELS` — ids separados por vírgula, cada um a terminar em `:free`. Lista vazia é válida. Em `paid_zdr` estas listas devem ficar vazias.
- `OPENROUTER_PRIVACY_MODE` — `zdr_only` (padrão), `zdr_then_fallback` ou `paid_zdr` (opt-in). Em `zdr_then_fallback`, cada modelo `:free` tenta primeiro com `zdr:true` e `data_collection:deny`; só após 404 de política de dados repete o mesmo modelo com `zdr:false` e `data_collection:deny`. Em `paid_zdr`, usa listas pagas explícitas e envia sempre `provider: { zdr: true, data_collection: deny, only: [<OPENROUTER_PROVIDERS>], allow_fallbacks: false }` — sem `zdr:false` nem fallback fora de ZDR.
- `COACH_MODELS_PAID`, `PLAN_MODELS_PAID` — obrigatórias e não vazias com `OPENROUTER_PRIVACY_MODE=paid_zdr` (sem defaults).
- `COACH_CONSENT_VERSION_PAID_ZDR` — obrigatório em `paid_zdr` (valor esperado `2026-10-15c` até os textos -15c existirem). O coach só serve em `paid_zdr` com `coach_health` e `coach_chat` concedidos nessa versão; grants `-15b` não contam.
- `OPENROUTER_PROVIDERS` — lista de providers OpenRouter (padrão `deepinfra`) usada em `paid_zdr`.
- `NEXT_PUBLIC_OPENROUTER_API_KEY` é rejeitado.

O identificador da app no OpenRouter é `https://app.gaffer.pt`.

## Pedido de chat

`POST /api/ai/coach` exige sessão, `content-type: application/json` e `Origin` com o mesmo host do pedido. O `AbortSignal` do pedido cancela a geração.

Antes do modelo: Zod, `classifyChatRisk` (interino, a LED-35 substitui), consentimento vigente e orçamentos. O chat só segue com `body_data`, `coach_health` e `coach_chat` na versão publicada (`…-2026-10-15b`). `coach_health` e `coach_chat` exigem dois checkboxes (RGPD art. 49(1)(a)). Um grant de versão antiga devolve `reconsent_required` e não chama o modelo. O texto de uma mensagem `red_flag` não é gravado.

Limites: 20 mensagens por usuário por dia UTC, 50 pedidos OpenRouter por dia para a app, 3 tool calls e 800 tokens de saída. Timeouts: 20 s até ao primeiro token e 60 s no total.

A tool `get_history` é só leitura e usa o usuário da sessão. `propose_plan_change` está desligada até existir `evaluateSafety` (LED-35); nada é gravado nem aplicado.

## Retenção e cron

Mensagens e `ai_generation_logs` saem aos 90 dias. O Coolify corre `node scripts/purge-coach-messages.mjs`, que faz `POST /api/cron/purge-coach-messages` com `Authorization: Bearer` e `CRON_SECRET` (comparação por `timingSafeEqual`). Não há cron no `vercel.json`.

## Jobs longos

Geração de plano e ajuste semanal passam por `CoachJobQueue`. O Trigger.dev não está instalado; `createUnconfiguredCoachJobs()` devolve `{ status: "not_configured" }`.
