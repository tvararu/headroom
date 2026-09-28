import { describe, expect, test } from "bun:test";
import {
  DIM_MS,
  dimmed,
  layoutAt,
  nextBoundary,
  ORBIT,
  orbitAt,
  toggleOverride,
} from "../src/app/guard";

describe("layoutAt", () => {
  test("flips at a 10-minute boundary", () => {
    const boundary = 600000 * 10;
    expect(layoutAt(boundary - 1, null)).toBe("list");
    expect(layoutAt(boundary, null)).toBe("tiles");
  });
  test("override holds until next boundary then expires", () => {
    const now = 600000 * 5 + 60000;
    expect(layoutAt(now, null)).toBe("list");
    const override = { layout: "tiles" as const, until: nextBoundary(now) };
    expect(layoutAt(now, override)).toBe("tiles");
    expect(layoutAt(override.until + 1, override)).toBe(
      layoutAt(override.until + 1, null),
    );
  });
  test("toggleOverride picks the other layout until the next boundary", () => {
    const now = 600000 * 4 + 60000;
    const o = toggleOverride(now, "tiles");
    expect(o.layout).toBe("list");
    expect(o.until).toBe(nextBoundary(now));
  });
});

describe("orbitAt", () => {
  test("repeats after 9 minutes", () => {
    for (let i = 0; i < 20; i++) {
      const a = orbitAt(i * 60000);
      const b = orbitAt((i + 9) * 60000);
      expect(a).toEqual(b);
    }
    expect(ORBIT).toHaveLength(9);
    expect(orbitAt(0)).toEqual([0, 0]);
  });
});

describe("dimmed", () => {
  test("starts at exactly 30 minutes", () => {
    const last = 1000000000000;
    expect(dimmed(last + DIM_MS - 1, last)).toBe(false);
    expect(dimmed(last + DIM_MS, last)).toBe(true);
  });
});
