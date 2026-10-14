import type { EmailSender } from "./types";

export function createLogEmailSender(
  logger: Pick<Console, "info"> = console,
): EmailSender {
  return {
    async sendAccountConfirmation() {
      logger.info("email.account_confirmation");
    },
    async sendAccountExistsNotice() {
      logger.info("email.account_exists_notice");
    },
  };
}
