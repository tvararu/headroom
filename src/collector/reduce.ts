import {
  type Alert,
  type HeadroomData,
  type LimitView,
  type ProviderView,
  providerName,
} from "../shared/schema";

export interface OmpLimit {
  id: string;
  label: string;
  scope: { sharedGroup?: string | null };
  window: {
    label: string;
    durationMs?: number | null;
    resetsAt?: number | null;
  };
  amount: { usedFraction: number };
  status: string;
}

export interface OmpReport {
  provider: string;
  fetchedAt: number;
  limits: OmpLimit[];
  metadata: {
    planType?: string | null;
    email?: string | null;
    accountId?: string | null;
    limitReached?: boolean;
  };
}

export interface OmpCapacity {
  window: string;
  meter?: string;
  accounts: number;
  usedAccounts: number;
}

export interface OmpUsage {
  generatedAt: number;
  reports: OmpReport[];
  capacity: Record<string, OmpCapacity[]>;
  disabledCredentials: { provider: string; disabledAtMs: number }[];
}

export interface OmpHistoryEntry {
  provider: string;
  email?: string | null;
  accountId?: string | null;
  limitId: string;
  usedFraction: number;
  recordedAt: number;
}

export interface OmpHistory {
  entries: OmpHistoryEntry[];
}

function identityKey(
  accountId: string | null | undefined,
  email: string | null | undefined,
): string {
  if (accountId != null) return accountId;
  if (email != null) return email;
  return "default";
}
const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
const HISTORY_MS = 7 * DAY_MS;
const MAX_POINTS = 168;

export function windowShort(window: OmpLimit["window"]): string {
  const ms = window.durationMs;
  if (ms == null) return window.label;
  return ms < DAY_MS
    ? `${Math.round(ms / HOUR_MS)}h`
    : `${Math.round(ms / DAY_MS)}d`;
}

const identity = (x: { accountId?: string | null; email?: string | null }) =>
  identityKey(x.accountId, x.email);

function historyFor(
  entries: OmpHistoryEntry[],
  nowMs: number,
): [number, number][] {
  const byHour = new Map<number, OmpHistoryEntry>();
  for (const e of entries) {
    if (e.recordedAt < nowMs - HISTORY_MS) continue;
    const hour = Math.floor(e.recordedAt / HOUR_MS);
    const prev = byHour.get(hour);
    if (!prev || e.recordedAt >= prev.recordedAt) byHour.set(hour, e);
  }
  return [...byHour.values()]
    .sort((a, b) => a.recordedAt - b.recordedAt)
    .slice(-MAX_POINTS)
    .map((e) => [e.recordedAt, e.usedFraction]);
}

export function reduce(
  usage: OmpUsage,
  history: OmpHistory,
  nowMs: number,
): HeadroomData {
  const entriesByLimit = new Map<string, OmpHistoryEntry[]>();
  for (const e of history.entries) {
    const k = `${e.provider}\n${identity(e)}\n${e.limitId}`;
    const list = entriesByLimit.get(k);
    if (list) list.push(e);
    else entriesByLimit.set(k, [e]);
  }

  const byProvider = new Map<string, { report: OmpReport; index: number }[]>();
  usage.reports.forEach((report, index) => {
    const list = byProvider.get(report.provider);
    if (list) list.push({ report, index });
    else byProvider.set(report.provider, [{ report, index }]);
  });

  const providers: ProviderView[] = [...byProvider.entries()].map(
    ([id, accounts]) => {
      const limits: LimitView[] = [];
      accounts.forEach(({ report, index }, n) => {
        const seen = new Set<string>();
        const account = identity(report.metadata);
        for (const limit of report.limits) {
          const group = limit.scope.sharedGroup;
          if (group != null) {
            if (seen.has(group)) continue;
            seen.add(group);
          }
          limits.push({
            key: `${index}:${limit.id}`,
            label:
              accounts.length > 1
                ? `acct ${n + 1} · ${limit.label}`
                : limit.label,
            windowShort: windowShort(limit.window),
            usedFraction: limit.amount.usedFraction,
            resetsAt: limit.window.resetsAt ?? null,
            status: limit.status,
            history: historyFor(
              entriesByLimit.get(`${id}\n${account}\n${limit.id}`) ?? [],
              nowMs,
            ),
          });
        }
      });
      return {
        id,
        name: providerName(id),
        plan: accounts[0]?.report.metadata.planType ?? null,
        fetchedAt: Math.max(...accounts.map((a) => a.report.fetchedAt)),
        limitReached: accounts.some(
          (a) => a.report.metadata.limitReached === true,
        ),
        limits,
        capacity: (usage.capacity[id] ?? []).map((c) => ({
          window: c.meter ? `${c.window} ${c.meter}` : c.window,
          used: c.usedAccounts,
          total: c.accounts,
        })),
      };
    },
  );
  providers.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const alerts: Alert[] = usage.disabledCredentials.map((d) => ({
    provider: d.provider,
    name: providerName(d.provider),
    kind: "disabled",
    sinceMs: d.disabledAtMs,
  }));

  return { version: 1, generatedAt: nowMs, providers, alerts };
}
