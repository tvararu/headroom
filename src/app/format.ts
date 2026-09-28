export function pct(f: number): string {
  return `${Math.round(f * 100)}%`;
}

export type Severity = "ok" | "warn" | "crit";

export function severity(usedFraction: number, status: string): Severity {
  if (status !== "ok") return "crit";
  if (usedFraction >= 0.85) return "crit";
  if (usedFraction >= 0.6) return "warn";
  return "ok";
}

const MIN_MS = 60000;
const HOUR_MS = 3600000;
const DAY_MS = 86400000;

export function countdown(resetsAt: number | null, now: number): string {
  if (resetsAt === null) return "—";
  const ms = resetsAt - now;
  if (ms <= 0) return "now";
  if (ms < HOUR_MS) return `${Math.floor(ms / MIN_MS)}m`;
  if (ms < DAY_MS)
    return `${Math.floor(ms / HOUR_MS)}h${Math.floor((ms % HOUR_MS) / MIN_MS)}m`;
  return `${Math.floor(ms / DAY_MS)}d${Math.floor((ms % DAY_MS) / HOUR_MS)}h`;
}

export function age(ms: number): string {
  if (ms < MIN_MS) return "<1m";
  if (ms < HOUR_MS) return `${Math.floor(ms / MIN_MS)}m`;
  if (ms < DAY_MS) return `${Math.floor(ms / HOUR_MS)}h`;
  return `${Math.floor(ms / DAY_MS)}d`;
}
