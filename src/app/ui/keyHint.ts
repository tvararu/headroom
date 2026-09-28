import { esc } from "./esc";

export function keyHint(key: string, label: string): string {
  return `<span class="ui-key">${esc(key)}</span> ${esc(label)}`;
}

export function keyHints(show: boolean): string {
  const items = `${keyHint("\u25c0\u25b6", "theme")} \u00b7 ${keyHint("1 2", "view")} \u00b7 ${keyHint("OK", "toggle")}`;
  return `<span class="${show ? "ui-hint" : "ui-hint is-hidden"}">${items}</span>`;
}
