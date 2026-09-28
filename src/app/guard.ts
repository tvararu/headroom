export type Layout = "tiles" | "list";

export interface LayoutOverride {
  layout: Layout;
  until: number;
}

export const LAYOUT_SWAP_MS = 60000;
export const PIN_MS = 600000;
export const DIM_MS = 1800000;

export function layoutAt(now: number, override: LayoutOverride | null): Layout {
  if (override && now < override.until) return override.layout;
  return Math.floor(now / LAYOUT_SWAP_MS) % 2 === 0 ? "tiles" : "list";
}

export function pinLayout(now: number, layout: Layout): LayoutOverride {
  return { layout, until: now + PIN_MS };
}

export function dimmed(now: number, lastKeyAt: number): boolean {
  return now - lastKeyAt >= DIM_MS;
}
