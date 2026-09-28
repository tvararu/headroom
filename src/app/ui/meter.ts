export function meter(frac: number, isUrgent: boolean): string {
  const width = (Math.min(Math.max(frac, 0), 1) * 100).toFixed(1);
  return (
    `<div class="${isUrgent ? "ui-meter is-urgent" : "ui-meter"}">` +
    `<div class="ui-meter-fill" style="width:${width}%"></div></div>`
  );
}
