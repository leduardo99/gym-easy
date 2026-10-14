/** One visible character and no domain, so the log is not the full address. */
export function redactRecipient(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "[redacted]";
  return `${email.charAt(0)}***@[redacted]`;
}

/** Same redaction the Resend adapter uses: addresses, secrets, then a short line. */
export function redactLogMessage(
  value: unknown,
  secrets: readonly string[],
): string {
  if (typeof value !== "string") return "unknown";
  const emailAddress =
    /[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+/gi;
  let message = value.replace(emailAddress, "[redacted]");
  for (const secret of secrets) {
    if (secret.length > 0) message = message.split(secret).join("[redacted]");
  }
  message = message.replace(/\s+/g, " ").trim();
  if (message.length === 0) return "unknown";
  return message.slice(0, 200);
}
