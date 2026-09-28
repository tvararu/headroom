import { esc } from "./esc";

export function sectionHeader(text: string): string {
  return `<div class="ui-section">${esc(text)}</div>`;
}
