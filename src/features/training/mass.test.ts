import { describe, expect, it } from "vitest";

import { formatTenths, parseMassToTenths } from "./mass";

describe("parseMassToTenths", () => {
  it("accepts a comma or a dot and keeps one decimal place", () => {
    expect(parseMassToTenths("78,5")).toBe(785);
    expect(parseMassToTenths("78.5")).toBe(785);
    expect(parseMassToTenths(78)).toBe(780);
    expect(formatTenths(785)).toBe("78.5");
  });

  it("rounds extra decimals half up", () => {
    expect(parseMassToTenths("78,54")).toBe(785);
    expect(parseMassToTenths("78,55")).toBe(786);
  });

  it("rejects empty, negative, and non-numeric values", () => {
    expect(parseMassToTenths("")).toBeNull();
    expect(parseMassToTenths("-1")).toBeNull();
    expect(parseMassToTenths("78kg")).toBeNull();
    expect(parseMassToTenths("1;drop table")).toBeNull();
  });
});
