import { esc } from "./esc";

export function hero(
  markHtml: string,
  title: string,
  meta: string,
  badge: string,
  small: boolean,
): string {
  const badgeHtml =
    badge === "" ? "" : ` <span class="ui-hero-badge">${esc(badge)}</span>`;
  return (
    `<div class="${small ? "ui-hero small" : "ui-hero"}">${markHtml}` +
    `<div class="ui-hero-text"><div class="ui-hero-title">${esc(title)}${badgeHtml}</div>` +
    `<div class="ui-hero-meta">${esc(meta)}</div></div></div>`
  );
}
