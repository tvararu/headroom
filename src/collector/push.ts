import { APP_DIR, missingTvMessage, TV_ENV } from "../shared/app";
import { type OmpHistory, type OmpUsage, reduce } from "./reduce";

export interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

export type Runner = (cmd: string[], stdin?: string) => Promise<RunResult>;

const SSH_CMD = `d=${APP_DIR}/data; mkdir -p $d && cat > $d/usage.json.tmp && mv $d/usage.json.tmp $d/usage.json`;

export async function defaultRun(
  cmd: string[],
  stdin?: string,
): Promise<RunResult> {
  const proc = Bun.spawn(cmd, {
    stdin: stdin !== undefined ? Buffer.from(stdin) : undefined,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { code, stdout, stderr };
}

function failLine(text: string): string {
  const first = text.split("\n")[0];
  const line = (first ?? "").trim();
  return line === "" ? "invalid JSON" : line;
}

export async function main(
  argv: string[],
  run: Runner,
  tv: string | null = Bun.env[TV_ENV] ?? null, // eslint-disable-line
): Promise<number> {
  let out: string | null = null;
  let dryRun = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--out" && i + 1 < argv.length) {
      i++;
      out = argv[i] ?? null;
    } else if (argv[i] === "--dry-run") dryRun = true;
  }
  const [usageRes, historyRes] = await Promise.all([
    run(["omp", "usage", "--json"]),
    run(["omp", "usage", "--history", "--days", "7", "--json"]),
  ]);
  const firstBad = [usageRes, historyRes].find((r) => r.code !== 0);
  if (firstBad) {
    console.error(`headroom: omp usage failed: ${failLine(firstBad.stderr)}`);
    return 1;
  }
  let usage: OmpUsage;
  let history: OmpHistory;
  try {
    usage = JSON.parse(usageRes.stdout);
    history = JSON.parse(historyRes.stdout);
  } catch {
    console.error("headroom: omp usage failed: invalid JSON");
    return 1;
  }
  const data = reduce(usage, history, Date.now());
  const json = JSON.stringify(data);
  if (out) await Bun.write(out, json);
  if (dryRun || out) {
    const limits = data.providers.reduce((n, p) => n + p.limits.length, 0);
    console.log(
      `providers=${data.providers.length} limits=${limits} alerts=${data.alerts.length} bytes=${Buffer.byteLength(json)}`,
    );
    return 0;
  }
  if (!tv) {
    console.error(missingTvMessage());
    return 2;
  }
  const push = await run(
    ["ssh", "-o", "ConnectTimeout=10", "-o", "BatchMode=yes", tv, SSH_CMD],
    json,
  );
  if (push.code === 255) {
    console.error("headroom: tv unreachable, skipped");
    return 0;
  }
  if (push.code !== 0) {
    console.error(`headroom: push failed (ssh exit ${push.code})`);
    return 1;
  }
  return 0;
}

if (import.meta.main) {
  process.exit(await main(process.argv.slice(2), defaultRun));
}
