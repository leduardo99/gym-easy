import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/consentimento",
}));

import { CONSENT_TEXTS } from "@/consent/texts";

import { RECONSENT_COPY } from "./reconsent";
import { ReconsentScreen } from "./reconsent-screen";

describe("ReconsentScreen", () => {
  it("shows the current title, body and checkbox", () => {
    render(
      <ReconsentScreen
        copy={CONSENT_TEXTS.body_data}
        scope="body_data"
        nextPath="/perfil"
        notice={null}
      />,
    );

    expect(
      screen.getByRole("heading", { name: CONSENT_TEXTS.body_data.title }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/só os usamos se você autorizar/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: CONSENT_TEXTS.body_data.checkbox }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: RECONSENT_COPY.accept }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: RECONSENT_COPY.refuse }),
    ).toBeInTheDocument();
  });

  it("keeps the block visible when the person refuses", () => {
    render(
      <ReconsentScreen
        copy={CONSENT_TEXTS.body_data}
        scope="body_data"
        nextPath="/perfil"
        notice="refused"
      />,
    );

    expect(screen.getByText(RECONSENT_COPY.refused)).toBeInTheDocument();
  });

  it("shows the transfer checkbox for the coach chat text", () => {
    render(
      <ReconsentScreen
        copy={CONSENT_TEXTS.coach_chat}
        scope="coach_chat"
        nextPath="/perfil"
        notice={null}
      />,
    );

    expect(
      screen.getByRole("checkbox", {
        name: CONSENT_TEXTS.coach_chat.transferCheckbox,
      }),
    ).toBeInTheDocument();
  });
});
