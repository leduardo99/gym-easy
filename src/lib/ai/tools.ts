import type { ProposalStore } from "./proposals";
import { historyToolInputSchema, planChangeInputSchema } from "./schemas";

export type HistorySession = {
  date: string;
  sets: { weight_kg: number | null; reps: number | null; rpe: number | null }[];
};

export type HistoryReader = (
  userId: string,
  exerciseId: string,
  days: number,
  now: Date,
) => Promise<HistorySession[] | { error: "unknown_exercise" }>;

export async function executeGetHistory(
  input: unknown,
  deps: { userId: string; read: HistoryReader; now: Date },
): Promise<{ sessions: HistorySession[] }> {
  const parsed = historyToolInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("invalid tool input");
  }
  const history = await deps.read(
    deps.userId,
    parsed.data.exercise_id,
    parsed.data.days,
    deps.now,
  );
  if ("error" in history) {
    throw new Error("invalid tool input");
  }
  return { sessions: history.slice(0, 20) };
}

export type ProposalResult =
  | {
      status: "proposed";
      applied: false;
      requiresConfirmation: true;
      proposal_id: string;
      summary: string;
    }
  | {
      status: "blocked";
      applied: false;
      requiresConfirmation: false;
      reason: "red_flag_cooldown";
    };

export async function executeProposePlanChange(
  input: unknown,
  deps: {
    userId: string;
    planChangesAllowed: boolean;
    proposals: ProposalStore;
  },
): Promise<ProposalResult> {
  const parsed = planChangeInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("invalid tool input");
  }
  if (!deps.planChangesAllowed) {
    return {
      status: "blocked",
      applied: false,
      requiresConfirmation: false,
      reason: "red_flag_cooldown",
    };
  }
  const saved = await deps.proposals.add(deps.userId, parsed.data);
  return {
    status: "proposed",
    applied: false,
    requiresConfirmation: true,
    proposal_id: saved.id,
    summary: parsed.data.rationale,
  };
}
