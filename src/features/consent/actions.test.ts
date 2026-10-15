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

vi.mock("@/db", () => ({
  getDb: () =>
    new Proxy(
      {},
      {
        get() {
          throw new Error("consent_log não devia ser lido");
        },
      },
    ),
}));

import { acceptReconsentAction } from "./actions";

describe("acceptReconsentAction", () => {
  beforeEach(() => {
    redirect.mockClear();
  });

  it("redireciona com erro=caixa sem transferAccepted no coach_chat", async () => {
    const formData = new FormData();
    formData.set("scope", "coach_chat");
    formData.set("next", "/perfil");
    formData.set("accepted", "sim");

    await expect(acceptReconsentAction(formData)).rejects.toMatchObject({
      message: "NEXT_REDIRECT",
      url: "/consentimento?scope=coach_chat&next=%2Fperfil&erro=caixa",
    });
    expect(redirect).toHaveBeenCalledWith(
      "/consentimento?scope=coach_chat&next=%2Fperfil&erro=caixa",
    );
  });
});
