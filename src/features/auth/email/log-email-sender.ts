import { redactRecipient } from "./redact-log";
import type { EmailSender } from "./types";

export function createLogEmailSender(
  logger: Pick<Console, "info"> = console,
  createId: () => string = () => crypto.randomUUID(),
): EmailSender {
  function record(kind: string, to: string): Promise<void> {
    logger.info(kind, redactRecipient(to), createId());
    return Promise.resolve();
  }

  return {
    sendAccountConfirmation(message) {
      return record("email.account_confirmation", message.to);
    },
    sendAccountExistsNotice(message) {
      return record("email.account_exists_notice", message.to);
    },
    sendPasswordReset(message) {
      return record("email.password_reset", message.to);
    },
    probe() {
      return Promise.resolve();
    },
  };
}
