import { desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { bodyMeasurements } from "@/db/schema";
import { createDrizzleRateLimiter } from "@/features/auth/drizzle-rate-limiter";
import {
  createConsentRepository,
  isCurrentConsent,
} from "@/features/consent/repository";
import type { ConsentPurpose } from "@/db/domain";
import { createTrainingRepository } from "@/features/training/repository";
import { getServerEnv } from "@/lib/env";

import { UNAVAILABLE_RESPONSE } from "./copy";
import type { CoachProfileSource, ConsentFreshness } from "./context";
import {
  classifyProviderFailure,
  linkAbortSignals,
  runModelFallback,
} from "./fallback";
import { readExerciseHistory } from "./history";
import { hashUserId, toAiLogRecord, writeAiLog } from "./log";
import {
  createDrizzleRedFlagLockStore,
  insertAiGenerationLog,
  insertCoachMessage,
  userMessageToStore,
} from "./messages";
import { sanitizeCoachOutput, FILTERED_OUTPUT } from "./output";
import { COACH_PROMPT_VERSION, renderCoachPrompt } from "./prompts";
import { createGymOpenRouter, openRouterChatModel } from "./provider";
import type { AiLogRecord, CoachContext } from "./schemas";
import { beginCoachStream, createCoachTools } from "./sdk-chat";
import type { ProposalResult } from "./tools";
import { assessCoachTurn, type CoachTurnInput, type TurnResult } from "./turn";

const SSE_HEADERS = {
  "content-type": "text/event-stream; charset=utf-8",
  "cache-control": "no-cache, no-transform",
  "x-accel-buffering": "no",
};

export function encodeSse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

const EMPTY_PROFILE: CoachProfileSource = {
  birthYear: null,
  sex: null,
  heightCm: null,
  goal: null,
  level: null,
  daysPerWeek: null,
  sessionMinutes: null,
  trainingPlace: null,
};

function usedData(context: CoachContext): string[] {
  return Object.entries(context)
    .filter(([, value]) => value !== null)
    .map(([key]) => key);
}

async function persistQuietly(work: () => Promise<void>): Promise<void> {
  try {
    await work();
  } catch (error) {
    const name = error instanceof Error ? error.name : "Error";
    console.info(
      JSON.stringify({
        event: "ai_request",
        outcome: "internal",
        error_name: name,
      }),
    );
  }
}

function record(input: {
  userId: string;
  requestId: string;
  startedAt: number;
  model: string | null;
  policy: AiLogRecord["policy"];
  outcome: AiLogRecord["outcome"];
  tokensIn?: number | null;
  tokensOut?: number | null;
}): AiLogRecord {
  const log = toAiLogRecord({
    request_id: input.requestId,
    user_id_hash: hashUserId(input.userId),
    model: input.model,
    policy: input.policy,
    latency_ms: Math.max(0, Date.now() - input.startedAt),
    tokens_in: input.tokensIn ?? null,
    tokens_out: input.tokensOut ?? null,
    outcome: input.outcome,
  });
  writeAiLog(log);
  return log;
}

function consentFreshness(
  event:
    | {
        purpose: ConsentPurpose;
        action: "granted" | "revoked";
        version: string;
        textSha256: string;
      }
    | undefined,
): ConsentFreshness {
  if (!event || event.action !== "granted") return "missing";
  return isCurrentConsent(event) ? "current" : "stale";
}

export async function createCoachHttpResponse(input: {
  userId: string;
  body: unknown;
  now: Date;
  signal?: AbortSignal;
}): Promise<Response> {
  const db = getDb();
  const env = getServerEnv();
  const startedAt = input.now.getTime();
  const requestId = crypto.randomUUID();
  const consentEvents = await createConsentRepository(db).listConsents(
    input.userId,
  );
  const latestConsent = (purpose: ConsentPurpose) =>
    consentEvents.find((event) => event.purpose === purpose);
  const [profileRow, weightRows] = await Promise.all([
    createTrainingRepository(db).getProfile(input.userId),
    db
      .select({ weightKg: bodyMeasurements.weightKg })
      .from(bodyMeasurements)
      .where(eq(bodyMeasurements.userId, input.userId))
      .orderBy(desc(bodyMeasurements.recordedOn))
      .limit(1),
  ]);

  const profile: CoachProfileSource = profileRow
    ? {
        birthYear: profileRow.birthYear,
        sex: profileRow.sex,
        heightCm: profileRow.heightCm,
        goal: profileRow.goal,
        level: profileRow.level,
        daysPerWeek: profileRow.daysPerWeek,
        sessionMinutes: profileRow.sessionMinutes,
        trainingPlace: profileRow.trainingPlace,
      }
    : EMPTY_PROFILE;
  const weightRaw = weightRows[0]?.weightKg;
  const weightKg = weightRaw === undefined ? null : Number(weightRaw);

  const turnInput: CoachTurnInput = {
    userId: input.userId,
    message: input.body,
    now: input.now,
    consents: {
      bodyData: consentFreshness(latestConsent("body_data")),
      coachHealth: consentFreshness(latestConsent("coach_health")),
      coachChat: consentFreshness(latestConsent("coach_chat")),
    },
    profile,
    weightKg: weightKg !== null && Number.isFinite(weightKg) ? weightKg : null,
    limiter: createDrizzleRateLimiter(db),
    locks: createDrizzleRedFlagLockStore(db),
    models: env.COACH_MODELS,
    callModel: async () => {
      throw new Error("unused");
    },
    log: () => undefined,
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    requestId,
  };

  const assessed = await assessCoachTurn(turnInput);
  if (assessed.action === "respond") {
    const log = record({
      userId: input.userId,
      requestId,
      startedAt,
      model: null,
      policy: null,
      outcome: assessed.result.outcome,
    });
    await persistQuietly(async () => {
      await insertAiGenerationLog(db, log);
      const message =
        typeof input.body === "object" &&
        input.body !== null &&
        "message" in input.body &&
        typeof input.body.message === "string"
          ? input.body.message
          : null;
      const storedUser = message
        ? userMessageToStore(assessed.result.risk, message)
        : null;
      const blocked =
        assessed.result.status === "validation_rejected" ||
        assessed.result.status === "consent_missing" ||
        assessed.result.status === "reconsent_required";
      if (!blocked && assessed.result.risk !== "red_flag" && storedUser) {
        await insertCoachMessage(db, {
          userId: input.userId,
          role: "user",
          content: storedUser,
          risk: assessed.result.risk,
          model: null,
          dataPolicy: null,
          promptVersion: null,
        });
      }
      if (!blocked) {
        await insertCoachMessage(db, {
          userId: input.userId,
          role: "assistant",
          content: assessed.result.text,
          risk: assessed.result.risk,
          model: null,
          dataPolicy: null,
          promptVersion: COACH_PROMPT_VERSION,
        });
      }
    });
    if (assessed.result.httpStatus !== 200) {
      const headers = new Headers();
      if (assessed.result.retryAfterSeconds > 0) {
        headers.set("retry-after", String(assessed.result.retryAfterSeconds));
      }
      return Response.json(
        { error: assessed.result.text, code: assessed.result.status },
        { status: assessed.result.httpStatus, headers },
      );
    }
    const events = [
      encodeSse("safety", {
        risk: assessed.result.risk,
        notice: assessed.result.text,
      }),
      encodeSse("delta", { text: assessed.result.text }),
      encodeSse("done", {
        message_id: requestId,
        model: null,
        policy: null,
        used_data: [],
      }),
    ];
    return new Response(events.join(""), { status: 200, headers: SSE_HEADERS });
  }

  if (!env.OPENROUTER_API_KEY || env.COACH_MODELS.length === 0) {
    const log = record({
      userId: input.userId,
      requestId,
      startedAt,
      model: null,
      policy: null,
      outcome: "internal",
    });
    await persistQuietly(() => insertAiGenerationLog(db, log));
    return new Response(
      [
        encodeSse("error", { code: "unavailable" }),
        encodeSse("delta", { text: UNAVAILABLE_RESPONSE }),
        encodeSse("done", {
          message_id: requestId,
          model: null,
          policy: null,
          used_data: usedData(assessed.context),
        }),
      ].join(""),
      { status: 200, headers: SSE_HEADERS },
    );
  }

  const provider = createGymOpenRouter(env.OPENROUTER_API_KEY);
  const rendered = renderCoachPrompt({
    context: assessed.context,
    message: assessed.message,
    caution: assessed.caution,
    planChangesAllowed: assessed.planChangesAllowed,
  });
  const tools = createCoachTools({
    userId: input.userId,
    now: input.now,
    readHistory: (userId, exerciseId, days, now) =>
      readExerciseHistory(db, userId, exerciseId, days, now),
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(encodeSse(event, data)));
      };
      let tokensIn: number | null = null;
      let tokensOut: number | null = null;
      const generated = await runModelFallback({
        models: env.COACH_MODELS,
        sleep: turnInput.sleep,
        stopSignal: input.signal,
        call: async (attempt) => {
          const opened = await beginCoachStream({
            model: openRouterChatModel(provider, attempt.model, attempt.policy),
            system: rendered.system,
            prompt: rendered.prompt,
            signal: linkAbortSignals(attempt.signal, input.signal),
            tools,
          });
          attempt.markFirstToken();
          return opened;
        },
      });

      if (!generated.ok) {
        send("error", { code: generated.outcome });
        send("delta", { text: UNAVAILABLE_RESPONSE });
        send("done", {
          message_id: requestId,
          model: generated.attempts.at(-1)?.model ?? null,
          policy: generated.attempts.at(-1)?.policy ?? null,
          used_data: usedData(assessed.context),
        });
        const log = record({
          userId: input.userId,
          requestId,
          startedAt,
          model: generated.attempts.at(-1)?.model ?? null,
          policy: generated.attempts.at(-1)?.policy ?? null,
          outcome: generated.outcome,
        });
        await persistQuietly(() => insertAiGenerationLog(db, log));
        controller.close();
        return;
      }

      let pending = "";
      let visible = "";
      let stopped = false;
      let outcome: AiLogRecord["outcome"] = "ok";
      const emitText = (text: string) => {
        if (stopped || text.length === 0) return;
        const safe = sanitizeCoachOutput(text);
        if (safe.text === FILTERED_OUTPUT) {
          stopped = true;
          visible = FILTERED_OUTPUT;
          send("delta", { text: FILTERED_OUTPUT });
          return;
        }
        visible += safe.text;
        if (safe.text.length > 0) send("delta", { text: safe.text });
      };
      const take = (chunk: string, flush: boolean) => {
        pending += chunk;
        const pieces = pending.split(/(?<=[.!?\n])/);
        pending = flush ? "" : (pieces.pop() ?? "");
        for (const piece of flush ? [...pieces, pending] : pieces) {
          emitText(piece);
        }
        if (flush) pending = "";
      };
      const consume = (part: {
        type: string;
        text?: string;
        name?: string;
        proposal?: ProposalResult;
        tokensIn?: number | null;
        tokensOut?: number | null;
      }) => {
        if (part.type === "delta" && part.text !== undefined) {
          take(part.text, false);
        }
        if (part.type === "tool_status" && part.name !== undefined) {
          send("tool_status", { name: part.name });
        }
        if (part.type === "proposal" && part.proposal) {
          send("proposal", part.proposal);
        }
        if (part.type === "usage") {
          tokensIn = part.tokensIn ?? null;
          tokensOut = part.tokensOut ?? null;
        }
      };

      try {
        for (const part of generated.value.buffered) consume(part);
        while (!stopped) {
          const next = await generated.value.rest.next();
          if (next.done) break;
          const part = next.value;
          if (part.type === "error") throw part.error;
          if (part.type === "text-delta" && typeof part.delta === "string") {
            consume({ type: "delta", text: part.delta });
          } else if (
            part.type === "tool-call" &&
            typeof part.toolName === "string"
          ) {
            consume({ type: "tool_status", name: part.toolName });
          } else if (
            part.type === "tool-result" &&
            part.toolName === "propose_plan_change" &&
            part.output &&
            typeof part.output === "object"
          ) {
            consume({
              type: "proposal",
              proposal: part.output as ProposalResult,
            });
          } else if (
            part.type === "finish" &&
            part.totalUsage &&
            typeof part.totalUsage === "object"
          ) {
            const usage = part.totalUsage as {
              inputTokens?: number;
              outputTokens?: number;
            };
            consume({
              type: "usage",
              tokensIn: usage.inputTokens ?? null,
              tokensOut: usage.outputTokens ?? null,
            });
          }
        }
        if (!stopped) take("", true);
      } catch (error) {
        const failure = classifyProviderFailure(error);
        outcome =
          failure.kind === "timeout" ||
          failure.kind === "schema_invalid" ||
          failure.kind === "rate_limited"
            ? failure.kind
            : "provider_error";
        if (visible.length === 0) {
          send("error", { code: outcome });
          send("delta", { text: UNAVAILABLE_RESPONSE });
          visible = UNAVAILABLE_RESPONSE;
        }
      }

      const assistantId = await insertCoachMessage(db, {
        userId: input.userId,
        role: "assistant",
        content: visible || UNAVAILABLE_RESPONSE,
        risk: assessed.risk,
        model: generated.model,
        dataPolicy: generated.policy,
        promptVersion: COACH_PROMPT_VERSION,
      }).catch(() => null);
      await insertCoachMessage(db, {
        userId: input.userId,
        role: "user",
        content: assessed.message,
        risk: assessed.risk,
        model: null,
        dataPolicy: null,
        promptVersion: null,
      }).catch(() => null);

      send("done", {
        message_id: assistantId ?? requestId,
        model: generated.model,
        policy: generated.policy,
        used_data: usedData(assessed.context),
      });
      const log = record({
        userId: input.userId,
        requestId,
        startedAt,
        model: generated.model,
        policy: generated.policy,
        outcome,
        tokensIn,
        tokensOut,
      });
      await persistQuietly(() => insertAiGenerationLog(db, log));
      controller.close();
    },
  });

  return new Response(stream, { status: 200, headers: SSE_HEADERS });
}

export type { TurnResult };
