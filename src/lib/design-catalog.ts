export function isDesignCatalogEnabled(
  vercelEnv: string | undefined = process.env.VERCEL_ENV,
): boolean {
  return vercelEnv !== "production";
}

export function isDesignCatalogPath(pathname: string): boolean {
  const normalized =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;

  return normalized === "/design";
}

export function shouldBlockDesignCatalog(
  pathname: string,
  vercelEnv: string | undefined = process.env.VERCEL_ENV,
): boolean {
  return isDesignCatalogPath(pathname) && !isDesignCatalogEnabled(vercelEnv);
}
