import { isStepCount, streamText, tool, type LanguageModel } from "ai";

import { CHAT_TOTAL_TIMEOUT_MS, FIRST_TOKEN_TIMEOUT_MS } from "./fallback";
import { historyToolInputSchema } from "./schemas";
import {
  executeGetHistory,
  type HistoryReader,
  type ProposalResult,
} from "./tools";

/** Três chamadas de ferramenta por mensagem. A resposta final cabe no passo seguinte. */
export const MAX_COACH_TOOL_CALLS = 3;
export const MAX_COACH_OUTPUT_TOKENS = 800;

export type CoachStreamPart =
  | { type: "delta"; text: string }
  | { type: "tool_status"; name: string }
  | { type: "proposal"; proposal: ProposalResult }
  | {
      type: "usage";
      tokensIn: number | null;
      tokensOut: number | null;
    };

type StreamIterator = AsyncIterator<{ type: string } & Record<string, unknown>>;

/**
 * `propose_plan_change` fica de fora até existir `evaluateSafety` (LED-35).
 * Sem essa avaliação a proposta não é gravada.
 */
export function createCoachTools(deps: {
  userId: string;
  now: Date;
  readHistory: HistoryReader;
}) {
  let historyCalls = 0;
  return {
    get_history: tool({
      description:
        "Lê séries já registradas de um exercício do usuário. Somente leitura.",
      inputSchema: historyToolInputSchema,
      execute: async (input) => {
        historyCalls += 1;
        if (historyCalls > MAX_COACH_TOOL_CALLS) {
          throw new Error("invalid tool input");
        }
        return executeGetHistory(input, {
          userId: deps.userId,
          read: deps.readHistory,
          now: deps.now,
        });
      },
    }),
  };
}

function partToEvents(
  part: { type: string } & Record<string, unknown>,
): CoachStreamPart[] {
  if (part.type === "text-delta" && typeof part.delta === "string") {
    return [{ type: "delta", text: part.delta }];
  }
  if (part.type === "tool-call" && typeof part.toolName === "string") {
    return [{ type: "tool_status", name: part.toolName }];
  }
  if (
    part.type === "tool-result" &&
    part.toolName === "propose_plan_change" &&
    part.output &&
    typeof part.output === "object"
  ) {
    return [
      {
        type: "proposal",
        proposal: part.output as ProposalResult,
      },
    ];
  }
  if (
    part.type === "finish" &&
    part.totalUsage &&
    typeof part.totalUsage === "object"
  ) {
    const usage = part.totalUsage as {
      inputTokens?: number;
      outputTokens?: number;
    };
    return [
      {
        type: "usage",
        tokensIn: usage.inputTokens ?? null,
        tokensOut: usage.outputTokens ?? null,
      },
    ];
  }
  return [];
}

export type OpenCoachStream = {
  buffered: CoachStreamPart[];
  rest: StreamIterator;
};

export async function beginCoachStream(input: {
  model: LanguageModel;
  system: string;
  prompt: string;
  signal: AbortSignal;
  tools: ReturnType<typeof createCoachTools>;
}): Promise<OpenCoachStream> {
  const result = streamText({
    model: input.model,
    system: input.system,
    prompt: input.prompt,
    tools: input.tools,
    maxOutputTokens: MAX_COACH_OUTPUT_TOKENS,
    stopWhen: [
      ({ steps }) => {
        const calls = steps.reduce(
          (total, step) => total + step.toolCalls.length,
          0,
        );
        const last = steps.at(-1);
        return (
          calls >= MAX_COACH_TOOL_CALLS && (last?.toolCalls.length ?? 0) === 0
        );
      },
      isStepCount(MAX_COACH_TOOL_CALLS + 1),
    ],
    maxRetries: 0,
    abortSignal: input.signal,
    timeout: {
      firstChunkMs: FIRST_TOKEN_TIMEOUT_MS,
      totalMs: CHAT_TOTAL_TIMEOUT_MS,
    },
  });
  const iterator = result.fullStream[Symbol.asyncIterator]() as StreamIterator;
  const buffered: CoachStreamPart[] = [];

  while (buffered.length === 0) {
    const next = await iterator.next();
    if (next.done) throw new Error("empty coach stream");
    if (next.value.type === "error") throw next.value.error;
    if (next.value.type === "abort") {
      throw Object.assign(new Error("timeout"), { name: "TimeoutError" });
    }
    buffered.push(...partToEvents(next.value));
  }

  return { buffered, rest: iterator };
}
