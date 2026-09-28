import { deflateSync } from "node:zlib";

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    const t = CRC_TABLE[(crc ^ (data[i] ?? 0)) & 0xff] ?? 0;
    crc = t ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i) ?? 0;
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function buildPng(size: number): Uint8Array {
  const borderRgb = hexToRgb("#8d8d8d");
  const barColors = ["#8d8d8d", "#cecece", "#ffffff"].map(hexToRgb);
  const barWidths = [0.35, 0.65, 0.9];
  const rows = new Uint8Array(size * (1 + size * 3));
  for (let y = 0; y < size; y++) {
    rows[y * (1 + size * 3)] = 0;
    for (let x = 0; x < size; x++) {
      const o = y * (1 + size * 3) + 1 + x * 3;
      let rgb: [number, number, number] = [0, 0, 0];
      if (x < 2 || x >= size - 2 || y < 2 || y >= size - 2) {
        rgb = borderRgb;
      } else {
        const fx = (x - 2) / (size - 4);
        const fy = (y - 2) / (size - 4);
        const row = fy < 0.36 ? 0 : fy < 0.63 ? 1 : fy < 0.9 ? 2 : -1;
        if (row >= 0 && fx < (barWidths[row] ?? 1)) {
          const c = barColors[row];
          if (c !== undefined) rgb = c;
        }
      }
      rows[o] = rgb[0] ?? 0;
      rows[o + 1] = rgb[1] ?? 0;
      rows[o + 2] = rgb[2] ?? 0;
    }
  }
  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, size);
  view.setUint32(4, size);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const idat = deflateSync(rows);
  const parts = [
    chunk("IHDR", ihdr),
    chunk("IDAT", new Uint8Array(idat)),
    chunk("IEND", new Uint8Array(0)),
  ];
  const total = 8 + parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  out.set([137, 80, 78, 71, 13, 10, 26, 10], 0);
  let pos = 8;
  for (const p of parts) {
    out.set(p, pos);
    pos += p.length;
  }
  return out;
}

await Bun.write("public/icon.png", buildPng(80));
await Bun.write("public/largeIcon.png", buildPng(130));
