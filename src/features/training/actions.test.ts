// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

const db = { transaction };

vi.mock("@/db", () => ({
  getDb: () => db,
}));

const saveProfile = vi.fn();
const markOnboardingComplete = vi.fn();

vi.mock("./repository", () => ({
  createTrainingRepository: vi.fn(() => ({ saveProfile })),
}));

vi.mock("@/features/auth/drizzle-user-store", () => ({
  createDrizzleUserStore: vi.fn(() => ({ markOnboardingComplete })),
}));

import { resetServerEnvCache } from "@/lib/env";

import { saveOnboardingProfileAction, saveProfileAction } from "./actions";

function envSetup() {
  resetServerEnvCache();
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/gym");
  vi.stubEnv("CONFIRM_EMAIL_SECRET", "confirm-email-secret-for-unit-tests-00");
  vi.stubEnv("CONSENT_PSEUDONYM_KEY", "consent-pseudonym-test-key-32b!!");
  delete process.env.APP_URL;
  resetServerEnvCache();
}

describe("saveOnboardingProfileAction", () => {
  beforeEach(() => {
    redirect.mockClear();
    transaction.mockClear();
    saveProfile.mockReset();
    markOnboardingComplete.mockReset();
    saveProfile.mockResolvedValue({ ok: true, value: { birthYear: 1990 } });
    markOnboardingComplete.mockResolvedValue(undefined);
    envSetup();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-14T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
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
  });

  it("não grava nem conclui com ano vazio", async () => {
    const formData = new FormData();

    await expect(saveOnboardingProfileAction(formData)).rejects.toMatchObject({
      message: "NEXT_REDIRECT",
      url: "/onboarding?erro=nascimento",
    });

    expect(transaction).not.toHaveBeenCalled();
    expect(saveProfile).not.toHaveBeenCalled();
    expect(markOnboardingComplete).not.toHaveBeenCalled();
  });

  it("rejeita menor de 16 anos", async () => {
    const formData = new FormData();
    formData.set("birthYear", "2010");

    await expect(saveOnboardingProfileAction(formData)).rejects.toMatchObject({
      message: "NEXT_REDIRECT",
      url: "/onboarding?erro=nascimento",
    });

    expect(saveProfile).not.toHaveBeenCalled();
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

describe("saveProfileAction", () => {
  beforeEach(() => {
    redirect.mockClear();
    transaction.mockClear();
    saveProfile.mockReset();
    saveProfile.mockResolvedValue({ ok: true, value: {} });
    envSetup();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-14T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejeita menor de 16 anos", async () => {
    const formData = new FormData();
    formData.set("birthYear", "2010");

    await expect(saveProfileAction(formData)).rejects.toMatchObject({
      message: "NEXT_REDIRECT",
      url: "/perfil?erro=nascimento",
    });

    expect(saveProfile).not.toHaveBeenCalled();
  });

  it("rejeita enum inválido", async () => {
    const formData = new FormData();
    formData.set("sex", "invalid");

    await expect(saveProfileAction(formData)).rejects.toMatchObject({
      message: "NEXT_REDIRECT",
      url: "/perfil?erro=perfil",
    });

    expect(saveProfile).not.toHaveBeenCalled();
  });

  it("ignora chaves extra no FormData e grava campos válidos", async () => {
    const formData = new FormData();
    formData.set("birthYear", "1992");
    formData.set("heightCm", "175");
    formData.set("userId", "22222222-2222-4222-8222-222222222222");

    await expect(saveProfileAction(formData)).rejects.toMatchObject({
      message: "NEXT_REDIRECT",
      url: "/perfil?guardado=1",
    });

    expect(saveProfile).toHaveBeenCalledWith("user-1", {
      birthYear: 1992,
      sex: null,
      heightCm: 175,
      goal: null,
      level: null,
      daysPerWeek: null,
      sessionMinutes: null,
      trainingPlace: null,
    });
  });
});
