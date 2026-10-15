import { generateText, Output, streamText, type LanguageModel } from "ai";
import type { z } from "zod";

import { CHAT_TOTAL_TIMEOUT_MS } from "./fallback";
import { MAX_COACH_OUTPUT_TOKENS } from "./sdk-chat";

/**
 * Saída estruturada no AI SDK 7: `generateText` / `streamText` com
 * `Output.object`. `generateObject` e `streamObject` não fazem parte desta versão.
 */
export async function generateStructured<T>(input: {
  model: LanguageModel;
  schema: z.ZodType<T>;
  prompt: string;
  system?: string;
  abortSignal?: AbortSignal;
}): Promise<T> {
  const result = await generateText({
    model: input.model,
    system: input.system,
    prompt: input.prompt,
    output: Output.object({ schema: input.schema }),
    maxOutputTokens: MAX_COACH_OUTPUT_TOKENS,
    maxRetries: 0,
    abortSignal: input.abortSignal,
    timeout: { totalMs: CHAT_TOTAL_TIMEOUT_MS },
  });
  const parsed = input.schema.safeParse(result.output);
  if (!parsed.success) {
    throw Object.assign(new Error("schema_invalid"), { name: "SchemaError" });
  }
  return parsed.data;
}

export function streamStructured<T>(input: {
  model: LanguageModel;
  schema: z.ZodType<T>;
  prompt: string;
  system?: string;
  abortSignal?: AbortSignal;
}) {
  return streamText({
    model: input.model,
    system: input.system,
    prompt: input.prompt,
    output: Output.object({ schema: input.schema }),
    maxOutputTokens: MAX_COACH_OUTPUT_TOKENS,
    maxRetries: 0,
    abortSignal: input.abortSignal,
    timeout: {
      firstChunkMs: 20_000,
      totalMs: CHAT_TOTAL_TIMEOUT_MS,
    },
  });
}
