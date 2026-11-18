# Hub handoff (18 Nov 2026, about 11:45 AM CST)

Read with `CLAUDE.md`. Current state and open items only; done items are deleted (git and `HISTORY.md` keep the
record; the full 18 Nov text before slimming is in `D:\Projects\_ideas\archive\hub-HANDOFF-2026-11-18.md`). Times
Central. Each commit, push and deploy needs Tom's yes.

## Current state
- **Shared files live everywhere:** tic-time 1.4, tic-nav 2.1 (with Relief) on the hub and every program site,
  PropertyCast included (checked 18 Nov). tic-area 1.1 on Elements and Cordon. tic-related 1.0 on Blackout, Cordon
  (chosen place only), Elements, Headwind, Launch (Live tab), Undertow (Overview), Wake (Traffic) and Watchfloor
  (home page). tic-tabs 1.0 on Cordon, Elements, Headwind, Undertow and Wake.
- **Wake deploys itself** (update workflow every 6 h and on each push to `main`; PortWatch stays a weekly by-hand
  read). Port calls and the listed-IMO match are live. Wake's `CLAUDE.md` is 33.6 KB, far over the 12 KB cap: it
  needs its own trim session.
- **Dispatch and site check:** `tic-dispatch` on its own `*/5` cron, retries and Healthchecks alerts (Workers Paid,
  17 Nov); `tic-sitecheck` twice a day. Jobs in `dispatch/dispatch.js`.
- **Main checkout** `D:\Projects\theintelligence-company` (`master`) may be behind origin; pull before working there.
  Its untracked `.claude/` holds the design review (`design-review/`, published at
  https://claude.ai/artifact/HbqH9AaUvGSWiu1JXfW2V4), `launch.json` and an old notes patch.
- **Old-history local branches** `tic-nav-v1.13` and `tic-nav-v2.0` remain in COP, Cordon, Elements, Undertow,
  Launch, Headwind and Wake: never push them.

## Open items
1. **Light-page shell ("C · Shell"), each on Tom's yes, one worktree per site:** the sections row is done on every
   light page (18 Nov: Undertow `6eeebf8`, Wake `03ae0bf`; Launch keeps its own tab row, `63762bb`), each with phone
   folds and Elsewhere today. Axe failures already on a live site were fixed in the same commit (Undertow: Method's
   links, matrix contrast; both: sideways tables made focusable regions). Next, the header row (layer chip in the
   drawing's colour, one "today's reading" line, stat tiles), with screenshots and Tom's yes on look and wording first. Pages with long
   tables want Cordon's phone fold. Check no busy session owns a site first (`ListAgents`). Check script pattern:
   Playwright + axe in headless Edge, axe injected with `page.evaluate` (a `script-src 'self'` CSP refuses
   `addScriptTag`). Also proposed in the design review, not built: page titles "Name · The Intelligence Company".
2. **Waiting on Tom:**
   - The drawing is small between 821 and about 1100 px wide (labels 5-7 px); the phone layout starts at 820 px.
   - Watchfloor's Rising headline links are 17 px tall, under WCAG 2.2's 24 px target size (a layout change).
   - Product screenshots in `site/img/` date from 31 Oct and may be out of date.
   - PropertyCast's `tools/smoke_garden.py` fails 3 of 237 checks (`tomcast`, `pests`, `water`) since 7 Nov,
     probably the off-season.
   - Veterans Day 2027: the open questions in `veterans-day/README.md` ("After the day"), including a daily cron
     for the hash and salt wipe.
   - Leftover worktrees and branches (removing them is Tom's call): `_worktrees/hub-fort-meade` (uncommitted
     `roads.js` edit), `hub-design`, `hub-notes-shell` (both merged), `.claude/worktrees/stoic-jemison-5b6dd1`
     (detached), `D:\Projects\tic-vetday` (branch `veterans-day`, uncommitted files; never deploy from it); merged
     local branches `vetday-*`, `design/hub-preview`, `listing/wake`, `relief-listed-2`. From the shell rollout:
     `_worktrees/cordon-picker`, `cordon-tabs`, `elements-shell`, `headwind-shell`, `watchfloor-shell`,
     `launch-shell`, `undertow-shell`, `wake-shell` (all three pushed, clean).
3. **Waiting on access:** Blackout's night lights (Tom accepting LAADS's data licence on Earthdata), then its drawing
   line; Launch's worldwide NOTAMs (FAA access).
4. **When lanes arrive:** Elements' wording (next CAP countries: Canada ECCC Datamart, then Japan JMA; the radiation
   lane); Vis's line ("A thunderstorm hazard and scoring against station reports are planned"); Blackout's Sources
   section (footer credit links its home page until it has one). Wake gets linked once its collectors are live.
5. **Other repos, noted, not started:** Headwind, Orbit, Launch and Undertow have no gate job, so a late fallback
   cron repeats a dispatched run. Vigil: `/api/feed` counts claims from a `limit=300` query; the `cisa-advisories`
   lane 403s; COP's `tests/fixtures/vigil.geojson` unchanged since 31 Oct. Elements' first draw: Leaflet's canvas
   renderer could trim the remaining 0.3-0.4 s long task.
