import { setDefaultResultOrder } from "node:dns";
import { pathToFileURL } from "node:url";

setDefaultResultOrder("ipv4first");

/**
 * Scheduled Task do Coolify. Apaga chat e logs de IA com mais de 90 dias.
 *
 * @param {{
 *   fetchImpl?: typeof fetch;
 *   secret?: string;
 *   port?: string;
 * }} [input]
 * @returns {Promise<number>}
 */
export async function postPurgeCoachMessages(input = {}) {
  const secret = input.secret ?? process.env.CRON_SECRET ?? "";
  const port = input.port ?? process.env.PORT ?? "3000";
  if (secret.length < 32) {
    console.error("purge-coach-messages: CRON_SECRET is required");
    return 1;
  }

  const url = `http://localhost:${port}/api/cron/purge-coach-messages`;
  const fetchImpl = input.fetchImpl ?? fetch;
  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      console.error(
        `purge-coach-messages: failed with status ${response.status}`,
      );
      return 1;
    }
    return 0;
  } catch (error) {
    console.error(
      "purge-coach-messages: failed",
      error instanceof Error ? error.name : "error",
    );
    return 1;
  }
}

const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === entry) {
  process.exit(await postPurgeCoachMessages());
}
