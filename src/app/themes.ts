import { THEMES } from "./themes.generated";

export const THEME_NAMES: string[] = THEMES.map((t) => t.name);

export const VANTABLACK_VARS: Record<string, string> = {
  "--bg": "#000000",
  "--fg": "#ffffff",
  "--fg-dim": "#505050",
  "--fg-rgb": "255, 255, 255",
  "--accent": "#8d8d8d",
  "--muted": "#7a7a7a",
  "--crit": "#ffffff",
};

const VAR_KEYS: [string, keyof (typeof THEMES)[0]["colors"]][] = [
  ["--bg", "background"],
  ["--fg", "foreground"],
  ["--fg-dim", "dark_foreground"],
  ["--accent", "accent"],
  ["--muted", "muted"],
  ["--crit", "red"],
];

export function themeVars(name: string): Record<string, string> {
  if (name === "vantablack") return { ...VANTABLACK_VARS };
  const theme = THEMES.find((t) => t.name === name);
  if (!theme) return { ...VANTABLACK_VARS };
  const vars: Record<string, string> = {};
  for (const [cssVar, themeKey] of VAR_KEYS) {
    const v = theme.colors[themeKey];
    if (v !== undefined) vars[cssVar] = v;
  }
  const fg = vars["--fg"];
  if (fg !== undefined) vars["--fg-rgb"] = hexToRgb(fg);
  return vars;
}

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

const STORAGE_KEY = "headroom.theme";

export function loadTheme(storage: Storage | null | undefined): string {
  try {
    const value = storage ? storage.getItem(STORAGE_KEY) : null;
    if (value && THEMES.some((t) => t.name === value)) return value;
  } catch {
    // storage unavailable
  }
  return "vantablack";
}

export function saveTheme(
  storage: Storage | null | undefined,
  name: string,
): void {
  try {
    if (storage) storage.setItem(STORAGE_KEY, name);
  } catch {
    // storage unavailable
  }
}

export function stepTheme(name: string, step: 1 | -1): string {
  const i = THEMES.findIndex((t) => t.name === name);
  const next = THEMES[(i + step + THEMES.length) % THEMES.length];
  return next === undefined ? "vantablack" : next.name;
}

export function applyTheme(
  el: { style: { setProperty(k: string, v: string): void } },
  name: string,
): void {
  const vars = themeVars(name);
  for (const key of Object.keys(vars)) {
    const v = vars[key];
    if (v !== undefined) el.style.setProperty(key, v);
  }
}
