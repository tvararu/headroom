import { readdirSync } from "node:fs";

const APP_ID = "org.vararu.headroom";
const TEMP = "/media/developer/temp";

// luna-send prints nothing when its stdin or stdout is the ssh channel itself.
function luna(uri: string, payload: object, until?: string): string {
  const json = JSON.stringify(payload).replace(/'/g, "'\\''");
  if (!until) {
    return `luna-send -n 1 -w 60000 luna://${uri} '${json}' </dev/null 2>&1 | cat`;
  }
  const log = "/tmp/headroom-luna.log";
  return [
    `luna-send -n 1000 -w 120000 luna://${uri} '${json}' </dev/null >${log} 2>&1 & pid=$!`,
    `i=0; while [ $i -lt 120 ] && ! grep -qE '${until}' ${log}; do sleep 1; i=$((i+1)); done`,
    `kill $pid 2>/dev/null; grep -m1 -E '${until}' ${log}; rm -f ${log}`,
  ].join("; ");
}

async function sh(cmd: string[]): Promise<string> {
  const proc = Bun.spawn(cmd, { stdout: "pipe", stderr: "inherit" });
  const out = await new Response(proc.stdout).text();
  if ((await proc.exited) !== 0) {
    throw new Error(`tv: ${cmd.slice(0, 2).join(" ")} failed`);
  }
  return out;
}

async function deploy(): Promise<void> {
  const ipk = readdirSync("build").find((f) => f.endsWith(".ipk"));
  if (!ipk) throw new Error("tv: no .ipk in build/, run mise package");
  await sh(["scp", "-q", `build/${ipk}`, `tv:${TEMP}/${ipk}`]);
  try {
    const out = await sh([
      "ssh",
      "tv",
      luna(
        "com.webos.appInstallService/dev/install",
        { id: APP_ID, ipkUrl: `${TEMP}/${ipk}`, subscribe: true },
        '"state":"(installed|install failed)"|"returnValue":false',
      ),
    ]);
    if (!out.includes('"state":"installed"')) {
      throw new Error(`tv: install did not report installed:\n${out}`);
    }
  } finally {
    await sh(["ssh", "tv", `rm -f ${TEMP}/${ipk}`]).catch(() => {});
  }
  console.log(`installed ${ipk}`);
}

async function launch(): Promise<void> {
  const out = await sh([
    "ssh",
    "tv",
    luna("com.webos.applicationManager/launch", { id: APP_ID }),
  ]);
  if (!out.includes('"returnValue":true')) {
    throw new Error(`tv: launch failed: ${out}`);
  }
  console.log(`launched ${APP_ID}`);
}

async function screenshot(): Promise<void> {
  const out = await sh([
    "ssh",
    "tv",
    luna("com.webos.service.capture/executeOneShot", {
      path: "/tmp/headroom.png",
      format: "png",
      width: 1920,
      height: 1080,
    }),
  ]);
  if (!out.includes('"returnValue":true')) {
    throw new Error(`tv: capture failed: ${out}`);
  }
  await sh(["scp", "-q", "tv:/tmp/headroom.png", "screenshot.png"]);
  console.log("saved screenshot.png");
}

const commands: Record<string, () => Promise<void>> = {
  deploy,
  launch,
  screenshot,
};
const command = commands[process.argv[2] ?? ""];
if (!command) {
  console.error(
    `usage: bun scripts/tv.ts <${Object.keys(commands).join("|")}>`,
  );
  process.exit(2);
}
await command();
