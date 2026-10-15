export const DB_POOL_MAX_MIN = 5;
export const DB_POOL_MAX_LIMIT = 10;
export const DEFAULT_DB_POOL_MAX = 5;
export const DEFAULT_DB_IDLE_TIMEOUT_SECONDS = 20;
export const DEFAULT_DB_CONNECT_TIMEOUT_SECONDS = 10;
export const DEFAULT_DB_STATEMENT_TIMEOUT_MS = 15_000;

export type DbPoolConfig = {
  poolMax: number;
  idleTimeoutSeconds: number;
  connectTimeoutSeconds: number;
  statementTimeoutMs: number;
};

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

/** Rewrites the user of a local URL. Passwords here are the CI bootstrap values. */
export function databaseUrlForRole(
  databaseUrl: string,
  username: string,
  password: string,
): string {
  const url = new URL(databaseUrl);
  url.username = username;
  url.password = password;
  return url.toString();
}

export function readDbPoolConfig(source: {
  DB_POOL_MAX?: string;
  DB_IDLE_TIMEOUT?: string;
  DB_CONNECT_TIMEOUT?: string;
  DB_STATEMENT_TIMEOUT?: string;
}): DbPoolConfig | string {
  const poolMax = readBoundedInt(
    "DB_POOL_MAX",
    source.DB_POOL_MAX,
    DEFAULT_DB_POOL_MAX,
    DB_POOL_MAX_MIN,
    DB_POOL_MAX_LIMIT,
  );
  const idleTimeoutSeconds = readBoundedInt(
    "DB_IDLE_TIMEOUT",
    source.DB_IDLE_TIMEOUT,
    DEFAULT_DB_IDLE_TIMEOUT_SECONDS,
    1,
    3600,
  );
  const connectTimeoutSeconds = readBoundedInt(
    "DB_CONNECT_TIMEOUT",
    source.DB_CONNECT_TIMEOUT,
    DEFAULT_DB_CONNECT_TIMEOUT_SECONDS,
    1,
    120,
  );
  const statementTimeoutMs = readBoundedInt(
    "DB_STATEMENT_TIMEOUT",
    source.DB_STATEMENT_TIMEOUT,
    DEFAULT_DB_STATEMENT_TIMEOUT_MS,
    1,
    600_000,
  );
  if (typeof poolMax === "string") return poolMax;
  if (typeof idleTimeoutSeconds === "string") return idleTimeoutSeconds;
  if (typeof connectTimeoutSeconds === "string") return connectTimeoutSeconds;
  if (typeof statementTimeoutMs === "string") return statementTimeoutMs;
  return {
    poolMax,
    idleTimeoutSeconds,
    connectTimeoutSeconds,
    statementTimeoutMs,
  };
}

/** Options for postgres.js. TLS comes from `sslmode` on DATABASE_URL, not from here. */
export function postgresClientOptions(config: DbPoolConfig) {
  return {
    max: config.poolMax,
    idle_timeout: config.idleTimeoutSeconds,
    connect_timeout: config.connectTimeoutSeconds,
    prepare: false,
    connection: {
      statement_timeout: config.statementTimeoutMs,
    },
  };
}

function readBoundedInt(
  name: string,
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number | string {
  if (value === undefined || value.trim() === "") return fallback;
  if (!/^[0-9]+$/u.test(value)) {
    return `${name}: ${name} must be an integer from ${min} to ${max}`;
  }
  const parsed = Number(value);
  if (parsed < min || parsed > max) {
    return `${name}: ${name} must be an integer from ${min} to ${max}`;
  }
  return parsed;
}
