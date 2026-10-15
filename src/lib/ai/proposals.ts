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
