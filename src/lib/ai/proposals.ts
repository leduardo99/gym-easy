import { eq } from "drizzle-orm";

import type { DbClient } from "@/db";
import { planChangeProposals } from "@/db/schema";

import type { PlanChangeInput } from "./schemas";

export type StoredProposal = {
  id: string;
  userId: string;
  status: "proposed";
  input: PlanChangeInput;
};

export interface ProposalStore {
  add(userId: string, input: PlanChangeInput): Promise<{ id: string }>;
}

export function createMemoryProposalStore(): ProposalStore & {
  proposals: StoredProposal[];
} {
  const proposals: StoredProposal[] = [];
  return {
    proposals,
    async add(userId, input) {
      const id = `proposal-${proposals.length + 1}`;
      proposals.push({ id, userId, status: "proposed", input });
      return { id };
    },
  };
}

/** Remove todas as propostas do coach do utilizador (payload pode refletir PAR-Q+ / lesões). */
export async function deleteCoachProposals(
  tx: DbClient,
  userId: string,
): Promise<number> {
  const rows = await tx
    .delete(planChangeProposals)
    .where(eq(planChangeProposals.userId, userId))
    .returning({ id: planChangeProposals.id });
  return rows.length;
}
