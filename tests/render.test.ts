import { describe, expect, test } from "bun:test";
import type { HeadroomData, LimitView } from "../src/app/../shared/schema";
import {
  activeProvider,
  capacityText,
  esc,
  fmtUsed,
  freshness,
  renderMain,
  renderTiles,
  tileSpans,
  tileTitle,
} from "../src/app/render";

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

describe("escaping", () => {
  test("label html is escaped", () => {
    const d = sample();
    d.providers[0].limits = [limit({ label: "<img src=x onerror=alert(1)>" })];
    const html = renderTiles(d, Date.now());
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });
  test("esc covers quotes", () => {
    expect(esc(`a&<>"'`)).toBe("a&amp;&lt;&gt;&quot;&#39;");
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
});

describe("renderMain", () => {
  test("empty data state", () => {
    expect(renderMain(null, "tiles", Date.now())).toContain(
      "waiting for data from openhubris",
    );
    const d = sample();
    d.providers = [];
    expect(renderMain(d, "tiles", Date.now())).toContain(
      "waiting for data from openhubris",
    );
  });
  test("highest-usage tile gets the active class", () => {
    const html = renderTiles(sample(), Date.now());
    expect(html).toContain("tile tile-active");
    expect(html.indexOf("tile-active")).toBeLessThan(html.indexOf("Beta"));
  });
  test("activeProvider picks the provider with the max fraction", () => {
    expect(activeProvider(sample())).toBe("a");
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
    ).toBe("capacity 5h 0.05/1 \u00b7 7d 0.67/1 \u00b7 7d fable 0/1");
  });
});

describe("tileTitle", () => {
  test("omits plan when it equals the provider name", () => {
    expect(tileTitle("OpenCode Go", "OpenCode Go")).toBe("OpenCode Go");
    expect(tileTitle("OpenCode Go", "opencode go")).toBe("OpenCode Go");
    expect(tileTitle("OpenAI Codex", "prolite")).toBe(
      "OpenAI Codex \u00b7 prolite",
    );
    expect(tileTitle("xAI", null)).toBe("xAI");
  });
  test("renderTiles omits the redundant plan suffix", () => {
    const d = sample();
    d.providers[0].name = "OpenCode Go";
    d.providers[0].plan = "OpenCode Go";
    expect(renderTiles(d, Date.now())).not.toContain(
      "OpenCode Go \u00b7 OpenCode Go",
    );
  });
});
