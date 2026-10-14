import type { EmailDelivery } from "./types";

export function logEmailEvent(event: string, error: unknown): void {
  console.error(event, error instanceof Error ? error.name : "error");
}

export function settleEmailDelivery(
  event: string,
  work: () => Promise<void>,
): () => Promise<EmailDelivery> {
  return async () => {
    try {
      await work();
      return "sent";
    } catch (error) {
      logEmailEvent(event, error);
      return "failed";
    }
  };
}
