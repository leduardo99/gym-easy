import { beforeEach, describe, expect, it, vi } from "vitest";

const execute = vi.fn();

vi.mock("next/server", () => ({
  connection: vi.fn(async () => undefined),
}));

vi.mock("@/db", () => ({
  getDb: vi.fn(() => ({
    execute,
  })),
}));

import { getDb } from "@/db";
import { GET } from "./route";

describe("GET /api/health", () => {
  beforeEach(() => {
    execute.mockReset();
    vi.mocked(getDb).mockImplementation(
      () =>
        ({
          execute,
        }) as unknown as ReturnType<typeof getDb>,
    );
  });

  it("returns ok after select 1 succeeds", async () => {
    execute.mockResolvedValue([]);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "ok",
      db: "ok",
    });
    const statement = execute.mock.calls[0]?.[0] as {
      queryChunks?: unknown[];
    };
    expect(JSON.stringify(statement.queryChunks)).toMatch(/select 1/i);
  });

  it("returns 503 without the database error when the query fails", async () => {
    execute.mockRejectedValue(
      new Error("password=super-secret connection to ep-neon failed"),
    );

    const response = await GET();
    const body: unknown = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({ status: "error", db: "unavailable" });
    expect(JSON.stringify(body)).not.toContain("super-secret");
    expect(JSON.stringify(body)).not.toContain("ep-neon");
  });

  it("returns 503 without the connection string when the client cannot be created", async () => {
    vi.mocked(getDb).mockImplementation(() => {
      throw new Error(
        "postgresql://user:super-secret@ep-neon.aws.neon.tech/db",
      );
    });

    const response = await GET();
    const body: unknown = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({ status: "error", db: "unavailable" });
    expect(JSON.stringify(body)).not.toContain("super-secret");
    expect(JSON.stringify(body)).not.toContain("neon.tech");
  });
});
