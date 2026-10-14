import { describe, expect, it } from "vitest";

import {
  isDesignCatalogEnabled,
  shouldBlockDesignCatalog,
} from "./design-catalog";

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

describe("shouldBlockDesignCatalog", () => {
  it("blocks the catalog path only in production", () => {
    expect(shouldBlockDesignCatalog("/design", "production")).toBe(true);
    expect(shouldBlockDesignCatalog("/design/", "production")).toBe(true);
    expect(shouldBlockDesignCatalog("/design", "preview")).toBe(false);
    expect(shouldBlockDesignCatalog("/design", undefined)).toBe(false);
  });

  it("leaves other paths alone", () => {
    expect(shouldBlockDesignCatalog("/", "production")).toBe(false);
    expect(shouldBlockDesignCatalog("/api/health", "production")).toBe(false);
    expect(shouldBlockDesignCatalog("/design-system", "production")).toBe(
      false,
    );
  });
});
