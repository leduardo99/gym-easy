import { describe, expect, it } from "vitest";

import {
  isAllowedNext,
  loginRedirectPath,
  postAuthDestination,
} from "./destination";

describe("postAuthDestination", () => {
  it("sends an unfinished account to onboarding", () => {
    expect(
      postAuthDestination({ onboardingCompletedAt: null }, "/inicio"),
    ).toBe("/onboarding");
  });

  it("honors an internal next path after onboarding", () => {
    expect(
      postAuthDestination(
        { onboardingCompletedAt: new Date() },
        "/treinos?aba=1",
      ),
    ).toBe("/treinos?aba=1");
  });

  it("sends anonymous and expired visitors to login", () => {
    expect(loginRedirectPath("anonymous", "/inicio")).toBe(
      "/login?next=%2Finicio",
    );
    expect(loginRedirectPath("expired", "/perfil")).toBe(
      "/login?next=%2Fperfil&aviso=sessao",
    );
    expect(loginRedirectPath("anonymous", "https://evil.example")).toBe(
      "/login",
    );
  });

  it("allows the reconsent page as a login return path", () => {
    expect(isAllowedNext("/consentimento?scope=body_data&next=%2Fperfil")).toBe(
      true,
    );
    expect(
      loginRedirectPath(
        "anonymous",
        "/consentimento?scope=body_data&next=%2Fperfil",
      ),
    ).toBe(
      "/login?next=%2Fconsentimento%3Fscope%3Dbody_data%26next%3D%252Fperfil",
    );
  });

  it("rejects open redirects", () => {
    expect(isAllowedNext("//evil.example")).toBe(false);
    expect(isAllowedNext("https://evil.example")).toBe(false);
    expect(isAllowedNext("/\\evil")).toBe(false);
    expect(
      postAuthDestination(
        { onboardingCompletedAt: new Date() },
        "//evil.example",
      ),
    ).toBe("/inicio");
  });
});
