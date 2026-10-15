import { describe, expect, it, vi } from "vitest";

import * as proposalsModule from "@/lib/ai/proposals";

import { deleteCoachHealthData } from "./revoke-consent";

describe("deleteCoachHealthData", () => {
  it("apaga propostas pendentes (contrato LED-31)", async () => {
    const deleteCoachProposals = vi
      .spyOn(proposalsModule, "deleteCoachProposals")
      .mockResolvedValue(2);
    const tx = {} as Parameters<typeof deleteCoachHealthData>[0];

    await expect(deleteCoachHealthData(tx, "user-1")).resolves.toBe(2);
    expect(deleteCoachProposals).toHaveBeenCalledWith(tx, "user-1");
  });
});
