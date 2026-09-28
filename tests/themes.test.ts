import { describe, expect, test } from "bun:test";
import { THEMES } from "../src/app/themes.generated";
import { themeVars, THEME_NAMES } from "../src/app/themes";

const EXPECTED_VARS = [
  "--bg",
  "--bg-alt",
  "--fg",
  "--fg-dim",
  "--fg-bright",
  "--accent",
  "--muted",
  "--border-idle",
  "--ok",
  "--warn",
  "--crit",
];

describe("themes", () => {
  test("expected theme order", () => {
    expect(THEME_NAMES).toEqual([
      "vantablack",
      "tokyo-night",
      "catppuccin",
      "gruvbox",
      "nord",
      "everforest",
      "osaka-jade",
      "matte-black",
    ]);
  });
  test("every theme resolves all 11 vars to #rrggbb", () => {
    for (const t of THEMES) {
      const vars = themeVars(t.name);
      expect(Object.keys(vars).sort()).toEqual([...EXPECTED_VARS].sort());
      for (const v of Object.values(vars)) {
        expect(v).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });
  test("unknown theme falls back to vantablack", () => {
    expect(themeVars("nope")).toEqual(themeVars("vantablack"));
  });
  test("vantablack bg is pure black", () => {
    expect(themeVars("vantablack")["--bg"]).toBe("#000000");
  });
});
