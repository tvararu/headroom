export function sparkline(
  history: [number, number][],
  width: number,
  height: number,
  isUrgent: boolean,
): string {
  const open =
    `<svg class="${isUrgent ? "ui-spark is-urgent" : "ui-spark"}" width="` +
    `${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  if (history.length < 2) return `${open}</svg>`;
  const start = history[0][0];
  const span = Math.max(history[history.length - 1][0] - start, 1);
  const pts: string[] = [];
  for (const [t, f] of history) {
    const x = ((t - start) / span) * width;
    const y = 1 + (height - 2) * (1 - Math.min(Math.max(f, 0), 1));
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  const line = pts.join(" L");
  return (
    `${open}<path class="ui-spark-area" d="M0,${height} L${line} L${width},${height} Z"></path>` +
    `<path class="ui-spark-stroke" d="M${line}"></path></svg>`
  );
}
