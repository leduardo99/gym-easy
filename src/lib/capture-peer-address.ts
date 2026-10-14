import http from "node:http";

const patched = Symbol.for("gym_easy.peer_capture");

type PatchableServer = typeof http.Server & {
  prototype: http.Server & { [patched]?: boolean };
};

/**
 * Overwrites x-gym-easy-peer with the TCP peer before Next reads the request.
 * A client-supplied value does not survive.
 */
export function installPeerCapture(): void {
  const server = http.Server as PatchableServer;
  if (server.prototype[patched]) return;
  const originalEmit = server.prototype.emit;
  server.prototype.emit = function emitWithPeer(
    this: http.Server,
    event: string | symbol,
    ...args: unknown[]
  ): boolean {
    if (event === "request") {
      const req = args[0] as
        | {
            headers?: Record<string, unknown>;
            socket?: { remoteAddress?: string };
          }
        | undefined;
      const headers = req?.headers;
      const peer = req?.socket?.remoteAddress;
      if (headers) {
        if (typeof peer === "string" && peer.length > 0) {
          headers["x-gym-easy-peer"] = peer;
        } else {
          delete headers["x-gym-easy-peer"];
        }
      }
    }
    return originalEmit.apply(this, [event, ...args] as never);
  };
  server.prototype[patched] = true;
}
