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
  Launch. **Its own clock, built 14 Nov, not live until pushed:** `crons = ["*/5 * * * *"]` in the hub, and
  PropertyCast's `lend()` and `DISPATCH` binding removed in PropertyCast. Push PropertyCast's first (its
  `trigger-deploy` removes the binding), then the hub's (`dispatch-deploy` adds the cron), so the two clocks never
  both run: nothing stops a job starting twice in one slot. Then check one dispatched run per repo. The token covers
  all eight repos (`CLAUDE.md`, "Dispatch Worker").
- **Tests on this machine:** `BROWSER_CHANNEL=msedge npm test` runs everything on the installed Edge (`tests/README.md`);
  190 of 190 passed in 6 full runs on 14 Nov, 2 to 3 minutes each. The two tests that failed only in full runs, and a
  third found on the way, are fixed at the cause (`CLAUDE.md`, "Tests"): `serve.py`'s listen backlog, off-site-only
  routing in the tests, and the planner's `roads.js` v1.1 timeout. Pushed 14 Nov about 4:33 PM CST (`5245689`;
  `site-checks` run 43648715410 green, both jobs) and deployed to the hub about 4:40 PM CST (approved); the live
  `/veterans/veterans-day/roads.js` is byte-identical to `master`. The drag test's 34 px shift (2 of about 12 runs
  before the routing change, none in 8 after) wasn't explained; it now also waits for the map to stop gliding.

## Next steps
1. **PropertyCast to v1.10:** after its 15 Nov publish (about 4:23 AM CST), check its home page's HTML for
   `TicNav = { version: "1.10"`. That finishes v1.10 everywhere.
2. **Waiting on the publisher (listed 14 Nov 2026, nothing changed):**
   - The drawing is small between 821 and about 1100 px wide (labels 5 to 7 px at 821 to 1024 px); the phone layout
     starts at 820 px, so a breakpoint change.
   - Watchfloor's own `button.primary`: white on amber in light mode, 4.0:1 (WCAG AA asks 4.5:1 for normal text).
   - PropertyCast's `tools/smoke_garden.py` fails 3 of 237 checks (`payload: tomcast`, `pests`, `water`) since at
     least 7 Nov, probably the off-season.
   - Elements' next text update when more weather lanes go live (count publishers in the live `data/feed.geojson`
     first; next CAP countries in the assessment: Canada (ECCC Datamart), then Japan (JMA); the radiation lane).
   - Product screenshots (`site/img/`, 31 Oct 2026) may be out of date.
   - Veterans Day 2027: the open questions in `veterans-day/README.md` ("After the day"): repeat visits, how receipts
     are read, a reach counter, and a daily cron for the hash and salt wipe.
3. **Waiting on access:** Blackout's night lights (the publisher accepting LAADS's data licence on his Earthdata account), then
   its drawing line; Launch's worldwide NOTAMs (FAA access).
4. **Wake** is on the drawing as in development, not linked. Before the hub links it, it needs live collectors or
   its seed data labelled as test.
5. **Other repos, noted, not started:** Vis's gate counts a scheduled run whose build it skipped as a success, so a
   skip restarts its 6-hour window (seen 8 Nov; its `build.yml` still asks for `status=success`, 14 Nov). Headwind
   and Orbit have no gate job, so a late fallback cron repeats a dispatched run. Vigil (4 Nov, not rechecked):
   `/api/feed` counts claims from a `limit=300` query, the `cisa-advisories` 403, and COP's stale
   `tests/fixtures/vigil.geojson`.
6. **Leftover worktrees and branches (removing them is the publisher's call):** `_worktrees/hub-colorado-springs`,
   `hub-denver`, `hub-reno-sparks` (clean, merged), `hub-fort-meade` (merged; uncommitted edits to the planner's
   `engine.js` and `roads.js`), `hub-dispatch-pntsa` (2 commits not in `master`; pntsa now runs its own Worker),
   `[local path]` (branch `veterans-day`, merged, 19 uncommitted files; never deploy from it), and the merged
   local branch `vetday-co-chains`.
