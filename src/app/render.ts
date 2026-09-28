import type {
  Alert,
  HeadroomData,
  LimitView,
  ProviderView,
} from "../shared/schema";
import { age, countdown, pct, severity } from "./format";

export const GRID_COLS = 60;
export const FRESH_STALE_MS = 900000;
export const FRESH_CRIT_MS = 3600000;

export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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

export function activeProvider(data: HeadroomData): string | null {
  let best: string | null = null;
  let bestFrac = -1;
  for (const p of data.providers) {
    for (const l of p.limits) {
      if (l.usedFraction > bestFrac) {
        bestFrac = l.usedFraction;
        best = p.id;
      }
    }
  }
  return best;
}

export type FreshState = "live" | "stale" | "crit";

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

export function sparkline(
  history: [number, number][],
  width: number,
  height: number,
  cls: string,
): string {
  if (history.length < 2)
    return (
      '<svg class="' +
      cls +
      '" width="' +
      width +
      '" height="' +
      height +
      '"></svg>'
    );
  const start = history[0][0];
  const end = history[history.length - 1][0];
  const span = Math.max(end - start, 1);
  const pts: string[] = [];
  for (const [t, f] of history) {
    const x = ((t - start) / span) * width;
    const y = height - Math.min(Math.max(f, 0), 1) * height;
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  const frac = history[history.length - 1][1];
  const sev = severity(frac, "ok");
  const d = `M0,${height} L${pts.join(" L")} L${width},${height} Z`;
  return (
    '<svg class="' +
    cls +
    '" width="' +
    width +
    '" height="' +
    height +
    '" viewBox="0 0 ' +
    width +
    " " +
    height +
    '">' +
    '<path class="area sev-fill-' +
    sev +
    '" d="' +
    d +
    '"></path>' +
    '<path class="stroke sev-stroke-' +
    sev +
    '" d="M' +
    pts.join(" L") +
    '"></path>' +
    "</svg>"
  );
}

export function renderBarHtml(
  layout: "tiles" | "list",
  clock: string,
  fresh: string,
  freshCls: string,
  theme: string,
): string {
  const chip1 = layout === "tiles" ? "chip on" : "chip";
  const chip2 = layout === "list" ? "chip on" : "chip";
  return (
    '<div class="bar-left"><span class="logo">\u25ae\u25ae\u25ae</span><span class="brand">headroom</span>' +
    '<span class="' +
    chip1 +
    '">1</span><span class="' +
    chip2 +
    '">2</span></div>' +
    '<div class="bar-center"><span class="clock">' +
    esc(clock) +
    "</span></div>" +
    '<div class="bar-right"><span class="fresh ' +
    freshCls +
    '">\u25cf ' +
    esc(fresh) +
    "</span>" +
    '<span class="theme">' +
    esc(theme) +
    "</span></div>"
  );
}

export function renderAlerts(alerts: Alert[]): string {
  return alerts
    .map(
      (a) =>
        '<div class="alert">\u25b2 ' +
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
  return (
    "capacity " +
    capacity
      .map((c) => `${c.window} ${fmtUsed(c.used)}/${c.total}`)
      .join(" \u00b7 ")
  );
}

export function tileTitle(name: string, plan: string | null): string {
  if (!plan || plan.toLowerCase() === name.toLowerCase()) return name;
  return `${name} \u00b7 ${plan}`;
}

function limitRowTiles(limit: LimitView, now: number): string {
  const sev = severity(limit.usedFraction, limit.status);
  return (
    '<div class="limit"><div class="limit-top">' +
    '<span class="wchip">' +
    esc(limit.windowShort) +
    "</span>" +
    '<span class="llabel">' +
    esc(limit.label) +
    "</span>" +
    '<span class="lpct sev-' +
    sev +
    '">' +
    pct(limit.usedFraction) +
    "</span>" +
    '<span class="lcd">' +
    esc(countdown(limit.resetsAt, now)) +
    "</span>" +
    "</div>" +
    '<div class="limit-bottom"><div class="track"><div class="fill sev-' +
    sev +
    '" style="width:' +
    pct(limit.usedFraction) +
    '"></div></div>' +
    sparkline(limit.history, 200, 40, "spark") +
    "</div></div>"
  );
}

export function renderTiles(data: HeadroomData, now: number): string {
  const spans = tileSpans(data.providers.length);
  const active = activeProvider(data);
  const flat: { provider: ProviderView; span: number }[] = [];
  for (let r = 0; r < spans.length; r++) {
    for (let c = 0; c < spans[r].length; c++) {
      const p = data.providers[flat.length];
      if (p) flat.push({ provider: p, span: spans[r][c] });
    }
  }
  return flat
    .map(({ provider: p, span }) => {
      const cls = p.id === active ? "tile tile-active" : "tile";
      const limits = p.limits.map((l) => limitRowTiles(l, now)).join("");
      const cap = p.capacity.length > 0 ? capacityText(p.capacity) : "";
      const flag = p.limitReached
        ? ' <span class="limitflag">LIMIT</span>'
        : "";
      const title = esc(tileTitle(p.name, p.plan)) + flag;
      return (
        '<section class="' +
        cls +
        '" style="grid-column: span ' +
        span +
        '">' +
        '<div class="tile-title"><span>' +
        title +
        "</span></div>" +
        '<div class="tile-body">' +
        limits +
        "</div>" +
        (cap ? `<div class="tile-foot">${esc(cap)}</div>` : "") +
        "</section>"
      );
    })
    .join("");
}

export function renderList(data: HeadroomData, now: number): string {
  const rows: string[] = ['<table class="list">'];
  let first = true;
  for (const p of data.providers) {
    let providerCell = true;
    for (const l of p.limits) {
      const sev = severity(l.usedFraction, l.status);
      const filled = Math.round(l.usedFraction * 40);
      const bar =
        "\u2588".repeat(Math.min(filled, 40)) +
        "\u2591".repeat(Math.max(40 - filled, 0));
      rows.push(
        "<tr" +
          (providerCell && !first ? ' class="group"' : "") +
          "><td>" +
          esc(providerCell ? tileTitle(p.name, p.plan) : "") +
          "</td>" +
          '<td><span class="wchip">' +
          esc(l.windowShort) +
          "</span></td>" +
          '<td class="tlabel">' +
          esc(l.label) +
          "</td>" +
          '<td class="tbar sev-' +
          sev +
          '">' +
          esc(bar) +
          "</td>" +
          '<td class="sev-' +
          sev +
          '">' +
          pct(l.usedFraction) +
          "</td>" +
          "<td>" +
          esc(countdown(l.resetsAt, now)) +
          "</td>" +
          "<td>" +
          sparkline(l.history, 240, 24, "spark") +
          "</td></tr>",
      );
      providerCell = false;
    }
    first = false;
  }
  rows.push("</table>");
  return rows.join("");
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
    return '<div class="empty">headroom \u00b7 waiting for data from openhubris</div>';
  }
  if (layout === "list") return renderList(data, now);
  return renderTiles(data, now);
}
