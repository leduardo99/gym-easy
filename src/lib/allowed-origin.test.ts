import { beforeEach, describe, expect, it, vi } from "vitest";

const APP_URL = "https://app.gaffer.pt";

const getServerEnv = vi.fn<() => { APP_URL: string }>();

vi.mock("@/lib/env", () => ({
  getServerEnv: () => getServerEnv(),
}));

import {
  declaredRequestOrigin,
  isAllowedOrigin,
  isAllowedOriginFromHeaders,
} from "./allowed-origin";

function h(init: Record<string, string> = {}): Headers {
  return new Headers(init);
}

describe("allowed-origin", () => {
  beforeEach(() => {
    getServerEnv.mockReset();
    getServerEnv.mockReturnValue({ APP_URL });
  });

  it("accepts an Origin equal to APP_URL", () => {
    expect(isAllowedOriginFromHeaders(h({ origin: APP_URL }))).toBe(true);
  });

  it("rejects a different Origin", () => {
    expect(
      isAllowedOriginFromHeaders(h({ origin: "https://evil.example" })),
    ).toBe(false);
  });

  it("rejects Origin: null even with a same-origin Referer", () => {
    const headers = h({ origin: "null", referer: `${APP_URL}/perfil` });
    expect(declaredRequestOrigin(headers)).toBeNull();
    expect(isAllowedOriginFromHeaders(headers)).toBe(false);
  });

  it("falls back to a same-origin Referer when Origin is absent", () => {
    const headers = h({ referer: `${APP_URL}/treino?x=1` });
    expect(declaredRequestOrigin(headers)).toBe(APP_URL);
    expect(isAllowedOriginFromHeaders(headers)).toBe(true);
  });

  it("rejects a Referer from another origin", () => {
    expect(
      isAllowedOriginFromHeaders(h({ referer: "https://evil.example/x" })),
    ).toBe(false);
  });

  it("rejects an invalid Referer", () => {
    const headers = h({ referer: "not a url" });
    expect(declaredRequestOrigin(headers)).toBeNull();
    expect(isAllowedOriginFromHeaders(headers)).toBe(false);
  });

  it("rejects when neither Origin nor Referer is present", () => {
    expect(declaredRequestOrigin(h())).toBeNull();
    expect(isAllowedOriginFromHeaders(h())).toBe(false);
  });

  it("rejects when APP_URL is unavailable", () => {
    getServerEnv.mockImplementation(() => {
      throw new Error("invalid env");
    });
    expect(isAllowedOriginFromHeaders(h({ origin: APP_URL }))).toBe(false);
  });

  describe("rejects lookalikes (exact origin string match to APP_URL only)", () => {
    const rejectViaOrigin = [
      ["http scheme vs https APP_URL", "http://app.gaffer.pt"],
      ["non-default port :8443", "https://app.gaffer.pt:8443"],
      ["subdomain prefix", "https://evil.app.gaffer.pt"],
      ["suffix domain", "https://app.gaffer.pt.evil.com"],
      ["APP_URL as subdomain prefix", "https://app.gaffer.pt.evil.com"],
      ["host suffix without dot", "https://app.gaffer.ptx"],
      ["trailing slash on Origin (not normalized)", "https://app.gaffer.pt/"],
      [
        "uppercase Origin (byte-equal; no URL normalization on Origin)",
        "HTTPS://APP.GAFFER.PT",
      ],
    ] as const;

    it.each(rejectViaOrigin)("rejects Origin: %s", (_label, origin) => {
      expect(isAllowedOriginFromHeaders(h({ origin }))).toBe(false);
    });

    const rejectViaReferer = [
      ["http scheme vs https APP_URL", "http://app.gaffer.pt/treino"],
      ["non-default port :8443", "https://app.gaffer.pt:8443/treino"],
      ["subdomain prefix", "https://evil.app.gaffer.pt/treino"],
      ["suffix domain", "https://app.gaffer.pt.evil.com/treino"],
      ["APP_URL as subdomain prefix", "https://app.gaffer.pt.evil.com/treino"],
      ["host suffix without dot", "https://app.gaffer.ptx/treino"],
    ] as const;

    it.each(rejectViaReferer)(
      "rejects Referer fallback: %s",
      (_label, referer) => {
        expect(isAllowedOriginFromHeaders(h({ referer }))).toBe(false);
      },
    );

    it("accepts Referer with uppercase host because URL parsing lowercases the origin", () => {
      const referer = "https://APP.GAFFER.PT/perfil";
      expect(declaredRequestOrigin(h({ referer }))).toBe(APP_URL);
      expect(isAllowedOriginFromHeaders(h({ referer }))).toBe(true);
    });
  });

  describe("never trusts Host or X-Forwarded-Host", () => {
    it("rejects when only forged Host / X-Forwarded-Host match the app host", () => {
      expect(
        isAllowedOriginFromHeaders(
          h({
            host: "app.gaffer.pt",
            "x-forwarded-host": "app.gaffer.pt",
          }),
        ),
      ).toBe(false);
    });

    it("rejects evil Origin even with forged Host headers for the app host", () => {
      expect(
        isAllowedOriginFromHeaders(
          h({
            origin: "https://evil.example",
            host: "app.gaffer.pt",
            "x-forwarded-host": "app.gaffer.pt",
          }),
        ),
      ).toBe(false);
    });
  });

  it("isAllowedOrigin delegates to the request headers", () => {
    // undici's Request drops the forbidden `Origin` header, so build a
    // minimal Request-shaped object to exercise the delegation.
    const asRequest = (headers: Headers) => ({ headers }) as unknown as Request;
    const ok = asRequest(h({ origin: APP_URL }));
    const bad = asRequest(h({ origin: "https://evil.example" }));
    const viaReferer = new Request(`${APP_URL}/api/ai/coach`, {
      method: "POST",
      headers: { referer: `${APP_URL}/coach` },
    });
    expect(isAllowedOrigin(ok)).toBe(true);
    expect(isAllowedOrigin(bad)).toBe(false);
    expect(isAllowedOrigin(viaReferer)).toBe(
      isAllowedOriginFromHeaders(viaReferer.headers),
    );
  });
});
