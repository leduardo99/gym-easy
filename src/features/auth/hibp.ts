import { createHash } from "node:crypto";

export interface PasswordBreachChecker {
  isBreached(password: string): Promise<boolean>;
}

/**
 * Have I Been Pwned range API (k-anonymity). Only a 5-character SHA-1 prefix
 * leaves the server. Network failures fail open so signup is not coupled to
 * HIBP availability; a listed password is still rejected.
 */
export function createHibpBreachChecker(
  fetchImpl: typeof fetch = fetch,
): PasswordBreachChecker {
  return {
    async isBreached(password: string): Promise<boolean> {
      const digest = createHash("sha1")
        .update(password)
        .digest("hex")
        .toUpperCase();
      const prefix = digest.slice(0, 5);
      const suffix = digest.slice(5);

      try {
        const response = await fetchImpl(
          `https://api.pwnedpasswords.com/range/${prefix}`,
          {
            headers: {
              "Add-Padding": "true",
              "User-Agent": "gym-easy",
            },
            signal: AbortSignal.timeout(2_000),
          },
        );
        if (!response.ok) return false;
        const body = await response.text();
        return body.split(/\r?\n/).some((line) => {
          const [lineSuffix] = line.split(":");
          return lineSuffix?.trim().toUpperCase() === suffix;
        });
      } catch {
        return false;
      }
    },
  };
}
