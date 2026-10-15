import { describe, expect, it } from "vitest";

import { fallbackAttemptsToLogRecords } from "./attempt-logs";

describe("fallback attempt logs", () => {
  it("records every attempted model, not only the last failure", () => {
    const records = fallbackAttemptsToLogRecords({
      requestId: "req-1",
      userId: "user-1",
      attempts: [
        {
          model: "alpha/example:free",
          zdr: true,
          dataPolicy: "zdr",
          outcome: "provider_policy_unavailable",
          attempt: 0,
        },
        {
          model: "beta/example:free",
          zdr: true,
          dataPolicy: "zdr",
          outcome: "provider_error",
          attempt: 0,
        },
      ],
      finalOutcome: "coach_unavailable",
      latencyMs: 12,
    });

    expect(records).toHaveLength(3);
    expect(records[0]).toMatchObject({
      request_id: "req-1#1",
      model: "alpha/example:free",
      outcome: "provider_policy_unavailable",
      served_with_zdr: true,
    });
    expect(records[1]).toMatchObject({
      request_id: "req-1#2",
      model: "beta/example:free",
      outcome: "provider_error",
    });
    expect(records[2]).toMatchObject({
      request_id: "req-1",
      outcome: "coach_unavailable",
      served_with_zdr: null,
    });
  });
});
