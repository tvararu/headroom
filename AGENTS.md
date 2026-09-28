# headroom

An Omarchy-styled dashboard of `omp usage` (AI provider rate limits) for
Theo's living-room LG C1 OLED. It is a webOS `type: web` app, `org.vararu.headroom`.

## Data flow

1. openhubris runs `mise push` every 5 min (`headroom-push.timer`, a user unit
   stow-tracked in `~/code/openhubris/systemd`).
2. `src/collector/push.ts` runs `omp usage --json` and
   `omp usage --history --days 7 --json`. `reduce.ts` shrinks them to the
   `HeadroomData` contract in `src/shared/schema.ts`.
3. The JSON goes over `ssh tv` into
   `/media/developer/apps/usr/palm/applications/org.vararu.headroom/data/usage.json`.
   The write is atomic (tmp file and `mv`).
4. The app re-reads `data/usage.json` every 15 s.

The TV has no route to openhubris, so data is pushed, never pulled. ssh exit 255
(TV off) is a skip that exits 0, not a failure.

**Identity never reaches the TV.** The collector reads unredacted omp JSON in
memory only and emits provider, plan and numbers. No emails, account ids, org
names or error causes. Tests enforce this.

## TV constraints

- Chromium 79 (webOS 6.5.2). Source is TypeScript, and esbuild lowers it to
  `chrome79`. Bun's bundler does no syntax lowering, so do not swap it in.
- CSS the TV lacks: flex `gap` (84), `inset` (87), `aspect-ratio` (88),
  `:is()`/`:where()` (88). Grid `gap`, custom properties and SVG are fine.
- DOM renders at the manifest's 1920x1080.
- `ares-install` replaces the app dir, so it wipes `data/`. `mise deploy` runs
  `mise push` afterwards for this reason.

## Burn-in guards

The app blocks the TV screensaver, so it guards the OLED itself (`src/app/guard.ts`):

- The layout swaps between tiles and list every 10 min, which moves the bar top/bottom.
- The whole UI moves 6 px each minute, in a 9-step orbit.
- It dims to 45% after 30 min with no key press. Any key wakes it.

## Remote

OK toggles the layout until the next 10-min boundary. Any colour button cycles
the theme. Back exits.

## Commands

```bash
mise ci            # test + lint + format + typecheck
mise build         # dist/
mise push          # collect and push to the TV (--dry-run, --out <path>)
mise serve         # preview dist/ on :3010
mise deploy        # package, install, launch, push
mise screenshot    # ./screenshot.png from the TV
mise inspect       # devtools on the running app
mise sync-themes   # regenerate themes from the pinned Omarchy commit
```

## Rules

- Never give the TV internet access. Never update or reset it. Never touch its
  network config.
- Commits: Conventional Commits, subject 50 chars or fewer (the hk hook enforces this).
