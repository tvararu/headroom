import { describe, expect, test } from "bun:test";
import { age, countdown, pct, severity } from "../src/app/format";

describe("countdown", () => {
  const now = 1000000000000;
  test("null resetsAt", () => {
    expect(countdown(null, now)).toBe("—");
  });
  test("past time is now", () => {
    expect(countdown(now - 1000, now)).toBe("now");
    expect(countdown(now, now)).toBe("now");
  });
  test("59m boundary", () => {
    expect(countdown(now + 59 * 60000, now)).toBe("59m");
  });
  test("1h switches to hour format", () => {
    expect(countdown(now + 3600000, now)).toBe("1h0m");
    expect(countdown(now + 3 * 3600000 + 49 * 60000, now)).toBe("3h49m");
  });
  test("23h59m stays hour format", () => {
    expect(countdown(now + 23 * 3600000 + 59 * 60000, now)).toBe("23h59m");
  });
  test("1d switches to day format", () => {
    expect(countdown(now + 86400000, now)).toBe("1d0h");
    expect(countdown(now + 5 * 86400000 + 10 * 3600000, now)).toBe("5d10h");
  });
});

describe("severity", () => {
  test("below warn", () => {
    expect(severity(0.5999, "ok")).toBe("ok");
  });
  test("warn threshold", () => {
    expect(severity(0.6, "ok")).toBe("warn");
  });
  test("below crit", () => {
    expect(severity(0.8499, "ok")).toBe("warn");
  });
  test("crit threshold", () => {
    expect(severity(0.85, "ok")).toBe("crit");
  });
  test("non-ok status is crit", () => {
    expect(severity(0.1, "limited")).toBe("crit");
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
