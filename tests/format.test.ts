import { describe, expect, test } from "bun:test";
import {
  age,
  countdown,
  hintVisible,
  HINT_VISIBLE_MS,
  pct,
  resetsText,
  urgent,
} from "../src/app/format";

describe("countdown", () => {
  test("zero or negative is now", () => {
    expect(countdown(0)).toBe("now");
    expect(countdown(-1000)).toBe("now");
  });
  test("59m boundary", () => {
    expect(countdown(59 * 60000)).toBe("59m");
  });
  test("1h switches to spaced hour format", () => {
    expect(countdown(3600000)).toBe("1h 0m");
    expect(countdown(3 * 3600000 + 49 * 60000)).toBe("3h 49m");
  });
  test("23h59m stays hour format", () => {
    expect(countdown(23 * 3600000 + 59 * 60000)).toBe("23h 59m");
  });
  test("1d switches to spaced day format", () => {
    expect(countdown(86400000)).toBe("1d 0h");
    expect(countdown(5 * 86400000 + 10 * 3600000)).toBe("5d 10h");
  });
});

describe("hintVisible", () => {
  test("shows for 10s after a key, then hides", () => {
    expect(HINT_VISIBLE_MS).toBe(10000);
    expect(hintVisible(9000, 0)).toBe(true);
    expect(hintVisible(9999, 0)).toBe(true);
    expect(hintVisible(10000, 0)).toBe(false);
    expect(hintVisible(50000, 40000)).toBe(false);
  });
});

describe("resetsText", () => {
  const now = 1000000000000;
  test("future reset reads just the countdown", () => {
    expect(resetsText(now + 2 * 3600000 + 3 * 60000, now)).toBe("2h 3m");
  });
  test("null or past reset shows nothing", () => {
    expect(resetsText(null, now)).toBe("");
    expect(resetsText(now, now)).toBe("");
    expect(resetsText(now - 1000, now)).toBe("");
  });
});

describe("urgent", () => {
  test("below threshold", () => {
    expect(urgent(0.8999, "ok")).toBe(false);
  });
  test("at threshold", () => {
    expect(urgent(0.9, "ok")).toBe(true);
  });
  test("non-ok status is urgent", () => {
    expect(urgent(0.1, "limited")).toBe(true);
  });
});

describe("pct and age", () => {
  test("pct rounds", () => {
    expect(pct(0.044)).toBe("4%");
    expect(pct(0.666)).toBe("67%");
  });
  test("age units", () => {
    expect(age(30000)).toBe("<1m");
    expect(age(4 * 60000)).toBe("4m");
    expect(age(2 * 3600000)).toBe("2h");
    expect(age(3 * 86400000)).toBe("3d");
  });
});
