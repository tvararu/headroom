import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { type OmpHistory, type OmpUsage, reduce, windowShort } from "./reduce";

const dir = join(import.meta.dir, "fixtures");
const usage: OmpUsage = await Bun.file(join(dir, "usage.json")).json();
const history: OmpHistory = await Bun.file(join(dir, "history.json")).json();
const NOW = usage.generatedAt as unknown as number;
const data = reduce(usage, history, NOW);
const flat = JSON.stringify(data);
const byId = (id: string) => {
  const p = data.providers.find((p) => p.id === id);
  if (!p) throw new Error(`missing provider ${id}`);
  return p;
};

describe("dedupe and counts", () => {
  test("antigravity yields 4 limits after shared-group dedupe", () => {
    expect(
      byId("google-antigravity").limits.map((l) =>
        l.key.split(":").slice(1).join(":"),
      ),
    ).toEqual([
      "google-antigravity:google:default:gemini-5h",
      "google-antigravity:google:default:gemini-weekly",
      "google-antigravity:anthropic:default:3p-weekly",
      "google-antigravity:anthropic:default:3p-5h",
    ]);
  });

  test("total limit count matches", () => {
    expect(data.providers.reduce((n, p) => n + p.limits.length, 0)).toBe(16);
  });

  test("providers are sorted by id", () => {
    expect(data.providers.map((p) => p.id)).toEqual(
      [...data.providers.map((p) => p.id)].sort(),
    );
  });
});

describe("identity stripping", () => {
  test("serialised output contains no @ and none of the fixture identity constants", () => {
    expect(flat).not.toContain("@");
    for (const id of [
      "acct-a",
      "acct-b",
      "acct-c",
      "acct-d",
      "acct-e",
      "acct-f",
      "acct-z",
      "org-",
      "key-",
      "project-",
    ]) {
      expect(flat).not.toContain(id);
    }
  });

  test("alerts carry no cause text", () => {
    expect(data.alerts).toHaveLength(1);
    expect(flat).not.toContain("oauth refresh failed");
    expect(flat).not.toContain("cause");
    expect(data.alerts[0]).toEqual({
      provider: "anthropic",
      name: "Anthropic",
      kind: "disabled",
      sinceMs: expect.any(Number),
    });
  });
});

describe("history", () => {
  test("points are ascending, within 7 days, at most one per hour and at most 168", () => {
    const cutoff = NOW - 7 * 24 * 3_600_000;
    let nonEmpty = 0;
    for (const p of data.providers) {
      for (const l of p.limits) {
        const ts = l.history.map(([t]) => t);
        expect([...ts].sort((a, b) => a - b)).toEqual(ts);
        for (const t of ts) expect(t).toBeGreaterThanOrEqual(cutoff);
        expect(new Set(ts.map((t) => Math.floor(t / 3_600_000))).size).toBe(
          ts.length,
        );
        expect(ts.length).toBeLessThanOrEqual(168);
        if (ts.length > 0) nonEmpty++;
      }
    }
    expect(nonEmpty).toBeGreaterThan(0);
  });

  test(":daily entries are dropped", () => {
    expect(history.entries.some((e) => e.limitId.endsWith(":daily"))).toBe(
      true,
    );
    const extra: OmpHistory = {
      entries: [
        ...history.entries,
        {
          provider: "anthropic",
          email: "acct-a@example.test",
          accountId: "acct-a",
          limitId: "anthropic:daily",
          usedFraction: 0.99,
          recordedAt: NOW,
        },
      ],
    };
    expect(reduce(usage, extra, NOW)).toEqual(data);
  });
});

describe("labels and windows", () => {
  test("multi-account labels get the acct N prefix", () => {
    expect(byId("openai-codex").limits.map((l) => l.label)).toEqual([
      "acct 1 · 7 days",
      "acct 2 · 7 days",
    ]);
    expect(
      byId("anthropic").limits.every((l) => !l.label.startsWith("acct")),
    ).toBe(true);
  });

  test("windowShort maps durations", () => {
    expect(windowShort({ label: "x", durationMs: 18000000 })).toBe("5h");
    expect(windowShort({ label: "x", durationMs: 604800000 })).toBe("7d");
    expect(windowShort({ label: "Monthly" })).toBe("Monthly");
  });

  test("capacity windows include the meter", () => {
    expect(byId("openai-codex").capacity).toEqual([
      { window: "7d chat", used: 0.84, total: 2 },
    ]);
    expect(byId("xai-oauth").capacity).toEqual([
      { window: "7d", used: 0.12, total: expect.any(Number) },
    ]);
  });
});
