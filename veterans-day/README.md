# Veterans Day 2026 planner

The page at `https://theintelligence.company/veterans/veterans-day/` (files in `site/veterans/veterans-day/`), its
data build (`build/`), the research it is built from (`research/`) and its field-report service (`worker/`).
Built 8 Nov 2026 at request for Guard colleagues and other veterans in Fargo-Moorhead, for Wednesday
11 Nov 2026. It is the first piece of a planned "For veterans" section on the hub.

## What it does
- **Route:** the whole day from where you are, timed against each deal's window, with Best for me or Maximize
  (most stops, most savings, both), Google Maps links (10 stops per link, Google's limit) and other choices. Got it /
  Turned away / Skip (a strike; three is a veto) / Never on the first stop; Go here first / Not today on the rest.
- **Map** (every deal, with the route drawn along the roads), **Deals** (search, filter, sources, pins), **Me**
  (status, spouse and kids, proof carried, sign-ups, sit-down meals, pace, done-by time, roads, busy times, likes,
  history, vetoes).
- Before 4 AM CST on 11 Nov it runs in **preview**, planning as if it were Wednesday at a time you pick; marks made
  in preview stay on the phone and are never sent.

## How it decides (engine.js v1.2, tested in `tests/veterans-engine.test.js`)
- **The Route tab** (the main page since 9 Nov 2026, replacing Next and Plan): settings at the top (start point,
  leave time, done-by time, goal, what you're after, take food home), then one route that rebuilds on every change,
  every stop you mark, every report and every 150 m you move. Stop 1 is the big card; each later stop shows when
  you'd arrive against when its deal ends, with a bar (blue the deal's hours, amber your visit) and red text when
  under 25 minutes are left. "Ending soon, not on your route" lists deals closing within two hours, with "Add to my
  route" (a pin). The Map draws the same route.
- **Goals** (8 Nov 2026): *Best for me* weighs value against time at your pace and likes. *Maximize* has three:
  *Most stops* (each place counts 1, less for long shots), *Most savings* (expected dollars) and *Stops + savings*
  (half each, as a share of what the other two reach). Maximize ignores pace and Love; Off still leaves things out.
  In Maximize the search ranks partial plans by what they collected less what their minutes could have collected
  elsewhere (a stop every 20 minutes, $0.20 a minute), so it doesn't park at a store waiting for it to open.
- Each stop's value = dollars × spouse/kids multiplier × chance it's honoured (grade A 0.9, B 0.75, C 0.4, less for
  "participating locations" and call-first notes, moved up or down by today's field reports) × your liking for
  that kind of deal × appetite.
- Its cost (Best for me) = minutes driving, in line and waiting (first 20 minutes) at your pace's rate (relaxed
  $0.50, balanced $0.25, max haul $0.10 a minute), plus a third of the rate for time at the stop.
- **Tickets for later** (8 Nov 2026): Great Clips, Texas Roadhouse and Freddy's hand out a card or voucher. They
  are quick stops (`ticket` in CURATE) that fill nothing, and Great Clips' card doesn't use up the day's haircut.
- **Tickets don't open a route** (8 Nov 2026: "I don't want routes to open with great clips unless it makes
  sense"; v1.2, `deferTickets`). The beam liked a ticket first because it is quick. When a plan starts with tickets,
  each moves to its best later place, counting the drive back to the start (the plan otherwise ignores the trip home,
  which made stops near home look cheap only at the start). It stays first only if it fits nowhere later (a closing
  window) or moving it costs more than 10 minutes of your time; "Go here first" always wins. Over 480 sample days
  (four goals, six leave times, 20 starts) routes opening with Great Clips fell from 13% to 4% and Freddy's from 8% to 2%.
- **Appetite:** food eaten there fills you (a sit-down meal 1, a to-go meal 0.8, a quick bite 0.4, chips or a cookie
  0.2) and wears off at 0.3 an hour. A stop is worth less the fuller you are, a sit-down meal outside mealtimes
  (6:00–10:30, 10:30–14:30, 16:30–20:30) a quarter less in Best for me, and no stop asks you to eat when you're
  nearly full or past your sit-down meal limit. "Take food home when I can" stops to-go food filling you.
- **Deals that need a purchase** (`purchase` in CURATE: Firehouse's buy-one-get-one, Chipotle and Insomnia's minimum
  spend, Jiffy Lube's half-off, Target, Kohl's) are Off by default under What I'm after.
- A beam search picks the order; a second pass tries fitting an unused stop in front of any wait of 15 minutes or more
  (breakfast while a 9:00 opening comes round). "Other places you could go next" looks three stops ahead.
- Rules: arrive at least 5 minutes before a deal ends; a deal's own hours win when they don't overlap the store's
  (Texas Roadhouse hands out vouchers at lunch, its dining room opens at 4); one haircut a day.
- Drive times are OSRM's, computed ahead of time from a grid of points about every 800 m to every store, so a phone
  times its own trip and its location never leaves it.
- Store hours: where a store's own Wednesday hours aren't known, the chain's usual hours from CURATE (`hours`: Kwik
  Trip 24 hours, Casey's 5–10 PM, Circle K 5–11 PM, each from the one store of that chain whose hours are known),
  else the category's; shown as "usual hours, about".
- `firebase.json` serves the planner's JSON with `no-cache` (9 Nov 2026), so a rebuild reaches phones at once and
  `deals.json` and `drive.json` can't come from different builds.

## Route line on the Map (roads.js v1.0, 9 Nov 2026)
9 Nov 2026: "I would like to see an actual route line depicted on the map." He approved the plan and the privacy
wording the same day ("Build it as written").
- The Map draws the current route at once as a straight dashed line through the stops (offline, nothing sent). Then
  `roads.js` asks OSRM's public server (`https://router.project-osrm.org`, the demo server `drive_matrix.py` also
  uses, run by FOSSGIS e.V.) for the road shapes of the store-to-store legs, and each solid road leg replaces its
  dashed one as it arrives.
- **Never the position.** Only store coordinates, which are public places, are sent. The leg from you (GPS, start
  point or last marked stop) to stop 1 is always a straight dashed line drawn in `app.js` (`drawRoute`), and
  `roads.js` only ever receives each stop's id, latitude and longitude. With no location or start, there is no first
  leg. `tests/veterans-map.test.js` loads the page in a browser with a made-up start point and a made-up GPS fix and
  checks every coordinate sent is a store's.
- **Load on OSRM's demo server** (its terms: at most one request a second, reasonable non-commercial use, no uptime
  promise): one request covers the stretch of the route that has no road shape yet, and each leg is kept for the visit,
  so marking a stop, the 30-second refresh and re-plans that reuse legs send nothing. At most one request a second,
  8-second timeout, and a leg that failed waits a minute. Requests happen only while the Map tab is open.
- OSRM's answer (`overview=full&geometries=geojson&annotations=distance`) is one line for the whole run; leg i has as
  many segments as `legs[i].annotation.distance` has entries and neighbouring legs share their joining point (checked
  against the live server, 9 Nov 2026; a real answer is in `tests/fixtures/osrm-route.json`). An answer that doesn't
  fit is refused and the legs stay straight.
- Look: ink on a paper halo (`app.css`), solid by road, dashed where straight, in its own Leaflet pane (`vdroute`,
  z-index 450) over the store dots and under the numbered stops; the line ignores taps, so the dots under it still open.
  Legend keys "Your route by road" and "Straight line: from you to stop 1, or until roads load"; each legend key now
  wraps with its label. The attribution reads "Routes: OSRM"; the note under the map adds "Road lines: OSRM. A road
  wrong? Fix the map ↗" (FOSSGIS asks for credit and a fix-the-map link).
- Page text (approved wording): a second paragraph under Your privacy (what OSRM sees, that FOSSGIS keeps
  requests in its server log, never your location or start point, stop 1 hints at your part of town), the Sources line
  ("Drive times and route lines: OSRM, on OpenStreetMap data (route lines from the public server run by FOSSGIS)"),
  and the Me tab's "Everything here stays on this phone. None of it is sent anywhere." (was "Nothing about you is sent
  anywhere", broader than the reports and route line allow).
- Not verified: how long FOSSGIS keeps its logs. Its usage and privacy pages (fossgis.de) sit behind a bot check; its
  about page (routing.openstreetmap.de/about.html) says requests are saved in the server log.
- The map's view isn't fitted to the route, so a long route can run off the default view (offered to the publisher as a
  follow-up, 9 Nov 2026).

## Rebuilding the data
From the repo root (Windows: `python`, not `python3`):

```
python -I veterans-day/build/build_data.py      # research -> data/deals.json (Census geocoder, NWS link)
python -I veterans-day/build/drive_matrix.py    # only when stores change: OSRM tables -> data/drive.json (~2 min)
cd tests && node --test --no-warnings veterans.test.js veterans-engine.test.js veterans-roads.test.js site.test.js
```

`tests/veterans-map.test.js` (the Map in a browser) needs Playwright: see `tests/README.md`.

`tests/veterans.test.js` fails if `drive.json` no longer matches the stores in `deals.json`. Every editorial
decision (which offers, category, minutes at the stop, peak lines, call-first notes, windows) is in `CURATE` at the
top of `build_data.py`. Place ids come from the offer and street address, so they stay stable across rebuilds:
field reports refer to them.

Research (8 Nov 2026): `national-2026.json` (76 chains, sources dated 5–8 Nov), `local-2026.json` (47 local
entries; almost none confirmed for 2026 yet: re-check local businesses, VFW and Legion posts on 9–10 Nov),
`locations-2026.json` (60 chains), `osm-matches.json` (OpenStreetMap places matched by brand), and
`extras-2026.json`: what the route can't hold, shown at the end of Deals: `other` (other days, region-wide perks,
places outside the metro, each with a grade and sources) and `leads` (places with a Veterans Day deal in an earlier
year only; not routed or mapped, "call first").

**Review against the consolidated report (8 Nov 2026 evening):** 13 deals added (Blaze Pizza now that its address
is known; Walgreens 8–11 Nov; Sonic and 7 Brew from 2026 lists; Air Museum coffee hour; Harwood Legion stew; and
seven local offers that only one compiled 2026 report carries, graded C with "Only one unconfirmed 2026 listing:
call first": Village Inn, Sickies, Brewtus' West Fargo, Pub West, Cash Wise Moorhead deli, Sandy's, Blarney Stone),
stores added (Kwik Star 4501 37th Ave S, Fryn' Pan downtown Fargo), the Air Museum program up to A (the museum's own
events list), and Target, Kohl's and West Fargo VFW details. Left out on purpose: Smashburger (closed), Famous
Dave's (closed), Hy-Vee, Red Robin, Golden Corral, Hooters (no metro store), Charleys (no address; added later that night), Dickey's (closed).
- A store's `geo` ("lat,lng", from OSM or a checked geocode) is used before the Census geocoder, so an address it
  reads two ways lands right. Local entries can list several `stores`.
- `BLOCKED_HOSTS` in `build_data.py`: fargobites.com redirects every page to an unrelated "verify" site (seen 8 Nov
  2026), so its citations stay as text with no link; a test fails if any source links it.
- Bars are their own category, `bar`, **on** by default since the follow-up the same night ("Add the bars"), with a
  drive-safe line (`DRIVE_SAFE` in `app.js`) on every bar card and under any route with a bar. Ten bars moved from the
  earlier-years list onto the route as grade C (Drekker, Swing Barrel, Mills Lounge, O'Kelly's, Frank's Lounge, Mick's
  Office, J.C. Chumley's, BorderTown, and Hen House and Spitfire, which need a purchase). No cap on bars per route:
  a Maximize day can include three or four; the publisher chose to leave it so (8 Nov 2026).
- Same follow-up: the publisher confirmed Fryn' Pan, Doolittle's and Porter Creek have 2026 deals (grade A; details not given,
  so the cards show last year's free meal); Hardee's added from a recollection of a 2025 free breakfast sandwich (grade C,
  breakfast hours, the two stores on Hardee's locator; nothing published); Caribou's wording fixed to last years'
  small coffee with spouses (all 18 locator stores were already on the map).

**Re-check, 8 Nov 2026 night (the Tuesday checklist, run early; with his file of the VA, Military Wallet, American
Legion and Fargo Legion Post 2 lists):** now 68 deals at 166 stores (A 18, B 23, C 27).
- **No Fargo-Moorhead media roundup for 2026 existed yet** (KFGO, InForum, Valley News Live, WDAY, KVRR, Froggy, Fargo
  Underground and the radio sites all checked). In 2023 they came out 9–11 Nov, so look again on Tue 10 Nov.
- **Up to A** (the business's own 2026 page or release, read 8 Nov): Applebee's (its release as carried by FSR,
  2 Nov), Chili's, Ruby Tuesday, Wendy's, Firehouse Subs, Chipotle (not spouses), Freddy's, Pilot, Blaze (its
  GlobeNewswire release), Scooter's, Great Clips, Tommy's Express; the Air Museum's Veterans Coffee Hour (its own
  calendar lists Wed 11 Nov 2026, 10:00–12:00); Cash Wise's free chicken dinner (its own page, which gives no year
  but says "Wednesday, November 11", a Tuesday in 2025), now at all four metro stores with "call yours first".
- **Stay B, no word from the company:** Denny's (only 2025's release found), IHOP, Texas Roadhouse, Qdoba and
  Applebee's sites refuse automated reads; Olive Garden and Red Lobster carry "Not announced by the company for 2026:
  call first" (`NO_COMPANY_WORD`). IHOP now runs 7 AM–7 PM (the Legion's 2026 list).
- **Changed:** Perkins C to B (Fox 4's 2026 list, 4 Nov); Casey's loses "free car wash" (not on its own page);
  Target reads "one qualifying storewide purchase" (VA News); Twin Peaks names its menu; Pizza Ranch and Village Inn
  cite Post 2's 30 Oct list (still C: that list repeats older national offers).
- **Added:** Charleys, inside the Petro Stopping Center at 4510 19th Ave S next to Popeyes (location confirmed; B,
  "participating stores"); Royal Buffet, 1620 32nd Ave S (C, call first: free buffet 9–11 Nov on Post 2's list, the
  same offer as 2023; moved from the leads); Tractor Supply's 10% for Hometown Heroes under other days and perks (B,
  VA News; join and verify through ID.me first).
- **Checked and left out:** no metro Old Chicago, Green Mill or Crooked Pint (the Fargo Crooked Pint closed May
  2025), Bruegger's or Dave & Buster's; no Fargo-area Grace for Vets wash found; Lowe's has only its year-round 10%;
  Super Buffet's free meal was Sun 8 Nov only; the Air Museum isn't free on 11 Nov (its free days are branch
  birthdays). No 2026 word found for the posts, bars or other C entries, and the publisher had confirmed none by phone yet.
- No tips had come in through the page (the `tips` table was empty).
- Seen, not changed: a deal's `caution` shows on Route cards only, not on the Deals list.

## Field-report service (`worker/`, Cloudflare Worker `vetday` + D1 `vetday`, free tier)
Anonymous: a report is a place, an offer, an outcome (worked, away, out, line + minutes) and a time. Abuse limits
use a salted hash of the caller's IP; the salt is random per UTC day and deleted after two days, and the hashes are
wiped from reports after two days. `GET /v1/state` serves one stored summary row (cheap on D1's free read quota),
rebuilt on every write and at most every five minutes otherwise. Tests: `cd worker && npm test` (Node's built-in
SQLite stands in for D1).

**Live** since 8 Nov 2026 at https://vetday.metacog.workers.dev (D1 `vetday`, id in `wrangler.jsonc`). To redeploy
after a change: `env -u CLOUDFLARE_API_TOKEN npx wrangler@4 deploy` from `veterans-day/worker`.

**First deploy (done 8 Nov; kept for reference).** The `CLOUDFLARE_API_TOKEN` on this machine can't deploy Workers, so the account owner signs in once:

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
