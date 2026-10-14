import { describe, expect, it } from "vitest";

import {
  isDesignCatalogEnabled,
  normalizePathname,
  shouldBlockDesignCatalog,
} from "./design-catalog";

describe("isDesignCatalogEnabled", () => {
  it("hides the catalog in production", () => {
    expect(isDesignCatalogEnabled("production")).toBe(false);
  });

  it("keeps the catalog available in development and locally", () => {
    expect(isDesignCatalogEnabled("development")).toBe(true);
    expect(isDesignCatalogEnabled("test")).toBe(true);
    expect(isDesignCatalogEnabled(undefined)).toBe(true);
  });
});

describe("normalizePathname", () => {
  it("decodes, lowercases, and drops the trailing slash", () => {
    expect(normalizePathname("/Design")).toBe("/design");
    expect(normalizePathname("/design/")).toBe("/design");
    expect(normalizePathname("/%64esign")).toBe("/design");
  });

  it("keeps a malformed escape instead of throwing", () => {
    expect(normalizePathname("/%")).toBe("/%");
  });
});

describe("shouldBlockDesignCatalog", () => {
  it("blocks the catalog path only in production", () => {
    expect(shouldBlockDesignCatalog("/design", "production")).toBe(true);
    expect(shouldBlockDesignCatalog("/Design", "production")).toBe(true);
    expect(shouldBlockDesignCatalog("/design/", "production")).toBe(true);
    expect(shouldBlockDesignCatalog("/%64esign", "production")).toBe(true);
    expect(shouldBlockDesignCatalog("/design", "development")).toBe(false);
    expect(shouldBlockDesignCatalog("/Design", "test")).toBe(false);
    expect(shouldBlockDesignCatalog("/%64esign", undefined)).toBe(false);
  });

  it("leaves other paths alone", () => {
    expect(shouldBlockDesignCatalog("/", "production")).toBe(false);
    expect(shouldBlockDesignCatalog("/api/health", "production")).toBe(false);
    expect(shouldBlockDesignCatalog("/design-system", "production")).toBe(
      false,
    );
  });
});
