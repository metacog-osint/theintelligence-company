# Veterans Day 2026 planner

The page at `https://theintelligence.company/veterans/veterans-day/` (files in `site/veterans/veterans-day/`), its
data build (`build/`), the research it is built from (`research/`) and its field-report service (`worker/`).
Built 8 Nov 2026 at request for Guard colleagues and other veterans in Fargo-Moorhead, for Wednesday
11 Nov 2026. It is the first piece of a planned "For veterans" section on the hub.

## What it does
- **Next:** the best stop from where you are now, timed against each deal's window ("arrive by"), with the next few
  stops after it and other good choices. Got it / Turned away / Skip (a strike; three is a veto) / Never.
- **Plan:** a whole day from a start time and place, with Google Maps links (10 stops per link, Google's limit).
- **Map**, **Deals** (search, filter, sources, pins), **Me** (status, spouse and kids, proof carried, sign-ups,
  sit-down meals, pace, done-by time, roads, busy times, likes, history, vetoes).
- Before 4 AM CST on 11 Nov it runs in **preview**, planning as if it were Wednesday at a time you pick; marks made
  in preview stay on the phone and are never sent.

## How it decides (engine.js, tested in `tests/veterans-engine.test.js`)
- Each stop's value = dollars × spouse/kids multiplier × chance it's honoured (grade A 0.9, B 0.75, C 0.4, less for
  "participating locations" and call-first notes, moved up or down by today's field reports) × your liking for
  that kind of deal × meal fullness.
- Its cost = minutes driving, in line and waiting (first 20 minutes) at your pace's rate (relaxed $0.50, balanced
  $0.25, max haul $0.10 a minute), plus a third of the rate for time at the stop.
- A beam search picks the best order; the Next tab looks three stops ahead from the 30 best first stops.
- Rules: arrive at least 5 minutes before a deal ends; a deal's own hours win when they don't overlap the store's
  (Texas Roadhouse hands out vouchers at lunch, its dining room opens at 4); one haircut a day; after a sit-down
  meal, another within 2.5 hours counts a quarter, none past the meal limit; each quick bite makes the next worth
  15% less.
- Drive times are OSRM's, computed ahead of time from a grid of points about every 800 m to every store, so a phone
  times its own trip and its location never leaves it.

## Rebuilding the data
From the repo root (Windows: `python`, not `python3`):

```
python -I veterans-day/build/build_data.py      # research -> data/deals.json (Census geocoder, NWS link)
python -I veterans-day/build/drive_matrix.py    # only when stores change: OSRM tables -> data/drive.json (~2 min)
cd tests && node --test --no-warnings veterans.test.js veterans-engine.test.js site.test.js
```

`tests/veterans.test.js` fails if `drive.json` no longer matches the stores in `deals.json`. Every editorial
decision (which offers, category, minutes at the stop, peak lines, call-first notes, windows) is in `CURATE` at the
top of `build_data.py`. Place ids come from the offer and street address, so they stay stable across rebuilds:
field reports refer to them.

Research (8 Nov 2026): `national-2026.json` (73 chains, sources dated 5–8 Nov), `local-2026.json` (44 local
entries; almost none confirmed for 2026 yet: re-check local businesses, VFW and Legion posts on 9–10 Nov),
`locations-2026.json` (57 chains, 148 store records: 80 confirmed on official locators, 66 unverified, 2 closed),
`osm-matches.json` (OpenStreetMap places matched by brand).

## Field-report service (`worker/`, Cloudflare Worker `vetday` + D1 `vetday`, free tier)
Anonymous: a report is a place, an offer, an outcome (worked, away, out, line + minutes) and a time. Abuse limits
use a salted hash of the caller's IP; the salt is random per UTC day and deleted after two days, and the hashes are
wiped from reports after two days. `GET /v1/state` serves one stored summary row (cheap on D1's free read quota),
rebuilt on every write and at most every five minutes otherwise. Tests: `cd worker && npm test` (Node's built-in
SQLite stands in for D1).

**Deploy (needs the account owner).** The `CLOUDFLARE_API_TOKEN` on this machine can't deploy Workers, so the account owner signs in once:

```
Remove-Item Env:CLOUDFLARE_API_TOKEN; npx wrangler login
```

Then, in a shell without that variable (`env -u CLOUDFLARE_API_TOKEN` in Git Bash), from `veterans-day/worker`:

```
npx wrangler d1 create vetday                          # copy database_id into wrangler.jsonc
npx wrangler d1 migrations apply vetday --remote
npx wrangler deploy                                    # prints https://vetday.<account>.workers.dev
```

Then set `API` in `site/veterans/veterans-day/app.js` to that origin and add it to `connect-src` in
`firebase.json` (the site test checks the two agree), run the tests, and deploy the hub
(`firebase deploy --only hosting:hub --project context-484804`, approved).

## On the day
- Pull a deal or a store for everyone (shows within five minutes):
  `npx wrangler d1 execute vetday --remote --command "INSERT OR REPLACE INTO overrides (id, status, note, ts) VALUES ('<offer or place id>', 'dead', '<why>', unixepoch()*1000)"`
  Use status `caution` to keep it but show the note.
- Read tips: `npx wrangler d1 execute vetday --remote --command "SELECT id, ts, name, address, offer, when_, source FROM tips WHERE status = 'new'"`.
  Add a good one to `research/local-2026.json` and `CURATE`, rebuild, deploy.
- What people report: `SELECT o, k, COUNT(*) FROM reports GROUP BY o, k`.
