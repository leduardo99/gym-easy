import type { RateLimiter } from "@/features/auth/rate-limit";

import { classifyChatRisk, type ChatRisk } from "./classify-chat-risk";
import {
  CONSENT_RESPONSE,
  INJECTION_RESPONSE,
  PROFILE_RESPONSE,
  RATE_LIMIT_RESPONSE,
  RED_FLAG_RESPONSE,
  SELF_HARM_RESPONSE,
  UNAVAILABLE_RESPONSE,
  UNDER_AGE_RESPONSE,
  isPromptInjection,
} from "./copy";
import {
  buildCoachContext,
  type CoachConsents,
  type CoachProfileSource,
} from "./context";
import { isCooldownActive, type RedFlagLockStore } from "./cooldown";
import { runModelFallback, type ModelAttempt } from "./fallback";
import { hashUserId, toAiLogRecord } from "./log";
import { sanitizeCoachOutput } from "./output";
import type {
  AiLogRecord,
  AiOutcome,
  CoachContext,
  DataPolicy,
} from "./schemas";
import { coachChatInputSchema } from "./schemas";
import { consumeDailyBudget } from "./rate-limit";

export type CoachModelRequest = ModelAttempt & {
  planChangesAllowed: boolean;
  caution: boolean;
  context: CoachContext;
  message: string;
};

export type TurnStatus =
  | "ok"
  | "safety_block"
  | "rate_limited"
  | "validation_rejected"
  | "consent_missing"
  | "unavailable"
  | "profile_incomplete";

export type TurnResult = {
  status: TurnStatus;
  httpStatus: number;
  text: string;
  modelCalls: number;
  policy: DataPolicy | null;
  model: string | null;
  risk: ChatRisk | null;
  retryAfterSeconds: number;
  log: AiLogRecord;
};

export type CoachTurnInput = {
  userId: string;
  message: unknown;
  now: Date;
  consents: CoachConsents;
  profile: CoachProfileSource;
  weightKg: number | null;
  limiter: RateLimiter;
  locks: RedFlagLockStore;
  models: string[];
  callModel: (request: CoachModelRequest) => Promise<{ text: string }>;
  log: (record: AiLogRecord) => void;
  sleep: (ms: number) => Promise<void>;
  requestId?: string;
};

type Responding = {
  action: "respond";
  result: Omit<TurnResult, "log"> & { outcome: AiOutcome };
};

type Generating = {
  action: "generate";
  message: string;
  context: CoachContext;
  caution: boolean;
  planChangesAllowed: boolean;
  risk: ChatRisk;
  requestId: string;
  startedAt: number;
};

function requestIdOf(input: CoachTurnInput): string {
  return input.requestId ?? crypto.randomUUID();
}

function shell(
  status: TurnStatus,
  httpStatus: number,
  text: string,
  outcome: AiOutcome,
  extra?: Partial<Omit<TurnResult, "log">>,
): Responding {
  return {
    action: "respond",
    result: {
      status,
      httpStatus,
      text,
      modelCalls: 0,
      policy: null,
      model: null,
      risk: extra?.risk ?? null,
      retryAfterSeconds: extra?.retryAfterSeconds ?? 0,
      outcome,
    },
  };
}

export async function assessCoachTurn(
  input: CoachTurnInput,
): Promise<Responding | Generating> {
  const parsed = coachChatInputSchema.safeParse(
    typeof input.message === "string"
      ? { message: input.message }
      : input.message,
  );
  if (!parsed.success) {
    return shell(
      "validation_rejected",
      400,
      "Mensagem inválida.",
      "validation_rejected",
    );
  }

  const message = parsed.data.message;
  const risk = classifyChatRisk(message, "pt");
  if (risk.risk === "red_flag") {
    await input.locks.start(input.userId, input.now);
    const text = risk.matched.includes("self_harm")
      ? SELF_HARM_RESPONSE
      : RED_FLAG_RESPONSE;
    return shell("safety_block", 200, text, "safety_block", {
      risk: "red_flag",
    });
  }

  if (!input.consents.bodyData || !input.consents.coachHealth) {
    return shell(
      "consent_missing",
      403,
      CONSENT_RESPONSE,
      "validation_rejected",
    );
  }

  if (isPromptInjection(message)) {
    return shell("safety_block", 200, INJECTION_RESPONSE, "safety_block", {
      risk: risk.risk,
    });
  }

  const budget = await consumeDailyBudget(
    input.limiter,
    "chat",
    input.userId,
    input.now,
  );
  if (!budget.allowed) {
    return shell("rate_limited", 429, RATE_LIMIT_RESPONSE, "rate_limited", {
      risk: risk.risk,
      retryAfterSeconds: budget.retryAfterSeconds,
    });
  }

  const context = buildCoachContext({
    profile: input.profile,
    weightKg: input.weightKg,
    consents: input.consents,
    now: input.now,
  });
  if (!context.ok) {
    if (context.reason === "under_age") {
      return shell("safety_block", 200, UNDER_AGE_RESPONSE, "safety_block", {
        risk: risk.risk,
      });
    }
    return shell(
      "profile_incomplete",
      400,
      PROFILE_RESPONSE,
      "validation_rejected",
      { risk: risk.risk },
    );
  }

  const lock = await input.locks.get(input.userId);
  return {
    action: "generate",
    message,
    context: context.context,
    caution: risk.risk === "caution",
    planChangesAllowed: !isCooldownActive(lock, input.now),
    risk: risk.risk,
    requestId: requestIdOf(input),
    startedAt: input.now.getTime(),
  };
}

function finish(
  input: CoachTurnInput,
  fields: {
    requestId: string;
    startedAt: number;
    status: TurnStatus;
    httpStatus: number;
    text: string;
    outcome: AiOutcome;
    model: string | null;
    policy: DataPolicy | null;
    risk: ChatRisk | null;
    retryAfterSeconds?: number;
    modelCalls: number;
  },
): TurnResult {
  const log = toAiLogRecord({
    request_id: fields.requestId,
    user_id_hash: hashUserId(input.userId),
    model: fields.model,
    policy: fields.policy,
    latency_ms: Math.max(0, Date.now() - fields.startedAt),
    tokens_in: null,
    tokens_out: null,
    outcome: fields.outcome,
  });
  input.log(log);
  return {
    status: fields.status,
    httpStatus: fields.httpStatus,
    text: fields.text,
    modelCalls: fields.modelCalls,
    policy: fields.policy,
    model: fields.model,
    risk: fields.risk,
    retryAfterSeconds: fields.retryAfterSeconds ?? 0,
    log,
  };
}

export async function handleCoachTurn(
  input: CoachTurnInput,
): Promise<TurnResult> {
  const startedAt = input.now.getTime();
  const requestId = requestIdOf(input);
  const assessed = await assessCoachTurn({ ...input, requestId });
  if (assessed.action === "respond") {
    return finish(input, {
      requestId,
      startedAt,
      status: assessed.result.status,
      httpStatus: assessed.result.httpStatus,
      text: assessed.result.text,
      outcome: assessed.result.outcome,
      model: null,
      policy: null,
      risk: assessed.result.risk,
      retryAfterSeconds: assessed.result.retryAfterSeconds,
      modelCalls: 0,
    });
  }

  const generated = await runModelFallback({
    models: input.models,
    sleep: input.sleep,
    call: (attempt) =>
      input.callModel({
        ...attempt,
        planChangesAllowed: assessed.planChangesAllowed,
        caution: assessed.caution,
        context: assessed.context,
        message: assessed.message,
      }),
  });

  if (!generated.ok) {
    return finish(input, {
      requestId,
      startedAt,
      status: "unavailable",
      httpStatus: 200,
      text: UNAVAILABLE_RESPONSE,
      outcome: generated.outcome,
      model: generated.attempts.at(-1)?.model ?? null,
      policy: generated.attempts.at(-1)?.policy ?? null,
      risk: assessed.risk,
      modelCalls: generated.attempts.length,
    });
  }

  const safe = sanitizeCoachOutput(generated.value.text);
  return finish(input, {
    requestId,
    startedAt,
    status: "ok",
    httpStatus: 200,
    text: safe.text,
    outcome: "ok",
    model: generated.model,
    policy: generated.policy,
    risk: assessed.risk,
    modelCalls: generated.attempts.length,
  });
}
