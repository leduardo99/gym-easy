import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { copy } from "@/features/auth/copy";

import { ResetRequestForm } from "./reset-request-form";

const requestPasswordResetAction = vi.hoisted(() => vi.fn());

vi.mock("@/features/auth/actions", () => ({
  requestPasswordResetAction,
}));

describe("ResetRequestForm", () => {
  it("shows the send failure and keeps the form so the user can retry", async () => {
    requestPasswordResetAction.mockResolvedValue({
      ok: false,
      formError: {
        code: "email",
        message: copy.emailSendFailed,
        retryAfterSeconds: 60,
      },
    });

    render(<ResetRequestForm />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "ana@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar aviso" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(copy.emailSendFailed);
    });
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar aviso" })).toBeDisabled();
    expect(screen.getByRole("alert").textContent).not.toContain(
      "ana@example.com",
    );
    expect(
      screen.queryByText(copy.passwordResetAccepted),
    ).not.toBeInTheDocument();
  });
});
