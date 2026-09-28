export function panel(inner: string, style: string): string {
  return style === ""
    ? `<section class="ui-panel">${inner}</section>`
    : `<section class="ui-panel" style="${style}">${inner}</section>`;
}
