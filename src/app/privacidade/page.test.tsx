import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { privacyPolicyText } from "@/features/consent/privacy-policy";

import PrivacyPage from "./page";

describe("PrivacyPage", () => {
  it("mostra os direitos do titular e os subprocessadores, sem Vercel", () => {
    render(<PrivacyPage />);

    expect(
      screen.getByRole("heading", { name: "Direitos do titular" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/contacto@gaffer\.pt/)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Subprocessadores" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Neon: Banco de dados/)).toBeInTheDocument();
    expect(screen.getByText(/eu-central-1/)).toBeInTheDocument();
    expect(
      screen.getByText(/Oracle Cloud Infrastructure: Hospedagem/),
    ).toBeInTheDocument();
    expect(screen.getByText(/eu-madrid-1/)).toBeInTheDocument();
    expect(screen.getByText(/cópias de segurança/)).toBeInTheDocument();

    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/vercel/i);
    expect(text).not.toMatch(/\{\{[\s\S]*?\}\}/);
    expect(privacyPolicyText()).not.toMatch(/vercel/i);
    expect(privacyPolicyText()).toContain("contacto@gaffer.pt");
    expect(privacyPolicyText()).toContain("eu-madrid-1");
    expect(privacyPolicyText()).toContain("eu-central-1");
  });
});
