import { describe, expect, test } from "bun:test";
import { DIM_MS, dimmed, layoutAt, PIN_MS, pinLayout } from "../src/app/guard";
import { stepTheme } from "../src/app/themes";
import { THEMES } from "../src/app/themes.generated";
import { mapKey } from "../src/app/webos";

describe("layoutAt", () => {
  test("flips at every minute boundary", () => {
    const boundary = 60000 * 10;
    expect(layoutAt(boundary - 1, null)).toBe("list");
    expect(layoutAt(boundary, null)).toBe("tiles");
    expect(layoutAt(boundary + 60000, null)).toBe("list");
  });
  test("a pinned layout holds for 10 minutes across swaps, then expires", () => {
    const now = 60000 * 10;
    const pin = pinLayout(now, "list");
    expect(pin.until - now).toBe(PIN_MS);
    for (let t = now; t < pin.until; t += 30000) {
      expect(layoutAt(t, pin)).toBe("list");
    }
    expect(layoutAt(pin.until, pin)).toBe("tiles");
  });
});

describe("remote keys", () => {
  test("number keys pick a space, including the numpad codes", () => {
    expect(mapKey(49)).toBe("tiles");
    expect(mapKey(97)).toBe("tiles");
    expect(mapKey(50)).toBe("list");
    expect(mapKey(98)).toBe("list");
  });
  test("channel up and down step the theme both ways", () => {
    expect(mapKey(33)).toBe("themeNext");
    expect(mapKey(34)).toBe("themePrev");
  });
});

describe("stepTheme", () => {
  test("wraps in both directions", () => {
    const first = THEMES[0].name;
    const last = THEMES[THEMES.length - 1].name;
    expect(stepTheme(first, -1)).toBe(last);
    expect(stepTheme(last, 1)).toBe(first);
    expect(stepTheme(stepTheme(first, 1), -1)).toBe(first);
  });
});

describe("dimmed", () => {
  test("starts at exactly 30 minutes", () => {
    const last = 1000000000000;
    expect(dimmed(last + DIM_MS - 1, last)).toBe(false);
    expect(dimmed(last + DIM_MS, last)).toBe(true);
  });
});
