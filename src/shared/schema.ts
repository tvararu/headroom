export const SCHEMA_VERSION = 1;

export type Severity = "ok" | "warn" | "crit";

export interface HeadroomData {
  version: 1;
  generatedAt: number;
  providers: ProviderView[];
  alerts: Alert[];
}

export interface CapacityView {
  window: string;
  used: number;
  total: number;
}

export interface ProviderView {
  id: string;
  name: string;
  plan: string | null;
  fetchedAt: number;
  limitReached: boolean;
  limits: LimitView[];
  capacity: CapacityView[];
}

export interface LimitView {
  key: string;
  label: string;
  windowShort: string;
  usedFraction: number;
  resetsAt: number | null;
  status: string;
  history: [number, number][];
}

export interface Alert {
  provider: string;
  name: string;
  kind: "disabled";
  sinceMs: number;
}

const PROVIDER_NAMES: Record<string, string> = {
  anthropic: "Anthropic",
  "openai-codex": "OpenAI Codex",
  "google-antigravity": "Antigravity",
  "opencode-go": "OpenCode Go",
  "xai-oauth": "xAI",
};

export function providerName(id: string): string {
  return PROVIDER_NAMES[id] ?? id;
}
