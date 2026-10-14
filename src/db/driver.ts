export function databaseHostname(databaseUrl: string): string | null {
  try {
    return new URL(databaseUrl).hostname;
  } catch {
    return null;
  }
}

export function isLocalDatabaseUrl(databaseUrl: string): boolean {
  const host = databaseHostname(databaseUrl);
  return host === "localhost" || host === "127.0.0.1";
}

/**
 * Neon HTTP driver talks to Neon hosts. Local Postgres and CI use the wire
 * protocol (`pg`) so the same Drizzle queries run without a Neon branch.
 */
export function shouldUsePgDriver(
  databaseUrl: string,
  driver: string | undefined = process.env.DATABASE_DRIVER,
): boolean {
  if (driver === "neon") return false;
  if (driver === "pg") return true;
  return isLocalDatabaseUrl(databaseUrl);
}
