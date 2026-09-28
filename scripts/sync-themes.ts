export {};

const COMMIT = "97a9fce54f5df007afe7b8637ddc09314f38ad00";
const NAMES = [
  "vantablack",
  "tokyo-night",
  "catppuccin",
  "gruvbox",
  "nord",
  "everforest",
  "osaka-jade",
  "matte-black",
];
const KEYS = [
  "accent",
  "selection",
  "muted",
  "background",
  "dark_background",
  "darker_background",
  "lighter_background",
  "foreground",
  "dark_foreground",
  "light_foreground",
  "bright_foreground",
  "red",
  "yellow",
  "orange",
  "green",
  "cyan",
  "blue",
  "magenta",
  "brown",
];

const themes: { name: string; colors: Record<string, string> }[] = [];
for (const name of NAMES) {
  const url = `https://raw.githubusercontent.com/basecamp/omarchy/${COMMIT}/themes/${name}/colors.toml`;
  const res = await fetch(url);
  if (res.status !== 200) throw new Error(`${url}: HTTP ${res.status}`);
  const parsed = Bun.TOML.parse(await res.text()) as Record<string, unknown>;
  const colors: Record<string, string> = {};
  for (const key of KEYS) {
    const value = parsed[key];
    if (typeof value !== "string") throw new Error(`${name}: missing ${key}`);
    colors[key] = value.toLowerCase();
  }
  themes.push({ name, colors });
}

await Bun.write(
  "src/app/themes.generated.ts",
  `export const THEMES: { name: string; colors: Record<string, string> }[] = ${JSON.stringify(themes, null, 2)};\n`,
);
