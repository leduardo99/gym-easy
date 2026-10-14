import { describe, expect, it } from "vitest";

import { accessControlAllowOrigin } from "./app-url";

describe("accessControlAllowOrigin", () => {
  it("uses the origin from APP_URL and drops a path", () => {
    expect(accessControlAllowOrigin("https://app.gaffer.pt")).toBe(
      "https://app.gaffer.pt",
    );
    expect(accessControlAllowOrigin("https://app.gaffer.pt/cadastro")).toBe(
      "https://app.gaffer.pt",
    );
    expect(accessControlAllowOrigin("http://127.0.0.1:3000/")).toBe(
      "http://127.0.0.1:3000",
    );
  });

  it("omits the header when the value is missing or not an http origin", () => {
    expect(accessControlAllowOrigin(undefined)).toBeNull();
    expect(accessControlAllowOrigin("")).toBeNull();
    expect(accessControlAllowOrigin("app.gaffer.pt")).toBeNull();
    expect(accessControlAllowOrigin("javascript:alert(1)")).toBeNull();
    expect(
      accessControlAllowOrigin("https://user:pass@app.gaffer.pt"),
    ).toBeNull();
  });
});
