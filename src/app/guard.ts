export type Layout = "tiles" | "list";

export interface LayoutOverride {
  layout: Layout;
  until: number;
}

export const LAYOUT_SWAP_MS = 600000;
export const DIM_MS = 1800000;
export const ORBIT: [number, number][] = [
  [0, 0],
  [6, 0],
  [6, 6],
  [0, 6],
  [-6, 6],
  [-6, 0],
  [-6, -6],
  [0, -6],
  [6, -6],
];

export function nextBoundary(now: number): number {
  return now - (now % LAYOUT_SWAP_MS) + LAYOUT_SWAP_MS;
}

export function layoutAt(now: number, override: LayoutOverride | null): Layout {
  if (override && now < override.until) return override.layout;
  return Math.floor(now / LAYOUT_SWAP_MS) % 2 === 0 ? "tiles" : "list";
}

export function toggleOverride(now: number, layout: Layout): LayoutOverride {
  return {
    layout: layout === "tiles" ? "list" : "tiles",
    until: nextBoundary(now),
  };
}

export function orbitAt(now: number): [number, number] {
  return ORBIT[Math.floor(now / 60000) % ORBIT.length];
}

export function dimmed(now: number, lastKeyAt: number): boolean {
  return now - lastKeyAt >= DIM_MS;
}
