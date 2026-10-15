// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirect } = vi.hoisted(() => {
  const redirect = vi.fn((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  });
  return { redirect };
});

vi.mock("next/navigation", () => ({
  redirect,
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => {
    const store = new Headers();
    store.set("origin", "http://localhost:3000");
    store.set("host", "localhost:3000");
    return store;
  }),
}));

vi.mock("@/features/auth/lookup-session", () => ({
  lookupSession: vi.fn(async () => ({
    status: "ok",
    user: {
      id: "user-1",
      name: "Ana",
      email: "a@example.com",
      emailVerifiedAt: new Date(),
      onboardingCompletedAt: null,
    },
  })),
}));

const txMarker = { kind: "tx" };
const transaction = vi.fn(
  async (work: (tx: typeof txMarker) => Promise<void>) => {
    await work(txMarker);
  },
);

vi.mock("@/db", () => ({
  getDb: () => ({ transaction }),
}));

const saveProfile = vi.fn();
const markOnboardingComplete = vi.fn();

vi.mock("./repository", () => ({
  createTrainingRepository: vi.fn((db: unknown) => {
    expect(db).toBe(txMarker);
    return { saveProfile };
  }),
}));

vi.mock("@/features/auth/drizzle-user-store", () => ({
  createDrizzleUserStore: vi.fn((db: unknown) => {
    expect(db).toBe(txMarker);
    return { markOnboardingComplete };
  }),
}));

import { resetServerEnvCache } from "@/lib/env";

import { saveOnboardingProfileAction } from "./actions";

describe("saveOnboardingProfileAction", () => {
  beforeEach(() => {
    redirect.mockClear();
    transaction.mockClear();
    saveProfile.mockReset();
    markOnboardingComplete.mockReset();
    saveProfile.mockResolvedValue({ ok: true, value: { birthYear: 1990 } });
    markOnboardingComplete.mockResolvedValue(undefined);
    resetServerEnvCache();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/gym");
    vi.stubEnv(
      "CONFIRM_EMAIL_SECRET",
      "confirm-email-secret-for-unit-tests-00",
    );
    vi.stubEnv("CONSENT_PSEUDONYM_KEY", "consent-pseudonym-test-key-32b!!");
    delete process.env.APP_URL;
    resetServerEnvCache();
  });

  it("grava o ano e conclui o onboarding na mesma transação", async () => {
    const formData = new FormData();
    formData.set("birthYear", "1990");

    await expect(saveOnboardingProfileAction(formData)).rejects.toMatchObject({
      message: "NEXT_REDIRECT",
      url: "/inicio",
    });

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(saveProfile).toHaveBeenCalledWith("user-1", { birthYear: 1990 });
    expect(markOnboardingComplete).toHaveBeenCalledTimes(1);
    expect(markOnboardingComplete.mock.calls[0]?.[0]).toBe("user-1");
  });

  it("não conclui o onboarding se o perfil não for gravado", async () => {
    saveProfile.mockResolvedValue({ ok: false, error: "invalid", message: "" });
    const formData = new FormData();
    formData.set("birthYear", "1990");

    await expect(saveOnboardingProfileAction(formData)).rejects.toMatchObject({
      message: "NEXT_REDIRECT",
      url: "/onboarding?erro=perfil",
    });

    expect(markOnboardingComplete).not.toHaveBeenCalled();
  });
});
