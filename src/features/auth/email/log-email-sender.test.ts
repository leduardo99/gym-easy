import { describe, expect, it, vi } from "vitest";

import { copy } from "../copy";
import { createLogEmailSender } from "./log-email-sender";

describe("createLogEmailSender", () => {
  it("logs the event without the address, link, or notice body", async () => {
    const info = vi.fn();
    const sender = createLogEmailSender({ info });
    const confirmUrl =
      "https://gym.example/cadastro/confirmar?token=super-secret-token";

    await sender.sendAccountConfirmation({
      to: "ana@example.com",
      confirmUrl,
    });
    await sender.sendAccountExistsNotice({ to: "ana@example.com" });

    const logged = info.mock.calls.flat().join(" ");
    expect(info.mock.calls).toEqual([
      ["email.account_confirmation"],
      ["email.account_exists_notice"],
    ]);
    expect(logged).not.toContain("ana@example.com");
    expect(logged).not.toContain("super-secret-token");
    expect(logged).not.toContain(copy.accountExistsNotice);
  });
});
