// @vitest-environment node
import http from "node:http";

import { describe, expect, it } from "vitest";

import { installPeerCapture } from "./capture-peer-address";

describe("installPeerCapture", () => {
  it("replaces a forged peer header with the socket address", () => {
    installPeerCapture();
    const req = {
      headers: { "x-gym-easy-peer": "203.0.113.5" } as Record<string, string>,
      socket: { remoteAddress: "198.51.100.8" },
    };
    const server = http.createServer();
    server.emit("request", req as never, {} as never);
    expect(req.headers["x-gym-easy-peer"]).toBe("198.51.100.8");
  });
});
