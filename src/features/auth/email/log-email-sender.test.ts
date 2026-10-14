import { describe, expect, it, vi } from "vitest";

import { copy } from "../copy";
import { createLogEmailSender } from "./log-email-sender";

describe("createLogEmailSender", () => {
  it("logs only the kind, a redacted recipient, and an id", async () => {
    const info = vi.fn();
    let sequence = 0;
    const sender = createLogEmailSender({ info }, () => `id-${++sequence}`);
    const confirmUrl =
      "https://gym.example/cadastro/confirmar?token=super-secret-token";

    await sender.sendAccountConfirmation({
      to: "ana@example.com",
      confirmUrl,
    });
    await sender.sendAccountExistsNotice({ to: "ana@example.com" });
    await sender.sendPasswordReset({ to: "ana@example.com" });

    expect(info.mock.calls).toEqual([
      ["email.account_confirmation", "a***@[redacted]", "id-1"],
      ["email.account_exists_notice", "a***@[redacted]", "id-2"],
      ["email.password_reset", "a***@[redacted]", "id-3"],
    ]);
    const logged = info.mock.calls.flat().join(" ");
    expect(logged).not.toContain("ana@example.com");
    expect(logged).not.toContain("example.com");
    expect(logged).not.toContain("super-secret-token");
    expect(logged).not.toContain(confirmUrl);
    expect(logged).not.toContain(copy.accountExistsNotice);
    expect(logged).not.toContain(copy.passwordResetNotice);
  });
});
