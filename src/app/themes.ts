import { THEMES } from "./themes.generated";

export const THEME_NAMES: string[] = THEMES.map((t) => t.name);

export const VANTABLACK_VARS: Record<string, string> = {
  "--bg": "#000000",
  "--bg-alt": "#090909",
  "--fg": "#ffffff",
  "--fg-dim": "#505050",
  "--fg-bright": "#ffffff",
  "--accent": "#8d8d8d",
  "--muted": "#7a7a7a",
  "--border-idle": "#1a1a1a",
  "--ok": "#7a7a7a",
  "--warn": "#cecece",
  "--crit": "#ffffff",
};

const VAR_KEYS: [string, keyof (typeof THEMES)[0]["colors"]][] = [
  ["--bg", "background"],
  ["--bg-alt", "dark_background"],
  ["--fg", "foreground"],
  ["--fg-dim", "dark_foreground"],
  ["--fg-bright", "bright_foreground"],
  ["--accent", "accent"],
  ["--muted", "muted"],
  ["--border-idle", "selection"],
  ["--ok", "green"],
  ["--warn", "yellow"],
  ["--crit", "red"],
];

export function themeVars(name: string): Record<string, string> {
  if (name === "vantablack") return { ...VANTABLACK_VARS };
  const theme = THEMES.find((t) => t.name === name);
  if (!theme) return { ...VANTABLACK_VARS };
  const vars: Record<string, string> = {};
  for (const [cssVar, themeKey] of VAR_KEYS)
    vars[cssVar] = theme.colors[themeKey];
  return vars;
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

export function nextTheme(name: string): string {
  const i = THEMES.findIndex((t) => t.name === name);
  return THEMES[(i + 1 + THEMES.length) % THEMES.length].name;
}

export function applyTheme(
  el: { style: { setProperty(k: string, v: string): void } },
  name: string,
): void {
  const vars = themeVars(name);
  for (const key of Object.keys(vars)) el.style.setProperty(key, vars[key]);
}
