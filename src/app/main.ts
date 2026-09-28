import type { HeadroomData } from "../shared/schema";
import { dimmed, layoutAt, pinLayout } from "./guard";
import type { Layout, LayoutOverride } from "./guard";
import {
  dataAge,
  freshness,
  mainRowsClass,
  renderAlerts,
  renderBarHtml,
  renderMain,
} from "./render";
import { applyTheme, loadTheme, saveTheme, stepTheme } from "./themes";
import { initScreenSaverBridge, loadJson, mapKey } from "./webos";

const RELOAD_MS = 15000;

let data: HeadroomData | null = null;
let layoutOverride: LayoutOverride | null = null;
let lastKeyAt = Date.now();
let layout: Layout = "tiles";
let theme = "vantablack";
let lastRenderMainKey = "";
let lastRenderAlertsKey = "";

function el(id: string): HTMLElement | null {
  return document.getElementById(id);
}

function clockText(now: Date): string {
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function renderMainKey(
  d: HeadroomData | null,
  lay: Layout,
  minute: number,
): string {
  return `${d ? String(d.generatedAt) : "none"}|${lay}|${minute}`;
}

function reload(): void {
  loadJson(`data/usage.json?_=${Date.now()}`)
    .then((parsed) => {
      const v = parsed as { version?: unknown };
      if (v && v.version === 1) data = parsed as HeadroomData;
    })
    .catch(() => {
      // keep previous data
    });
}

function tick(): void {
  const nowMs = Date.now();
  const now = new Date(nowMs);
  const root = el("root");
  const bar = el("bar");
  const alerts = el("alerts");
  const main = el("main");
  if (!root || !bar || !alerts || !main) return;

  const newLayout = layoutAt(nowMs, layoutOverride);
  if (
    newLayout !== layout ||
    root.classList.contains("list") !== (newLayout === "list")
  ) {
    layout = newLayout;
    if (layout === "list") root.classList.add("list");
    else root.classList.remove("list");
  }

  if (dimmed(nowMs, lastKeyAt)) root.classList.add("dim");
  else root.classList.remove("dim");

  const fresh = freshness(data ? dataAge(data) : null, nowMs);
  const freshCls =
    fresh.state === "live"
      ? "fresh-live"
      : fresh.state === "stale"
        ? "fresh-stale"
        : "fresh-crit";
  bar.innerHTML = renderBarHtml(
    layout,
    clockText(now),
    fresh.text,
    freshCls,
    theme,
  );

  const minute = Math.floor(nowMs / 60000);
  const mainKey = renderMainKey(data, layout, minute);
  if (mainKey !== lastRenderMainKey) {
    lastRenderMainKey = mainKey;
    main.innerHTML = renderMain(data, layout, nowMs);
    main.className = mainRowsClass(data ? data.providers.length : 0);
  }
  const alertsKey = `${data ? String(data.generatedAt) : "none"}|${minute}`;
  if (alertsKey !== lastRenderAlertsKey) {
    lastRenderAlertsKey = alertsKey;
    alerts.innerHTML = data ? renderAlerts(data.alerts) : "";
    alerts.style.display = data && data.alerts.length > 0 ? "" : "none";
  }
}

function onKey(e: KeyboardEvent): void {
  const nowMs = Date.now();
  if (dimmed(nowMs, lastKeyAt)) {
    lastKeyAt = nowMs;
    e.preventDefault();
    return;
  }
  lastKeyAt = nowMs;
  const action = mapKey(e.keyCode);
  if (action === null) return;
  if (action === "toggle" || action === "tiles" || action === "list") {
    const target =
      action === "toggle" ? (layout === "tiles" ? "list" : "tiles") : action;
    layoutOverride = pinLayout(nowMs, target);
    layout = layoutAt(nowMs, layoutOverride);
  } else if (action === "themeNext" || action === "themePrev") {
    theme = stepTheme(theme, action === "themeNext" ? 1 : -1);
    saveTheme(window.localStorage, theme);
    const root = document.documentElement;
    if (root) applyTheme(root, theme);
  } else if (action === "exit") {
    window.close();
  }
  tick();
}

function boot(): void {
  theme = loadTheme(window.localStorage);
  applyTheme(document.documentElement, theme);
  lastKeyAt = Date.now();
  layout = layoutAt(Date.now(), layoutOverride);
  if (layout === "list") {
    const r = document.getElementById("root");
    if (r) r.classList.add("list");
  }
  initScreenSaverBridge("org.vararu.headroom");
  document.addEventListener("keydown", onKey);
  reload();
  setInterval(reload, RELOAD_MS);
  tick();
  setInterval(tick, 1000);
}

if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", boot);
else boot();
