# Hub handoff: where things stand (14 Nov 2026, about 3:30 PM CST)

Read with `CLAUDE.md` (the project's notes). Times are Central (CST since 1 Nov). Each commit, push and deploy needs
approved. Every finished dated section up to 13 Nov 2026 (Veterans Day planner, house bar v1.3 to v1.9, Vis,
tests, dispatch, the Vigil summary feed) is in `HISTORY.md`, moved verbatim on 14 Nov 2026. What each program is
and how the house bar rolls out are in `CLAUDE.md`.

## Current state (checked 14 Nov 2026, about 3:27 PM CST)
- **House bar v1.10** (Launch added after Orbit): every live `/tic-nav.js` reads `version: "1.10"`: the hub and COP
  (both at `/shared/`), Watchfloor, Context, Vigil, Blackout, Headwind, Noisefloor, Orbit, Launch, Cordon, Vis,
  Elements, Title 10 (`activation.`) and Listening Post. **PropertyCast's home page still builds in v1.9**
  (`TicNav = { version: "1.9"`, its 14 Nov publish); its `main` carries v1.10 (`src/wx/static/tic-nav.js`), so it
  goes to v1.10 at its 15 Nov publish, about 4:23 AM CST.
- **Programs in the house bar:** 15, the newest Launch (14 Nov), Orbit and Headwind (13 Nov) and Blackout (12-13
  Nov). Their wording, drawing rows and footer credits: `CLAUDE.md`, "Family".
- **`site-checks` on `master`: green.** The last run, 43616958717 on `4d4351b` (the Launch listing), passed both jobs
  (`checks`, `feeds`). The commits since (`c0c037d` to `e1e3e29`) touch only `CLAUDE.md` and `dispatch/`, which don't
  start it; `dispatch-deploy` passed on `15caf79` (COP's watchdog).
- **Dispatch:** `tic-dispatch` starts Elements, Cordon, COP (build and watchdog), Vis, Blackout, Headwind, Orbit and
  Launch (and Undertow since 14 Nov evening; `CLAUDE.md`). **On its own `*/5` cron since 14 Nov 2026, 7:19 PM CST**
  (Tom's yes): PropertyCast `cad0665` removed `lend()` and the `DISPATCH` binding (`trigger-deploy` 43662451686,
  7:18 PM; the deployed Worker lists only `LIVE`, `REPO`, `REF`), then hub `c1c301b` added the cron
  (`dispatch-deploy` 43662538238; Cloudflare reported `schedule: */5 * * * *`). No slot was missed or started twice.
  The first starts on its own clock all passed: Elements 7:35 PM (43663787442), Cordon 7:40 PM (43664175719),
  Blackout 7:45 PM (43664557789). Cron triggers in use: 3 of the free 5 (`CLAUDE.md`, "Dispatch Worker").
- **Tests on this machine:** `BROWSER_CHANNEL=msedge npm test` runs everything on the installed Edge (`tests/README.md`);
  190 of 190 passed in 6 full runs on 14 Nov, 2 to 3 minutes each. The two tests that failed only in full runs, and a
  third found on the way, are fixed at the cause (`CLAUDE.md`, "Tests"): `serve.py`'s listen backlog, off-site-only
  routing in the tests, and the planner's `roads.js` v1.1 timeout. Pushed 14 Nov about 4:33 PM CST (`5245689`;
  `site-checks` run 43648715410 green, both jobs) and deployed to the hub about 4:40 PM CST (approved); the live
  `/veterans/veterans-day/roads.js` is byte-identical to `master`. After `npm ci` (14 Nov evening; `node_modules` had been
  found empty at 7:29 PM CST, cause not found), 190 of 190 passed on `682285e`, Undertow's changes included. The drag test's 34 px shift (2 of about 12 runs
  before the routing change, none in 8 after) wasn't explained; it now also waits for the map to stop gliding.

- **Watchfloor contrast fixed (14 Nov 2026, Tom's yes):** axe on the live site, light and dark, found the warm badge
  (light, 3.63:1), the hot badge (dark, 2.28:1), the primary button (light, 3.99:1) and an empty table header. Watchfloor
  `ba51ad7` fixes all four (5.51, 8.58 and 4.65:1, an "Alarm" label for screen readers) without changing a background;
  deployed about 7:55 PM CST, and live axe now flags only Rising's headline links as under the 24 px target size
  (optional, a layout change).

## Next steps
1. **PropertyCast to v1.10:** after its 15 Nov publish (about 4:23 AM CST), check its home page's HTML for
   `TicNav = { version: "1.10"`. That finishes v1.10 everywhere.
2. **Waiting on the publisher (listed 14 Nov 2026, nothing changed):**
   - The drawing is small between 821 and about 1100 px wide (labels 5 to 7 px at 821 to 1024 px); the phone layout
     starts at 820 px, so a breakpoint change.
   - PropertyCast's `tools/smoke_garden.py` fails 3 of 237 checks (`payload: tomcast`, `pests`, `water`) since at
     least 7 Nov, probably the off-season.
   - Elements' next text update when more weather lanes go live (count publishers in the live `data/feed.geojson`
     first; next CAP countries in the assessment: Canada (ECCC Datamart), then Japan (JMA); the radiation lane).
   - Product screenshots (`site/img/`, 31 Oct 2026) may be out of date.
   - Watchfloor's Rising headline links are 17 px tall, under WCAG 2.2's 24 px target size (axe, 14 Nov); fixing it
     changes the layout.
   - Veterans Day 2027: the open questions in `veterans-day/README.md` ("After the day"): repeat visits, how receipts
     are read, a reach counter, and a daily cron for the hash and salt wipe.
3. **Waiting on access:** Blackout's night lights (the publisher accepting LAADS's data licence on his Earthdata account), then
   its drawing line; Launch's worldwide NOTAMs (FAA access).
4. **Wake** is on the drawing as in development, not linked. Before the hub links it, it needs live collectors or
   its seed data labelled as test.
5. **Other repos, noted, not started (rechecked on GitHub 14 Nov evening):** Vis's gate is fixed: it counted a run
   whose build it skipped as a build, so each skip restarted its 6-hour window; Vis `99327e5` (approved, 14 Nov about
   8:25 PM CST; push run 43667680394 passed) counts only runs whose build job succeeded. First real test: the 08:53 UTC
   fallback, 2:53 AM CST 15 Nov. Headwind, Orbit and Launch have no gate job, so a late fallback cron repeats a dispatched run.
   Vigil: `/api/feed` counts claims from a `limit=300` query, the `cisa-advisories` 403, and COP's
   `tests/fixtures/vigil.geojson` unchanged since 31 Oct. Elements' wording needs nothing yet: its live feed (386
   items, 16 publishers) has no lane the house bar's text doesn't already name.
6. **Leftover worktrees and branches (removing them is the publisher's call):** `_worktrees/hub-colorado-springs`,
   `hub-denver`, `hub-reno-sparks` (clean, merged), `hub-fort-meade` (merged; uncommitted edits to the planner's
   `engine.js` and `roads.js`), `hub-dispatch-pntsa` (2 commits not in `master`; pntsa now runs its own Worker),
   `[local path]` (branch `veterans-day`, merged, 19 uncommitted files; never deploy from it), and the merged
   local branch `vetday-co-chains`. Added 14 Nov evening, both clean and merged: `_worktrees/pc-trigger-own-clock`
   (PropertyCast, branch `trigger-own-clock`) and `_worktrees/watchfloor-contrast` (Watchfloor, branch `contrast-fix`), and `_worktrees/vis-gate` (Vis, branch
   `gate-fix`).
