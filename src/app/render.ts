import type {
  Alert,
  HeadroomData,
  LimitView,
  ProviderView,
} from "../shared/schema";
import { age, countdown, pct, resetsText, urgent } from "./format";
import { esc } from "./ui/esc";
import { hero } from "./ui/hero";
import { keyHints } from "./ui/keyHint";
import { meter } from "./ui/meter";
import { panel } from "./ui/panel";
import { sectionHeader } from "./ui/sectionHeader";
import { separator } from "./ui/separator";
import { sparkline } from "./ui/sparkline";

export const GRID_COLS = 60;
export const FRESH_STALE_MS = 900000;
export const FRESH_CRIT_MS = 3600000;

export function tileSpans(n: number): number[][] {
  if (n <= 0) return [];
  if (n <= 2) {
    const spans: number[] = [];
    const base = Math.floor(GRID_COLS / n);
    for (let i = 0; i < n; i++)
      spans.push(base + (i < GRID_COLS - base * n ? 1 : 0));
    return [spans];
  }
  const row1 = Math.ceil(n / 2);
  const widths = (count: number): number[] => {
    const spans: number[] = [];
    const base = Math.floor(GRID_COLS / count);
    for (let i = 0; i < count; i++)
      spans.push(base + (i < GRID_COLS - base * count ? 1 : 0));
    return spans;
  };
  return [widths(row1), widths(n - row1)];
}

export type FreshState = "live" | "stale" | "crit";

export function dataAge(data: HeadroomData): number {
  return data.providers.reduce(
    (oldest, p) => Math.min(oldest, p.fetchedAt),
    data.generatedAt,
  );
}

export function freshness(
  generatedAt: number | null,
  now: number,
): { state: FreshState; text: string } {
  if (generatedAt === null) return { state: "live", text: "waiting for data" };
  const ms = now - generatedAt;
  if (ms >= FRESH_CRIT_MS) return { state: "crit", text: `stale ${age(ms)}` };
  if (ms >= FRESH_STALE_MS) return { state: "stale", text: `stale ${age(ms)}` };
  return { state: "live", text: `live ${age(ms)}` };
}

export function renderBarHtml(
  layout: "tiles" | "list",
  clock: string,
  fresh: string,
  freshCls: string,
  theme: string,
  hint: boolean,
): string {
  const chip1 = layout === "tiles" ? "ui-view is-on" : "ui-view";
  const chip2 = layout === "list" ? "ui-view is-on" : "ui-view";
  return (
    '<div class="ui-bar-left"><span class="ui-logo">\u2582\u2584\u2586</span><span class="ui-brand">headroom</span>' +
    '<span class="' +
    chip1 +
    '">1</span><span class="' +
    chip2 +
    '">2</span>' +
    keyHints(hint) +
    '</div><div class="ui-bar-center"><span class="ui-clock">' +
    esc(clock) +
    "</span></div>" +
    '<div class="ui-bar-right"><span class="ui-fresh ' +
    freshCls +
    '">\u25cf ' +
    esc(fresh) +
    "</span>" +
    '<span class="ui-theme">' +
    esc(theme) +
    "</span></div>"
  );
}

export function renderAlerts(alerts: Alert[]): string {
  return alerts
    .map(
      (a) =>
        '<div class="ui-alert">\u25b2 ' +
        esc(a.name) +
        ": account disabled " +
        esc(age(Date.now() - a.sinceMs)) +
        " ago \u00b7 re-login in omp</div>",
    )
    .join("");
}
export function fmtUsed(used: number): string {
  const rounded = Math.round(used * 100) / 100;
  return String(rounded);
}
export function capacityText(
  capacity: { window: string; used: number; total: number }[],
): string {
  return capacity
    .map((c) => `${c.window} ${fmtUsed(c.used)}/${c.total}`)
    .join(" \u00b7 ");
}

const MARK_SVGS = [
  "anthropic",
  "openai-codex",
  "google-antigravity",
  "xai-oauth",
];
const MARK_FILES: Record<string, string> = {
  "google-antigravity": "google-antigravity",
  "xai-oauth": "xai",
};
const MARK_GLYPHS: Record<string, string> = {
  "opencode-go": "\u{f018d}",
};
const DEFAULT_GLYPH = "\u{f06a9}";

function mark(id: string): string {
  if (MARK_SVGS.indexOf(id) >= 0)
    return `<img class="ui-hero-mark" src="marks/${esc(MARK_FILES[id] || id)}.svg" alt="">`;
  return `<span class="ui-hero-mark ui-glyph">${MARK_GLYPHS[id] || DEFAULT_GLYPH}</span>`;
}

export function planLine(p: ProviderView): string {
  if (p.plan && p.plan.toLowerCase() !== p.name.toLowerCase()) return p.plan;
  return `${p.limits.length} LIMITS`;
}

export function labelSuffixes(limits: LimitView[]): string[] {
  return limits.map((l) =>
    limits.some((o) => o !== l && o.label === l.label) ? l.windowShort : "",
  );
}

function tileHero(p: ProviderView): string {
  return hero(
    mark(p.id),
    p.name,
    planLine(p),
    p.limitReached ? "LIMIT" : "",
    false,
  );
}

function listHero(p: ProviderView): string {
  return hero(
    mark(p.id),
    p.name,
    planLine(p),
    p.limitReached ? "LIMIT" : "",
    true,
  );
}

function labelHtml(l: LimitView, suffix: string): string {
  return (
    esc(l.label) +
    (suffix ? `<span class="ui-dim"> \u00b7 ${esc(suffix)}</span>` : "")
  );
}

function limitRow(l: LimitView, suffix: string, now: number): string {
  const isUrgent = urgent(l.usedFraction, l.status);
  const resets = resetsText(l.resetsAt, now);
  const cls = isUrgent ? "ui-limit is-urgent" : "ui-limit";
  const pctText = (isUrgent ? "\u25b2 " : "") + pct(l.usedFraction);
  return (
    `<div class="${cls}"><div class="ui-row1"><span class="ui-label">` +
    labelHtml(l, suffix) +
    "</span>" +
    (resets === "" ? "" : `<span class="ui-reset">${esc(resets)}</span>`) +
    '<span class="ui-pct">' +
    esc(pctText) +
    "</span></div>" +
    '<div class="ui-row2">' +
    meter(l.usedFraction, isUrgent) +
    sparkline(l.history, 140, 20, isUrgent) +
    "</div></div>"
  );
}

export function renderTiles(data: HeadroomData, now: number): string {
  const spans = ([] as number[]).concat(...tileSpans(data.providers.length));
  return data.providers
    .map((p, i) => {
      const suffixes = labelSuffixes(p.limits);
      return panel(
        tileHero(p) +
          separator() +
          sectionHeader("LIMITS") +
          '<div class="ui-limits">' +
          p.limits.map((l, j) => limitRow(l, suffixes[j] ?? "", now)).join("") +
          "</div>" +
          (p.capacity.length > 0
            ? `<div class="ui-foot">${esc(capacityText(p.capacity))}</div>`
            : ""),
        `grid-column: span ${spans[i]}`,
      );
    })
    .join("");
}

export function renderList(data: HeadroomData, now: number): string {
  const parts: string[] = ['<div class="ui-list">'];
  data.providers.forEach((p, i) => {
    if (i > 0) parts.push(separator());
    parts.push(listHero(p));
    const suffixes = labelSuffixes(p.limits);
    p.limits.forEach((l, j) => {
      const isUrgent = urgent(l.usedFraction, l.status);
      const cls = isUrgent ? " is-urgent" : "";
      const showReset = l.resetsAt !== null && l.resetsAt > now;
      const pctText = (isUrgent ? "\u25b2 " : "") + pct(l.usedFraction);
      parts.push(
        '<div class="ui-lrow"><div class="ui-label">' +
          labelHtml(l, suffixes[j] ?? "") +
          `</div><div class="ui-lmeter${cls}">` +
          meter(l.usedFraction, isUrgent) +
          `</div><div class="ui-pct${cls}">` +
          esc(pctText) +
          '</div><div class="ui-reset">' +
          (showReset ? esc(countdown((l.resetsAt as number) - now)) : "") +
          "</div>" +
          sparkline(l.history, 140, 24, isUrgent) +
          "</div>",
      );
    });
  });
  parts.push("</div>");
  return panel(parts.join(""), "");
}

export function mainRowsClass(count: number): string {
  return count <= 2 ? "rows-1" : "rows-2";
}

export function renderMain(
  data: HeadroomData | null,
  layout: "tiles" | "list",
  now: number,
): string {
  if (!data || data.providers.length === 0) {
    return '<div class="ui-empty">headroom \u00b7 waiting for data</div>';
  }
  if (layout === "list") return renderList(data, now);
  return renderTiles(data, now);
}
