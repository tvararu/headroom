import { describe, expect, test } from "bun:test";
import type { HeadroomData, LimitView, ProviderView } from "../shared/schema";
import {
  capacityText,
  dataAge,
  fmtUsed,
  freshness,
  labelSuffixes,
  mainRowsClass,
  planLine,
  renderMain,
  renderTiles,
  tileSpans,
} from "./render";
import { esc } from "./ui/esc";
import { hero } from "./ui/hero";
import { keyHint, keyHints } from "./ui/keyHint";
import { meter } from "./ui/meter";
import { panel } from "./ui/panel";
import { sectionHeader } from "./ui/sectionHeader";
import { separator } from "./ui/separator";
import { sparkline } from "./ui/sparkline";

function limit(over: Partial<LimitView> = {}): LimitView {
  return {
    key: "0:x",
    label: "main",
    windowShort: "5h",
    usedFraction: 0.5,
    resetsAt: null,
    status: "ok",
    history: [],
    ...over,
  };
}

function mustProvider(d: HeadroomData, i: number): ProviderView {
  const p = d.providers[i];
  if (!p) throw new Error("sample must have providers");
  return p;
}

function sample(): HeadroomData {
  const now = Date.now();
  return {
    version: 1,
    generatedAt: now - 120000,
    providers: [
      {
        id: "a",
        name: "Alpha",
        plan: "pro",
        fetchedAt: now,
        limitReached: false,
        limits: [
          limit({ label: "one", usedFraction: 0.9 }),
          limit({ label: "two", usedFraction: 0.2 }),
        ],
        capacity: [],
      },
      {
        id: "b",
        name: "Beta",
        plan: null,
        fetchedAt: now,
        limitReached: false,
        limits: [limit({ label: "three", usedFraction: 0.3 })],
        capacity: [],
      },
    ],
    alerts: [],
  };
}

describe("tileSpans", () => {
  test("rows sum to 60 for n=1..7", () => {
    for (let n = 1; n <= 7; n++) {
      for (const row of tileSpans(n)) {
        expect(row.reduce((a, b) => a + b, 0)).toBe(60);
      }
    }
  });
  test("n=2 is one row, n=5 is 3+2", () => {
    expect(tileSpans(2)).toHaveLength(1);
    expect(tileSpans(5).map((r) => r.length)).toEqual([3, 2]);
  });
});

describe("components escape data", () => {
  const evil = "<img src=x onerror=alert(1)>&\"'";
  test("esc covers quotes", () => {
    expect(esc(`a&<>"'`)).toBe("a&amp;&lt;&gt;&quot;&#39;");
  });
  test("panel, hero, header, meter, sparkline, keyHint escape", () => {
    expect(panel(evil, "")).toBe(`<section class="ui-panel">${evil}</section>`);
    const h = hero("", "<b>", evil, evil, false);
    expect(h).not.toContain("<b>");
    expect(h).toContain("&lt;b&gt;");
    expect(sectionHeader(evil)).toContain("&amp;");
    expect(meter(0.5, false)).toContain("width:50.0%");
    expect(sparkline([], 200, 20, false)).toBe(
      '<svg class="ui-spark" width="200" height="20" viewBox="0 0 200 20"></svg>',
    );
    expect(keyHint(evil, evil)).toContain("&lt;img");
    expect(keyHints(false)).toContain("is-hidden");
    expect(separator()).toBe('<div class="ui-sep"></div>');
  });
  test("label html is escaped", () => {
    const d = sample();
    const first = d.providers[0];
    if (!first) throw new Error("sample must have providers");
    first.limits = [limit({ label: "<img src=x onerror=alert(1)>" })];
    const html = renderTiles(d, Date.now());
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });
});

describe("freshness", () => {
  const now = 1000000000000;
  test("live at 14m59s, stale at 15m, crit at 60m", () => {
    expect(freshness(now - (15 * 60 - 1) * 1000, now).state).toBe("live");
    expect(freshness(now - 15 * 60 * 1000, now).state).toBe("stale");
    expect(freshness(now - 60 * 60 * 1000, now).state).toBe("crit");
  });
  test("waiting state with no data", () => {
    expect(freshness(null, now).text).toBe("waiting for data");
  });
  test("data age is the oldest provider fetch, not the push time", () => {
    const d = sample();
    d.generatedAt = now;
    const aged = d.providers[0];
    if (!aged) throw new Error("sample must have providers");
    aged.fetchedAt = now - 20 * 60 * 1000;
    expect(freshness(dataAge(d), now).state).toBe("stale");
  });
});

describe("renderMain", () => {
  test("empty data state", () => {
    expect(renderMain(null, "tiles", Date.now())).toContain("waiting for data");
    const d = sample();
    d.providers = [];
    expect(renderMain(d, "tiles", Date.now())).toContain("waiting for data");
  });
  test("urgent rows mark the percentage with a triangle", () => {
    const html = renderTiles(sample(), Date.now());
    expect(html).toContain("\u25b2 90%");
    expect(html).not.toContain("\u25b2 20%");
  });
});

describe("capacityText", () => {
  test("single prefix, 2-decimal trim", () => {
    expect(fmtUsed(0.3148328)).toBe("0.31");
    expect(fmtUsed(0.2)).toBe("0.2");
    expect(fmtUsed(0)).toBe("0");
    expect(
      capacityText([
        { window: "5h", used: 0.05, total: 1 },
        { window: "7d", used: 0.67, total: 1 },
        { window: "7d fable", used: 0, total: 1 },
      ]),
    ).toBe("5h 0.05/1 \u00b7 7d 0.67/1 \u00b7 7d fable 0/1");
  });
});

describe("planLine", () => {
  test("uses the plan when it differs from the name", () => {
    const p = mustProvider(sample(), 0);
    p.name = "OpenAI Codex";
    p.plan = "prolite";
    expect(planLine(p)).toBe("prolite");
  });
  test("falls back to the limit count when plan is missing or equals the name", () => {
    const p = mustProvider(sample(), 0);
    p.name = "OpenCode Go";
    p.plan = "opencode go";
    expect(planLine(p)).toBe("2 LIMITS");
    p.plan = null;
    expect(planLine(p)).toBe("2 LIMITS");
  });
});

describe("labelSuffixes", () => {
  test("only duplicate labels get their window", () => {
    expect(
      labelSuffixes([
        limit({ label: "Gemini", windowShort: "5h" }),
        limit({ label: "Gemini", windowShort: "7d" }),
        limit({ label: "Claude", windowShort: "7d" }),
      ]),
    ).toEqual(["5h", "7d", ""]);
  });
});

describe("mainRowsClass", () => {
  test("2 providers yield the one-row class", () => {
    expect(mainRowsClass(0)).toBe("rows-1");
    expect(mainRowsClass(1)).toBe("rows-1");
    expect(mainRowsClass(2)).toBe("rows-1");
    expect(mainRowsClass(3)).toBe("rows-2");
    expect(mainRowsClass(5)).toBe("rows-2");
  });
});
