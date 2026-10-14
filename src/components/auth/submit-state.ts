import { copy } from "@/features/auth/copy";
import type { AuthFormError } from "@/features/auth/actions";

const AUTH_TIMEOUT_MS = 10_000;

export function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

export function networkError(): AuthFormError {
  return { code: "server", message: copy.network };
}

export async function withAuthTimeout<T>(work: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("timeout")), AUTH_TIMEOUT_MS);
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function followInternalPath(path: string) {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) {
    return;
  }
  window.location.assign(path);
}
