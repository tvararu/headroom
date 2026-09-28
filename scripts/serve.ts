import { join } from "node:path";

const DIST = join(import.meta.dir, "..", "dist");

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".woff2": "font/woff2",
};

Bun.serve({
  port: 3010,
  hostname: "0.0.0.0",
  async fetch(req) {
    const url = new URL(req.url);
    const rel =
      url.pathname === "/"
        ? "index.html"
        : decodeURIComponent(url.pathname.slice(1));
    const file = Bun.file(join(DIST, rel));
    if (!(await file.exists()))
      return new Response("not found", { status: 404 });
    const ext = rel.slice(rel.lastIndexOf("."));
    return new Response(file, {
      headers: { "content-type": TYPES[ext] ?? "application/octet-stream" },
    });
  },
});

console.log("headroom: serving dist/ on http://0.0.0.0:3010");
