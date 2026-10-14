import { describe, expect, it } from "vitest";

import { ageBand, approximateAge, isUnderMinimumAge } from "./age";

describe("isUnderMinimumAge", () => {
  it("bloqueia quando o ano atual menos o ano de nascimento é 16 ou menos", () => {
    const year = 2026;
    expect(isUnderMinimumAge(year - 16, new Date("2026-10-14T12:00:00Z"))).toBe(
      true,
    );
    expect(isUnderMinimumAge(year - 17, new Date("2026-06-01T00:00:00Z"))).toBe(
      false,
    );
  });

  it("libera no dia 1 de janeiro do ano seguinte quem estava bloqueado", () => {
    expect(isUnderMinimumAge(2010, new Date("2026-12-31T23:59:59Z"))).toBe(
      true,
    );
    expect(isUnderMinimumAge(2010, new Date("2027-01-01T00:00:00Z"))).toBe(
      false,
    );
  });
});

describe("approximateAge", () => {
  it("mostra a diferença entre o ano atual e o ano de nascimento", () => {
    expect(approximateAge(1992, new Date("2026-01-01T00:00:00Z"))).toBe(34);
  });
});

describe("ageBand", () => {
  it("deriva a faixa etária sem guardar o ano", () => {
    const now = new Date("2026-10-14T00:00:00Z");
    expect(ageBand(2010, now)).toBeNull();
    expect(ageBand(2009, now)).toBe("16-17");
    expect(ageBand(2008, now)).toBe("18-29");
    expect(ageBand(1996, now)).toBe("30-39");
    expect(ageBand(1986, now)).toBe("40-49");
    expect(ageBand(1976, now)).toBe("50-59");
    expect(ageBand(1966, now)).toBe("60-69");
    expect(ageBand(1950, now)).toBe("70+");
  });
});
