import { beforeEach, describe, expect, it, vi } from "vitest";

const runScheduledMaintenance = vi.hoisted(() => vi.fn());
const getServerEnv = vi.hoisted(() => vi.fn());
const getDb = vi.hoisted(() => vi.fn(() => ({ db: true })));

vi.mock("next/server", () => ({
  connection: vi.fn(async () => undefined),
}));

vi.mock("@/lib/env", () => ({
  getServerEnv,
}));

vi.mock("@/db", () => ({
  getDb,
}));

vi.mock("@/features/auth/scheduled-maintenance", () => ({
  runScheduledMaintenance,
}));

import { GET, POST } from "./route";

const secret = "cron-secret-value";

describe("cron route", () => {
  beforeEach(() => {
    runScheduledMaintenance.mockReset();
    runScheduledMaintenance.mockResolvedValue(undefined);
    getServerEnv.mockReset();
    getDb.mockClear();
  });

  it("hides the route when the secret is unset", async () => {
    getServerEnv.mockReturnValue({ CRON_SECRET: null });

    const response = await POST(
      new Request("http://gym.example/api/cron", { method: "POST" }),
    );

    expect(response.status).toBe(404);
    expect(runScheduledMaintenance).not.toHaveBeenCalled();
  });

  it("rejects a missing or wrong bearer token", async () => {
    getServerEnv.mockReturnValue({ CRON_SECRET: secret });

    const missing = await GET(new Request("http://gym.example/api/cron"));
    const wrong = await POST(
      new Request("http://gym.example/api/cron", {
        method: "POST",
        headers: { authorization: "Bearer other-secret-value" },
      }),
    );

    expect(missing.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(runScheduledMaintenance).not.toHaveBeenCalled();
  });

  it("runs maintenance for a matching bearer token and can be retried", async () => {
    getServerEnv.mockReturnValue({ CRON_SECRET: secret });
    runScheduledMaintenance.mockRejectedValueOnce(new Error("db down"));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    const failed = await POST(
      new Request("http://gym.example/api/cron", {
        method: "POST",
        headers: { authorization: `Bearer ${secret}` },
      }),
    );
    expect(failed.status).toBe(503);
    expect(error.mock.calls.flat().join(" ")).not.toContain(secret);

    const ok = await POST(
      new Request("http://gym.example/api/cron", {
        method: "POST",
        headers: { authorization: `Bearer ${secret}` },
      }),
    );

    expect(ok.status).toBe(200);
    await expect(ok.json()).resolves.toEqual({ ok: true });
    expect(runScheduledMaintenance).toHaveBeenCalledTimes(2);
    error.mockRestore();
  });
});
