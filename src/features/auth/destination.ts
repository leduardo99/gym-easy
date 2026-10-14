const ALLOWED_PREFIXES = [
  "/inicio",
  "/onboarding",
  "/treinos",
  "/historico",
  "/perfil",
  "/consentimento",
] as const;

export function isAllowedNext(value: string): boolean {
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return false;
  }
  if (value.includes("://")) return false;
  const path = value.split("?")[0]?.split("#")[0] ?? "";
  return ALLOWED_PREFIXES.some(
    (allowed) => path === allowed || path.startsWith(`${allowed}/`),
  );
}

export function loginRedirectPath(
  status: "anonymous" | "expired",
  nextPath: string,
): string {
  const params = new URLSearchParams();
  if (isAllowedNext(nextPath)) params.set("next", nextPath);
  if (status === "expired") params.set("aviso", "sessao");
  const query = params.toString();
  return query ? `/login?${query}` : "/login";
}

export function postAuthDestination(
  user: { onboardingCompletedAt: Date | string | null },
  next: string | null,
): string {
  if (!user.onboardingCompletedAt) return "/onboarding";
  if (next && isAllowedNext(next)) return next;
  return "/inicio";
}
