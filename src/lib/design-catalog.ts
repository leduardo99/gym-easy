export function isDesignCatalogEnabled(
  vercelEnv: string | undefined = process.env.VERCEL_ENV,
): boolean {
  return vercelEnv !== "production";
}

function decodePathname(pathname: string): string {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
}

export function normalizePathname(pathname: string): string {
  const decoded = decodePathname(pathname).toLowerCase();
  if (decoded.length <= 1) {
    return decoded;
  }

  const withoutTrailingSlash = decoded.replace(/\/+$/, "");
  return withoutTrailingSlash === "" ? "/" : withoutTrailingSlash;
}

export function isDesignCatalogPath(pathname: string): boolean {
  return normalizePathname(pathname) === "/design";
}

export function shouldBlockDesignCatalog(
  pathname: string,
  vercelEnv: string | undefined = process.env.VERCEL_ENV,
): boolean {
  return isDesignCatalogPath(pathname) && !isDesignCatalogEnabled(vercelEnv);
}
