import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { privacyPolicyText } from "@/features/consent/privacy-policy";

import PrivacyPage from "./page";

afterEach(() => {
  cleanup();
});

describe("PrivacyPage", () => {
  it("mostra os direitos do titular e os subprocessadores, sem Vercel", () => {
    render(<PrivacyPage />);

    expect(
      screen.getByRole("heading", { name: "Direitos do titular" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/contacto@gaffer\.pt/).length).toBeGreaterThan(
      0,
    );
    expect(
      screen.getByRole("heading", { name: "Subprocessadores" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/PostgreSQL \(infra-postgres\): Banco de dados gerido/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/dados do corpo, saúde do Coach, chat/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Oracle Cloud Infrastructure: Hospedagem/),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/eu-madrid-1/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/cópias de segurança/)).toBeInTheDocument();
    expect(
      screen.getByText(/Tailscale: Rede privada da infraestrutura/),
    ).toBeInTheDocument();
    expect(screen.getByText(/sem dados dos usuários/)).toBeInTheDocument();
    expect(
      screen.getByText(/OpenRouter: Inteligência artificial do Coach/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/não há garantia de retenção zero/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Resend: Email transacional, opcional, só em produção/),
    ).toBeInTheDocument();
    expect(screen.getByText(/90 dias/)).toBeInTheDocument();
    expect(screen.getByText(/Apagar histórico/)).toBeInTheDocument();

    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/vercel/i);
    expect(text).not.toMatch(/\{\{[\s\S]*?\}\}/);
    expect(privacyPolicyText()).not.toMatch(/vercel/i);
    expect(privacyPolicyText()).toContain("contacto@gaffer.pt");
    expect(privacyPolicyText()).toContain("eu-madrid-1");
    expect(privacyPolicyText()).not.toContain("eu-central-1");
    expect(privacyPolicyText()).not.toContain("Neon");
  });

  it("inclui a retirada do consentimento e a reclamação à CNPD", () => {
    render(<PrivacyPage />);

    const rights = screen.getByRole("region", { name: "Direitos do titular" });
    expect(rights).toHaveTextContent(
      "retirar o consentimento a qualquer momento",
    );
    expect(rights).toHaveTextContent("nas definições da app ou por");
    expect(rights).toHaveTextContent("contacto@gaffer.pt");
    expect(rights).toHaveTextContent(
      "não afeta a licitude do tratamento anterior",
    );
    expect(rights).toHaveTextContent("art. 7.º/3");
    expect(rights).toHaveTextContent(
      "reclamação à autoridade de controlo, a CNPD (www.cnpd.pt)",
    );
    expect(rights).toHaveTextContent("art. 77.º");

    const policy = privacyPolicyText();
    expect(policy).toContain("retirar o consentimento a qualquer momento");
    expect(policy).toContain("nas definições da app ou por contacto@gaffer.pt");
    expect(policy).toContain("licitude do tratamento anterior");
    expect(policy).toContain("art. 7.º/3");
    expect(policy).toContain("www.cnpd.pt");
    expect(policy).toContain("art. 77.º");
  });
});
