import { describe, expect, it } from "vitest";

import { isDesignCatalogEnabled } from "./design-catalog";

describe("isDesignCatalogEnabled", () => {
  it("hides the catalog in production", () => {
    expect(isDesignCatalogEnabled("production")).toBe(false);
  });

  it("keeps the catalog available in preview, development, and locally", () => {
    expect(isDesignCatalogEnabled("preview")).toBe(true);
    expect(isDesignCatalogEnabled("development")).toBe(true);
    expect(isDesignCatalogEnabled(undefined)).toBe(true);
  });
});
