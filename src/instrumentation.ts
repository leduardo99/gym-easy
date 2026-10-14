export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { getServerEnv } = await import("@/lib/env");
  getServerEnv();
  const { installPeerCapture } = await import("@/lib/capture-peer-address");
  installPeerCapture();
}
