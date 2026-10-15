import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/consentimento",
}));

import { CONSENT_TEXTS } from "@/consent/texts";

import { RECONSENT_COPY } from "./reconsent";
import { ReconsentScreen } from "./reconsent-screen";

describe("ReconsentScreen", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows the current title, body and checkbox", () => {
    const { container } = render(
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
      within(container).getAllByText(/só os usamos se você autorizar/i).length,
    ).toBeGreaterThan(0);
    expect(
      within(container).getByText(/Ler o texto completo/i),
    ).toBeInTheDocument();
    expect(
      within(container).getByRole("checkbox", {
        name: CONSENT_TEXTS.body_data.checkbox,
      }),
    ).toBeInTheDocument();
    expect(
      within(container).getByRole("button", { name: RECONSENT_COPY.accept }),
    ).toBeInTheDocument();
    expect(
      within(container).getByRole("button", { name: RECONSENT_COPY.refuse }),
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

  it("keeps authorize disabled until both coach checkboxes are checked", () => {
    const { container } = render(
      <ReconsentScreen
        copy={CONSENT_TEXTS.coach_chat}
        scope="coach_chat"
        nextPath="/perfil"
        notice={null}
      />,
    );

    const submit = within(container).getByRole("button", {
      name: RECONSENT_COPY.accept,
    });
    expect(submit).toHaveAttribute("type", "submit");
    expect(submit).toBeDisabled();

    fireEvent.click(
      within(container).getByRole("checkbox", {
        name: CONSENT_TEXTS.coach_chat.checkbox,
      }),
    );
    expect(submit).toBeDisabled();

    fireEvent.click(
      within(container).getByRole("checkbox", {
        name: CONSENT_TEXTS.coach_chat.transferCheckbox,
      }),
    );
    expect(submit).toBeEnabled();
  });
});
