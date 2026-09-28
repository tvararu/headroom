# headroom

A TV-friendly webOS dashboard. The only dashboard today shows AI provider
rate limits collected from `omp usage --json` (oh-my-pi coding agent). The
direction: headroom becomes a wrapper for several dashboards (a Home
Assistant one is planned), switched with CH+/CH−.

## Architecture and data flow

- `src/collector/push.ts` runs `omp usage --json` and
  `omp usage --history --days 7 --json`. `reduce.ts` shrinks them to the
  `HeadroomData` contract in `src/shared/schema.ts`. `src/shared/app.ts`
  holds the app id (`org.vararu.headroom`) and the `HEADROOM_TV` env helper.
- The JSON is pushed over ssh to
  `<app-dir>/data/usage.json` on the TV, atomically (tmp file + `mv`). The
  TV has no route to the pushing machine, so data is pushed, never pulled.
- The app (`src/app/main.ts`) re-reads `data/usage.json` every 15 s.
- Identity never reaches the TV: the collector reads unredacted omp JSON in
  memory only and emits provider, plan and numbers. No emails, account ids,
  org names or error causes. `src/collector/*.test.ts` enforce this; the
  fixtures under `src/collector/fixtures/` use fake `example.test` identities.
- Deploy/install/launch/screenshot run through `scripts/tv.ts` (ssh plus
  luna calls). `mise deploy` runs `mise push` afterwards because installing
  replaces the app dir, wiping `data/`.

## Design system

Tokens and components live in `src/app/ui/`; components return HTML strings
and everything is styled with `ui-` classes in `public/style.css`. No ad-hoc
CSS outside the design system: add a component or extend a token instead.

- `mise sync-themes` regenerates `src/app/themes.generated.ts` from the
  pinned Omarchy commit in `scripts/sync-themes.ts`. Do not hand-edit the
  generated file; `vantablack` (the default) is defined in `src/app/themes.ts`.
- `src/app/guard.ts` holds the burn-in and layout-rotation logic
  (tiles/list swap each minute, 10 min pin on explicit choice, 45% dim after
  30 min idle). Keep timing constants there.

## TV constraints (Chromium 79, webOS, 1920x1080)

- Source is TypeScript, bundled by esbuild lowered to `chrome79`. Bun does no
  syntax down-levelling, so do not swap the bundler. `lib` is ES2019 + DOM to
  match the runtime: no newer JS APIs without a polyfill.
- CSS the TV lacks: flex `gap` (84), `inset` (87), `aspect-ratio` (88),
  `:is()`/`:where()` (88). Grid `gap`, custom properties and SVG are fine.
  (Numbers are the Chrome versions that added them.)
- `luna-send` prints nothing when its stdin or stdout is the ssh channel.
  Run it with `</dev/null` and pipe its output, as `scripts/tv.ts` does.
- The TV font has no glyphs outside the bundled Nerd Font plus its own
  blocks, and there is no fallback font. A desktop browser falls back
  silently, so check new symbols on the TV itself.
- `mise screenshot` captures the TV DOM (luna `capture/executeOneShot`) into
  the git-ignored `./screenshot.png`, so it is valid visual proof for this
  app. Pass a path (`mise screenshot docs/tiles.png`) to refresh the README
  images instead.

## Commands

```bash
mise ci            # test + lint + format + typecheck (run before committing)
mise build         # dist/
mise push          # collect and push to the TV (--dry-run, --out <path>)
mise serve         # preview dist/ on :3010
mise deploy        # package, install, launch, push
mise screenshot    # capture ./screenshot.png from the TV (or pass a path)
mise inspect       # forward the TV inspector to localhost:9998
mise sync-themes   # regenerate themes from the pinned Omarchy commit
```

## Verify

- `mise ci` before committing.
- Local preview: `mise build`, then `mise push --out dist/data/usage.json`
  and `mise serve` (dist/ on :3010).
- TV proof: `mise deploy`, then `mise screenshot`, then look at the image.
  The view swaps every minute, so wait for the minute or press `1`/`2` via
  the inspector (`mise inspect`, devtools console) to capture a given view.

Tests are colocated (`foo.ts` → `foo.test.ts`) and run with `bun test`.
`HEADROOM_TV` (ssh host or `user@host`) comes from `mise.local.toml`; see
`mise.local.toml.example`. Missing target exits 2 with a setup hint; ssh
exit 255 (TV off) is a skip that exits 0.

## Commits

Use Conventional Commits, title is "what", body is "why":

- Check `git log -n 5` first to match existing style
- Don't use `--oneline`, commit bodies carry important context
- Subject ≤50 chars (including prefix): `feat: Add thing`
- Capitalize after prefix: `feat: Add thing` not `feat: add thing`
- Blank line, then 1-3 sentence description of "why", no bullet points
- Always `git add` and `git commit` as separate commands

## Rules

- Never give the TV internet access. Never update or reset it. Never touch
  its network config.
- Keep app behaviour unchanged unless asked.
