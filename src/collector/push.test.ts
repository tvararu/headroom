import { describe, expect, test } from "bun:test";
import { missingTvMessage } from "../shared/app";
import { main, type Runner, type RunResult } from "./push";

const ok = (stdout: string): RunResult => ({ code: 0, stdout, stderr: "" });
const minimal: [string, string] = [
  JSON.stringify({ reports: [], capacity: {}, disabledCredentials: [] }),
  JSON.stringify({ entries: [] }),
];

function runnerFor(
  sshCode: number,
  ompCode = 0,
): { calls: string[][]; run: Runner } {
  const calls: string[][] = [];
  const run: Runner = async (cmd, stdin) => {
    calls.push(cmd);
    if (cmd[0] === "omp")
      return ompCode === 0
        ? ok(cmd.includes("--history") ? minimal[1] : minimal[0])
        : { code: 1, stdout: "", stderr: "boom\nsecond" };
    void stdin;
    return { code: sshCode, stdout: "", stderr: "" };
  };
  return { calls, run };
}

describe("push exit policy", () => {
  test("ssh 255 exits 0 with the skip message", async () => {
    const { run } = runnerFor(255);
    const err: string[] = [];
    const orig = console.error;
    console.error = (m: string) => void err.push(m);
    try {
      expect(await main([], run, "tv")).toBe(0);
    } finally {
      console.error = orig;
    }
    expect(err).toEqual(["headroom: tv unreachable, skipped"]);
  });

  test("ssh 1 exits 1", async () => {
    const { run } = runnerFor(1);
    const err: string[] = [];
    const orig = console.error;
    console.error = (m: string) => void err.push(m);
    try {
      expect(await main([], run, "tv")).toBe(1);
    } finally {
      console.error = orig;
    }
    expect(err).toEqual(["headroom: push failed (ssh exit 1)"]);
  });

  test("omp non-zero exits 1 with no ssh call", async () => {
    const { calls, run } = runnerFor(0, 1);
    const err: string[] = [];
    const orig = console.error;
    console.error = (m: string) => void err.push(m);
    try {
      expect(await main([], run, "tv")).toBe(1);
    } finally {
      console.error = orig;
    }
    expect(err).toEqual(["headroom: omp usage failed: boom"]);
    expect(calls.every((c) => c[0] !== "ssh")).toBe(true);
  });

  test("--dry-run makes no ssh call", async () => {
    const { calls, run } = runnerFor(0);
    expect(await main(["--dry-run"], run, "tv")).toBe(0);
    expect(calls.every((c) => c[0] !== "ssh")).toBe(true);
  });

  test("missing TV target exits 2 with a setup hint", async () => {
    const { calls, run } = runnerFor(0);
    const err: string[] = [];
    const orig = console.error;
    console.error = (m: string) => void err.push(m);
    try {
      expect(await main([], run, null)).toBe(2);
    } finally {
      console.error = orig;
    }
    expect(err).toEqual([missingTvMessage()]);
    expect(calls.every((c) => c[0] !== "ssh")).toBe(true);
  });
});
