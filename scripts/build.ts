import { cp, mkdir, rm } from "node:fs/promises";
import * as esbuild from "esbuild";

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });

await esbuild.build({
  entryPoints: ["src/app/main.ts"],
  bundle: true,
  format: "iife",
  target: "chrome79",
  minify: true,
  outfile: "dist/app.js",
});

await cp("public", "dist", { recursive: true });
