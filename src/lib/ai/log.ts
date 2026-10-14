import { sha256 } from "@/features/auth/tokens";

import { aiLogRecordSchema, type AiLogRecord } from "./schemas";

export function hashUserId(userId: string): string {
  return sha256(userId);
}

/** Só os campos permitidos. Conteúdo, prompt e dados de saúde não passam. */
export function toAiLogRecord(input: AiLogRecord): AiLogRecord {
  return aiLogRecordSchema.parse({
    request_id: input.request_id,
    user_id_hash: input.user_id_hash,
    model: input.model,
    policy: input.policy,
    latency_ms: input.latency_ms,
    tokens_in: input.tokens_in,
    tokens_out: input.tokens_out,
    outcome: input.outcome,
  });
}

export function writeAiLog(record: AiLogRecord): void {
  const safe = toAiLogRecord(record);
  console.info(JSON.stringify({ event: "ai_request", ...safe }));
}
