import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import type { EmailSender } from "./types";

/** Test sink. The console logger stays redacted; this file is gitignored. */
export function createCaptureEmailSender(
  filePath: string,
  inner: EmailSender,
): EmailSender {
  async function capture(entry: Record<string, string>): Promise<void> {
    await mkdir(dirname(filePath), { recursive: true });
    await appendFile(filePath, `${JSON.stringify(entry)}\n`, "utf8");
  }

  return {
    async sendAccountConfirmation(message) {
      await capture({
        kind: "account_confirmation",
        to: message.to,
        confirmUrl: message.confirmUrl,
      });
      await inner.sendAccountConfirmation(message);
    },
    async sendAccountExistsNotice(message) {
      await capture({
        kind: "account_exists_notice",
        to: message.to,
      });
      await inner.sendAccountExistsNotice(message);
    },
  };
}
