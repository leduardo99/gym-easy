import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const refresh = vi.fn();
const revokeBodyDataConsentAction = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

vi.mock("../body-data-actions", () => ({
  revokeBodyDataConsentAction: (...args: unknown[]) =>
    revokeBodyDataConsentAction(...args),
}));

import {
  BODY_DATA_PRIVACY_COPY,
  BODY_DATA_PRIVACY_DESCRIPTION_ID,
  BODY_DATA_PRIVACY_STATUS_ID,
} from "../body-data-copy";
import { BodyDataPrivacySection } from "./body-data-privacy-section";

describe("BodyDataPrivacySection", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("mantém alvo de toque da linha e do switch (min-h-11 e after:-inset)", () => {
    render(
      <BodyDataPrivacySection bodyDataGranted grantHref="/consentimento" />,
    );
    const row = screen.getByTestId("body-data-switch-row");
    expect(row).toHaveClass("min-h-11");
    const label = screen.getByTestId("body-data-switch-label");
    expect(label).toHaveClass("min-h-11");
    const switchControl = screen.getByRole("switch", {
      name: BODY_DATA_PRIVACY_COPY.sectionTitle,
    });
    expect(switchControl.className).toMatch(/after:-inset-x-3/);
    expect(switchControl.className).toMatch(/after:-inset-y-2/);
  });

  it("liga o switch à descrição com aria-describedby", () => {
    render(
      <BodyDataPrivacySection bodyDataGranted grantHref="/consentimento" />,
    );
    const switchControl = screen.getByRole("switch", {
      name: BODY_DATA_PRIVACY_COPY.sectionTitle,
    });
    expect(switchControl).toHaveAttribute(
      "aria-describedby",
      BODY_DATA_PRIVACY_DESCRIPTION_ID,
    );
    expect(
      document.getElementById(BODY_DATA_PRIVACY_DESCRIPTION_ID),
    ).toHaveTextContent(BODY_DATA_PRIVACY_COPY.sectionDescription);
  });

  it("devolve o foco ao switch ao cancelar o diálogo", async () => {
    render(
      <BodyDataPrivacySection bodyDataGranted grantHref="/consentimento" />,
    );
    const switchControl = screen.getByRole("switch", {
      name: BODY_DATA_PRIVACY_COPY.sectionTitle,
    });
    const focusSpy = vi.spyOn(switchControl, "focus");
    fireEvent.click(switchControl);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(focusSpy).toHaveBeenCalled());
  });

  it("move o foco para a mensagem de estado após revogar", async () => {
    const focusSpy = vi.spyOn(HTMLElement.prototype, "focus");
    revokeBodyDataConsentAction.mockResolvedValue({ ok: true });
    render(
      <BodyDataPrivacySection bodyDataGranted grantHref="/consentimento" />,
    );
    const switchControl = screen.getByRole("switch", {
      name: BODY_DATA_PRIVACY_COPY.sectionTitle,
    });
    fireEvent.click(switchControl);
    fireEvent.click(
      screen.getByRole("button", { name: "Retirar autorização" }),
    );
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        BODY_DATA_PRIVACY_COPY.revokeSuccess,
      );
      expect(focusSpy).toHaveBeenCalled();
      expect(
        document.getElementById(BODY_DATA_PRIVACY_STATUS_ID),
      ).not.toBeNull();
    });
    focusSpy.mockRestore();
  });

  it("usa role=alert na mensagem de erro", async () => {
    revokeBodyDataConsentAction.mockResolvedValue({
      ok: false,
      formError: { code: "server", message: "Erro de teste" },
    });
    render(
      <BodyDataPrivacySection bodyDataGranted grantHref="/consentimento" />,
    );
    fireEvent.click(
      screen.getByRole("switch", { name: BODY_DATA_PRIVACY_COPY.sectionTitle }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Retirar autorização" }),
    );
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Erro de teste");
    });
  });
});
