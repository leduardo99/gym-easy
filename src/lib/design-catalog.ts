export function isDesignCatalogEnabled(
  nodeEnv: string | undefined = process.env.NODE_ENV,
): boolean {
  return nodeEnv !== "production";
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
  nodeEnv: string | undefined = process.env.NODE_ENV,
): boolean {
  return isDesignCatalogPath(pathname) && !isDesignCatalogEnabled(nodeEnv);
}
