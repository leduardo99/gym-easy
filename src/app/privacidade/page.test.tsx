import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  PRIVACY_POLICY_BIRTH_YEAR_MINIMUM_AGE_ID,
  PRIVACY_POLICY_MINIMUM_AGE_ID,
  privacyPolicyText,
} from "@/features/consent/privacy-policy";
import { MINIMUM_AGE_YEARS } from "@/features/profile/age";

import PrivacyPage from "./page";

const minimumAgeSentence = `A idade mínima para usar o Gym Easy é ${MINIMUM_AGE_YEARS} anos.`;

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
      screen.getByRole("heading", { name: "Onde ficam os dados" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /banco de dados PostgreSQL gerido pela equipe do Gym Easy/,
      ),
    ).toBeInTheDocument();
    const dataLocation = screen.getByRole("region", {
      name: "Onde ficam os dados",
    });
    expect(dataLocation).toHaveTextContent(
      /guardados no servidor e nas cópias de segurança \(backups\)/,
    );
    expect(dataLocation).toHaveTextContent(/não saem da UE/);
    expect(
      screen.getByRole("heading", { name: "Subprocessadores" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/infra-postgres/i)).not.toBeInTheDocument();
    expect(
      screen.getByText(/Oracle Cloud Infrastructure: Hospedagem/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/backups\) diárias e criptografadas/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/dados apagados saem dos backups em até 8 dias/),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/eu-madrid-1/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/Madrid, UE/)).toBeInTheDocument();
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
    expect(screen.getAllByText(/90 dias/).length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Apagar histórico/).length,
    ).toBeGreaterThanOrEqual(1);

    const profileBody = screen.getByRole("region", {
      name: "Dados do perfil e do corpo",
    });
    expect(profileBody).toHaveTextContent(
      "Perfil de treino e ano de nascimento",
    );
    expect(profileBody).toHaveTextContent("execução do contrato");
    expect(profileBody).toHaveTextContent("Dados do corpo");
    expect(profileBody).toHaveTextContent("consentimento body_data");
    expect(profileBody).toHaveTextContent("Conservados após revogar");
    expect(profileBody).not.toHaveTextContent(/Nota técnica temporária/);
    expect(profileBody).toHaveTextContent("birthYear");
    expect(profileBody).toHaveTextContent("trainingPlace");
    expect(profileBody).toHaveTextContent("heightCm");
    expect(profileBody).toHaveTextContent("weight_kg");
    expect(profileBody).toHaveTextContent("coach_health");
    expect(profileBody).toHaveTextContent(/metadados técnicos/i);
    expect(profileBody).toHaveTextContent(/indicação ZDR/);
    expect(profileBody).not.toHaveTextContent(/só pseudónimo/i);
    expect(profileBody).not.toHaveTextContent(/medidas corporais/i);

    const lists = within(profileBody).getAllByRole("list");
    const contractualList = lists[0];
    const bodyDataList = lists[1];
    expect(contractualList).toBeDefined();
    expect(bodyDataList).toBeDefined();
    if (!contractualList || !bodyDataList) return;
    expect(contractualList).toHaveTextContent("birthYear");
    expect(contractualList).toHaveTextContent("goal");
    expect(contractualList).not.toHaveTextContent("heightCm");
    expect(bodyDataList).toHaveTextContent("heightCm");
    expect(bodyDataList).toHaveTextContent("weight_kg");
    expect(bodyDataList).not.toHaveTextContent("ano de nascimento (birthYear)");
    expect(bodyDataList).not.toHaveTextContent("goal");

    expect(contractualList.textContent).toMatch(
      /ano de nascimento \(birthYear\)/,
    );
    expect(
      document.getElementById(PRIVACY_POLICY_MINIMUM_AGE_ID),
    ).toHaveTextContent(minimumAgeSentence);
    expect(
      document.getElementById(PRIVACY_POLICY_BIRTH_YEAR_MINIMUM_AGE_ID),
    ).toHaveTextContent(new RegExp(`pelo menos ${MINIMUM_AGE_YEARS} anos`));
    expect(profileBody).toHaveTextContent(
      /art\. 6\.º, n\.º 1, alíneas b\) e c\)/,
    );
    expect(profileBody).toHaveTextContent(/art\. 8\.º do RGPD/);
    expect(profileBody).toHaveTextContent(
      /ano de nascimento só é apagado quando você apaga a conta/,
    );

    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/vercel/i);
    expect(text).not.toMatch(/\{\{[\s\S]*?\}\}/);
    expect(privacyPolicyText()).not.toMatch(/vercel/i);
    expect(privacyPolicyText()).toContain("contacto@gaffer.pt");
    expect(privacyPolicyText()).toContain("eu-madrid-1");
    expect(privacyPolicyText()).toMatch(
      /guardados no servidor e nas cópias de segurança \(backups\).*não saem da UE/,
    );
    expect(privacyPolicyText()).toContain("criptografadas");
    expect(privacyPolicyText()).toContain(
      "dados apagados saem dos backups em até 8 dias",
    );
    expect(privacyPolicyText()).not.toContain("eu-central-1");
    expect(privacyPolicyText()).not.toContain("Neon");
    expect(privacyPolicyText()).not.toContain("infra-postgres");
    expect(privacyPolicyText()).toContain("Dados do perfil e do corpo");
    expect(privacyPolicyText()).toContain("daysPerWeek");
    expect(privacyPolicyText()).toContain("coach_health");
    expect(privacyPolicyText()).toContain(minimumAgeSentence);
    expect(privacyPolicyText()).not.toContain("medidas corporais");
    expect(privacyPolicyText()).not.toContain("LED-146");
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
