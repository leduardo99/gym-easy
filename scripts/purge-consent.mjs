import { setDefaultResultOrder } from "node:dns";
import { pathToFileURL } from "node:url";

setDefaultResultOrder("ipv4first");

/**
 * @param {{
 *   fetchImpl?: typeof fetch;
 *   secret?: string;
 *   port?: string;
 * }} [input]
 * @returns {Promise<number>}
 */
export async function postPurge(input = {}) {
  const secret = input.secret ?? process.env.CRON_SECRET ?? "";
  const port = input.port ?? process.env.PORT ?? "3000";
  if (secret.length < 32) {
    console.error("purge-consent: CRON_SECRET is required");
    return 1;
  }

  const url = `http://localhost:${port}/api/cron/purge-consent-proofs`;
  const fetchImpl = input.fetchImpl ?? fetch;
  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      console.error(`purge-consent: failed with status ${response.status}`);
      return 1;
    }
    return 0;
  } catch (error) {
    console.error(
      "purge-consent: failed",
      error instanceof Error ? error.name : "error",
    );
    return 1;
  }
}

const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === entry) {
  process.exit(await postPurge());
}
