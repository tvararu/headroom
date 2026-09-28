export function pct(f: number): string {
  return `${Math.round(f * 100)}%`;
}

export function urgent(usedFraction: number, status: string): boolean {
  return usedFraction >= 0.9 || status !== "ok";
}

export const HINT_VISIBLE_MS = 10000;

export function hintVisible(now: number, lastKeyAt: number): boolean {
  return now - lastKeyAt < HINT_VISIBLE_MS;
}

const MIN_MS = 60000;
const HOUR_MS = 3600000;
const DAY_MS = 86400000;

export function countdown(ms: number): string {
  if (ms <= 0) return "now";
  if (ms < HOUR_MS) return `${Math.floor(ms / MIN_MS)}m`;
  if (ms < DAY_MS)
    return `${Math.floor(ms / HOUR_MS)}h ${Math.floor((ms % HOUR_MS) / MIN_MS)}m`;
  return `${Math.floor(ms / DAY_MS)}d ${Math.floor((ms % DAY_MS) / HOUR_MS)}h`;
}

export function resetsText(resetsAt: number | null, now: number): string {
  if (resetsAt === null || resetsAt <= now) return "";
  return countdown(resetsAt - now);
}

export function age(ms: number): string {
  if (ms < MIN_MS) return "<1m";
  if (ms < HOUR_MS) return `${Math.floor(ms / MIN_MS)}m`;
  if (ms < DAY_MS) return `${Math.floor(ms / HOUR_MS)}h`;
  return `${Math.floor(ms / DAY_MS)}d`;
}
