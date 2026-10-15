import type { AppDatabase } from "@/db";

import { hashUserId, toAiLogRecord, writeAiLog } from "./log";
import { insertAiGenerationLog } from "./messages";
import type { AiLogRecord, DataPolicy } from "./schemas";
import type { FallbackAttempt } from "./fallback";
import { attemptToLogOutcome } from "./fallback";

export function fallbackAttemptsToLogRecords(input: {
  requestId: string;
  userId: string;
  attempts: FallbackAttempt[];
  finalOutcome: AiLogRecord["outcome"];
  latencyMs: number;
  tokensIn?: number | null;
  tokensOut?: number | null;
  successPolicy?: DataPolicy | null;
  servedWithZdr?: boolean | null;
}): AiLogRecord[] {
  const userHash = hashUserId(input.userId);
  const attemptRows = input.attempts.map((attempt, index) => ({
    request_id: `${input.requestId}#${index + 1}`,
    user_id_hash: userHash,
    model: attempt.model,
    policy: attempt.dataPolicy,
    latency_ms: 0,
    tokens_in: null,
    tokens_out: null,
    outcome: attemptToLogOutcome(attempt.outcome),
    served_with_zdr: attempt.zdr,
  }));
  if (input.finalOutcome === "ok") {
    return [
      ...attemptRows,
      {
        request_id: input.requestId,
        user_id_hash: userHash,
        model: input.attempts.at(-1)?.model ?? null,
        policy: input.successPolicy ?? null,
        latency_ms: input.latencyMs,
        tokens_in: input.tokensIn ?? null,
        tokens_out: input.tokensOut ?? null,
        outcome: "ok",
        served_with_zdr: input.servedWithZdr ?? null,
      },
    ];
  }
  return [
    ...attemptRows,
    {
      request_id: input.requestId,
      user_id_hash: userHash,
      model: input.attempts.at(-1)?.model ?? null,
      policy: input.attempts.at(-1)?.dataPolicy ?? null,
      latency_ms: input.latencyMs,
      tokens_in: null,
      tokens_out: null,
      outcome: input.finalOutcome,
      served_with_zdr: null,
    },
  ];
}

export async function persistFallbackLogs(
  db: AppDatabase,
  records: AiLogRecord[],
): Promise<void> {
  for (const record of records) {
    const safe = toAiLogRecord(record);
    writeAiLog(safe);
    await insertAiGenerationLog(db, safe);
  }
}
