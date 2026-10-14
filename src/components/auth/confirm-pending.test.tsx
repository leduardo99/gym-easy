import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { copy } from "@/features/auth/copy";

import { ConfirmPending } from "./confirm-pending";

const resendConfirmationAction = vi.hoisted(() => vi.fn());

vi.mock("@/features/auth/actions", () => ({
  resendConfirmationAction,
}));

describe("ConfirmPending", () => {
  it("shows the send failure and keeps the resend control", () => {
    render(
      <ConfirmPending
        email="ana@example.com"
        fresh
        expired={false}
        deliveryFailed
      />,
    );

    expect(screen.getByText(copy.emailSendFailed)).toBeInTheDocument();
    expect(screen.getByText(copy.signupPending)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reenviar em/ })).toBeDisabled();
    expect(screen.getByText(copy.emailSendFailed).textContent).not.toContain(
      "ana@example.com",
    );
  });

  it("shows the same failure when a later resend cannot be delivered", async () => {
    resendConfirmationAction.mockResolvedValue({
      ok: false,
      formError: {
        code: "email",
        message: copy.emailSendFailed,
        retryAfterSeconds: 60,
      },
    });

    render(
      <ConfirmPending email="ana@example.com" fresh={false} expired={false} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Reenviar link" }));

    await waitFor(() => {
      expect(screen.getByText(copy.emailSendFailed)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Reenviar em/ }),
      ).toBeDisabled();
    });
    expect(screen.queryByText(/não encontr/i)).not.toBeInTheDocument();
  });
});
