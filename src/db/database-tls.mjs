const VERIFY_FULL = "verify-full";

/**
 * @param {string} databaseUrl
 * @returns {string}
 */
export function sslMode(databaseUrl) {
  try {
    return (
      new URL(databaseUrl).searchParams.get("sslmode")?.toLowerCase() ?? ""
    );
  } catch {
    return "";
  }
}

/**
 * @param {string} databaseUrl
 * @returns {string}
 */
export function databaseHostname(databaseUrl) {
  try {
    return new URL(databaseUrl).hostname.toLowerCase().replace(/\.$/u, "");
  } catch {
    return "";
  }
}

/**
 * @param {string} hostname
 * @returns {boolean}
 */
function isLocalHost(hostname) {
  return (
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1"
  );
}

/**
 * @param {string} hostname
 * @returns {boolean}
 */
function isNeonHost(hostname) {
  return hostname === "neon.tech" || hostname.endsWith(".neon.tech");
}

/**
 * Production requires sslmode=verify-full.
 * DB_TLS_MODE=neon allows sslmode=require only on *.neon.tech.
 * DB_TLS_MODE=insecure is the explicit local test flag.
 *
 * @param {{
 *   nodeEnv?: string;
 *   databaseUrl?: string;
 *   label: string;
 *   tlsMode?: string;
 *   productionBuild?: boolean;
 * }} input
 * @returns {string | null}
 */
export function databaseTlsError(input) {
  if (input.productionBuild) return null;
  if (input.nodeEnv !== "production") return null;
  const databaseUrl = input.databaseUrl ?? "";
  if (databaseUrl.length === 0) return null;

  const mode = (input.tlsMode ?? "").trim().toLowerCase();
  const sslmode = sslMode(databaseUrl);
  const host = databaseHostname(databaseUrl);
  const label = input.label;

  if (mode === "insecure") {
    if (!isLocalHost(host)) {
      return `${label}: DB_TLS_MODE=insecure is only allowed for localhost`;
    }
    return null;
  }

  if (mode === "neon") {
    if (!isNeonHost(host)) {
      return `${label}: DB_TLS_MODE=neon only allows sslmode=require on *.neon.tech`;
    }
    if (sslmode === "require" || sslmode === VERIFY_FULL) return null;
    return `${label}: DB_TLS_MODE=neon accepts sslmode=require or sslmode=verify-full`;
  }

  if (mode !== "" && mode !== VERIFY_FULL) {
    return `${label}: DB_TLS_MODE must be verify-full, neon, or insecure`;
  }

  if (sslmode === VERIFY_FULL) return null;

  return `${label}: sslmode=verify-full is required in production`;
}

/**
 * @param {{
 *   nodeEnv?: string;
 *   tlsMode?: string;
 *   productionBuild?: boolean;
 *   urls: { label: string; url?: string }[];
 * }} input
 * @returns {string[]}
 */
export function databaseTlsErrors(input) {
  const errors = [];
  for (const item of input.urls) {
    const error = databaseTlsError({
      nodeEnv: input.nodeEnv,
      databaseUrl: item.url,
      label: item.label,
      tlsMode: input.tlsMode,
      productionBuild: input.productionBuild,
    });
    if (error) errors.push(error);
  }
  return errors;
}
