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

## How it decides (engine.js v1.4, tested in `tests/veterans-engine.test.js`)
- **The Route tab** (the main page since 9 Nov 2026, replacing Next and Plan): settings at the top (start point,
  leave time, done-by time, goal, what you're after, take food home), then one route that rebuilds on every change,
  every stop you mark, every report and every 150 m you move. Stop 1 is the big card; each later stop shows when
  you'd arrive against when its deal ends, with a bar (blue the deal's hours, amber your visit) and red text when
  under 25 minutes are left. "Ending soon, not on your route" lists deals closing within two hours, with "Add to my
  route" (a pin). The Map draws the same route.
- **Optimal** (10 Nov 2026; the default since then): the best deal of each kind, never two of the same kind
  within 3 hours. See "Optimal" below.
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
wording the same day ("Build it as written"). **Live** since about 12:30 PM CST 9 Nov 2026 from `8db32a6`.
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
- **Fit to the route** (9 Nov 2026: "Yes, fit it"; live from `6e104cb`): opening the Map tab zooms to the route's stores, up to zoom
  15. Your position isn't part of the fit, so a far-off start can sit outside the view. After that the view is yours:
  the 30-second refresh, reports and re-plans don't move it; leaving the Map and coming back fits it again. Tested in
  `veterans-map.test.js`.

## Phone layout (9 Nov 2026 evening, "every tab is a horribly long scroll, especially on phone screens")
Measured at 375×812 before and after: Route 6,896 → about 2,700 px, Deals 36,227 → 6,000, Me 4,882 → 2,000,
Map 3,195 → 1,360. Live from `2e8f9c5` about 6:20 PM CST 9 Nov 2026 (approved); the live files matched the
local ones and the live page showed no console errors at phone size.
- **Tabs stick to the top** (`nav.tabs` moved out of `<header>`, z-index 1100 over Leaflet's 1000). Switching tabs
  opens the new one at its top (`renderAll`, `switched`).
- **About folds** into one closed `<details id="about">` under every tab (it was 1,943 px on each). Its h3s and
  privacy text are unchanged, so the house-layer tests still hold.
- **Route:** the settings fold to one line ("Leave now · done by 9:00 PM · Best for me · 1 off", `#rb-set-sum`);
  the preview box is two lines; each later stop folds to its number, name (two lines), timing and bar, with the
  address and buttons on a tap; five later stops show, then "Show all"; "Other places you could go next" and "Get
  ready" fold (Get ready no longer opens itself in preview). Print lists and opens every stop (`beforeprint`).
- **Deals:** 20 cards, then "Show all"; each card keeps name, chips, offer, times, the drive-safe line on bars and
  sign-ups, and folds proof, limits, notes, locations and sources under "Details". Category chips scroll sideways on
  phones. Other days, earlier-year leads and the tip form fold.
- **Me:** My day so far first; short options two to a row; What I like (also under Route settings) and vetoes fold.
- Open stops and deal cards stay open through the 30-second refresh (`openStops`, `openDeals`). Folds use margins,
  not grid gap, because older Safari won't lay out `<details>` as a grid.
- Also fixed: `mins()` could print "1 h 60 min"; durations keep to one line; axe (WCAG 2.2 AA) is clean on every tab
  in light and dark with folds open and closed (the What I'm after chips' spoken names now start with their visible
  words, and the hidden "Opens in a new tab" note sits in the footer landmark).

## Areas (app v1.2, engine v1.3; live since about 9:40 AM CST 10 Nov 2026 from `62c984c`, approved; pushed)
9 Nov 2026: "I have friends in New Salem, ND who would like to see this optimized for their location, too. Also
have friends in the Rosedale, Plymouth, and Maple Grove areas of the Twin Cities ... a dropdown box in an upper corner
... I want the program to maintain initial focus and landing on Fargo-Moorhead."
- **The picker** is an Area select in the top bar's right corner, beside Time (on phones the bar wraps: home link,
  Area, Time). Areas, in order: Fargo-Moorhead, ND/MN (the default), Bismarck-Mandan & New Salem, ND, and Twin Cities:
  Plymouth, Maple Grove, Roseville. A first visit lands on Fargo-Moorhead. A pick is saved on the phone (`S.area` in
  `vd2026-v1`) and becomes that visitor's landing area. A link with `?area=bismarck-mandan` or `?area=twin-cities`
  opens that area and saves it, so anyone can send friends a link. Picking Fargo-Moorhead removes the parameter. Switching
  reloads the page with that area's files.
- **Files:** Fargo-Moorhead keeps `data/deals.json` and `data/drive.json` (unchanged apart from a `meta.region` block);
  each other area has `data/<id>/`. `meta.region` gives the name, centre (where drive times start without a location),
  map zoom, NWS place and the transit line on bars. `AREAS` in `app.js` lists the ids and folders; the test checks the
  select, `AREAS` and the folders agree.
- **Per area on the phone:** a start point per area (`S.starts`; the old single `S.start` is moved to Fargo-Moorhead's),
  the last marked stop only in its own area, and a GPS fix more than 15 km from an area's grid counts as "outside":
  drive times then start from that area's start point or centre, and the location line says so. Marks, vetoes and pins
  are by offer id, so they follow you across areas (a chain's offer is one a day anyway). Shared reports are filtered
  to the area's stores; the Me tab's community total covers every area and says so. A tip's address gets the area's
  name added.
- **Overrides** (`overrides` table): an offer id (`applebees`) now pulls that chain's deal in every area. To pull one
  store, use its place id. Place ids never repeat across areas (a test checks).
- **Engine v1.3:** `offer.arriveBy`, for a ceremony with a start time: the route must get you there by then, not just
  5 minutes before it ends. Set by `arrive_by` in CURATE for the ceremonies (Heritage Center 9:45, All Veterans
  Memorial 11:00, University of Mary 10:00 since 10 Nov, Maple Grove 11:00; in Fargo-Moorhead since 10 Nov the Air
  Museum program 11:00 and the Nativity Mass 8:30). West Fargo VFW keeps an older, unused `arriveEarly`: its stew
  runs into the afternoon, so its 10:45 flag raising isn't a deadline.
- **Stores** (`build/stores_region.py <area> <cache folder>`, writes `research/<area>/locations-2026.json`): All the
  Places (alltheplaces.xyz, CC0), the chains' own store finders as scraped weekly; run 31 Oct to 7 Nov 2026, or an
  earlier week for five chains whose spider failed (Blaze 24 Oct; Red Lobster, Charleys, Shake Shack, Red Robin 17 Oct;
  Pilot 10 Oct). A store found there is "confirmed". OpenStreetMap (Overpass) adds a store as "unverified" (the card
  says "address from directories") only where the chain's list has nothing in the area, or is known to be partial
  (`PARTIAL`: Wendy's list has no Twin Cities store; Little Caesars' has no North Dakota store). Where the chain's list
  covers the area, an OpenStreetMap-only store is left out as likely closed (logged; for example a Golden Valley
  "Red Lobster" that is now an American Legion). Chains All the Places lacks come from OpenStreetMap: Olive Garden,
  Cracker Barrel, Casey's, Holiday, Tommy's Express, Mission BBQ, Granite City, Marcus. Hy-Vee's list is pharmacies
  without coordinates, so its New Hope store is from OpenStreetMap. Wednesday hours come from the lists'
  `opening_hours` ("00:00-01:00,09:00-24:00" reads as 9 AM to 1 AM); an OpenStreetMap tag that closes before noon is
  ignored (usual hours instead). Addresses without a street or town are left out.
- **Known gaps:** no Little Caesars on either new map (neither source lists one there with an address); Bismarck has
  no Chili's, Red Robin, Hooters, Golden Corral (likely closed) or Walgreens in the lists; the Twin Cities area has no
  Texas Roadhouse, IHOP, Little Caesars, Pizza Ranch or Sonic in it.
- **Fargo-Moorhead's notes stay there.** National entries were researched for Fargo-Moorhead first, so outside it
  the build drops note sentences that mention Fargo, Moorhead or FM (`strip_fm`), and CURATE's `fm=dict(...)` holds
  Fargo-only cautions (Kwik Star, the Petro truck stop, Scooter's new store, Sport Clips' address, Ruby Tuesday, Granite
  City). `elsewhere=dict(...)` replaces text outside it (Pizza Ranch, whose 2026 report is a sign at the Fargo store).
  `only=(...)` limits an entry to some areas: Hardee's stays Fargo-Moorhead only (a recollection of a Fargo store), and
  Red Robin, Outback, Golden Corral, Smashburger and Hy-Vee are the other areas only. A test fails if a new area's offer
  mentions Fargo, FM, Moorhead, Kwik Star, the Petro or MATBUS.
- **Public wording:** the new areas' local entries show a note written in CURATE (`show=dict(notes=..., offer=...)`);
  the research helpers' first-person working notes stay in `research/<area>/notes.md` and `local-2026.json`. The
  Deals-list items were reworded the same way. A test fails if a person's name, "I could…" or "my estimate" reaches the page.
- **Drive tables:** `drive_matrix.py` lays each new area's grid over its circles (`areas` in REGIONS) plus 1 km, so New
  Salem has start points of its own: Bismarck-Mandan 735 points (658 kept), Twin Cities 696 (689 kept). From a New
  Salem start, the first Bismarck stop timed at 38 minutes (I-94, about 35 miles).
- **Bismarck-Mandan and New Salem** (research `research/bismarck-mandan/notes.md`, from the research report
  `Downloads\Veterans Day 2026_ Deals and Events for a New Salem, ND Veteran.md`, checked 9–10 Nov): circles Bismarck
  and Lincoln (10 km), Mandan (5 km), New Salem (3 km). Local on the route: the ND Heritage Center program (A: KX News,
  4 Nov 2026, organizers quoted; choir 9:30, program 9:45; end time not published, 11:00 assumed), the All Veterans
  Memorial at 11:00 (C), AMVETS Post 9 lunch (C, earlier years), the University of Mary's Veterans Day Mass at 10:00
  and free brunch (A since 10 Nov: its own 27 Oct 2026 post; it was graded C from 2025's 11:00 service), the Mandan
  Middle School Field of Flags (B, daylight). Under Deals: New Salem's Post 91 program (no
  2026 time; call 701-587-1215), the Elks Veterans Feed Thu 12 Nov (seatings not found), Theodore Roosevelt NP fee-free,
  the disabled-veteran park pass, CAT's half-price veteran fare (no free rides), closures; the Bismarck VFW is a lead.
  **Corrections to the research report:** the ND Legion history's "Auxiliary stew dinner" line belongs to Fairmount Post 106,
  not New Salem; the State Museum's hours pages don't list Veterans Day as a closure; the Glen Ullin school program was
  Tue 10 Nov 8:30 AM (past by the time this was built, so left out). All of Morton County is on Central time
  (since 26 Oct 2003; 49 CFR 71.7). KX News pages sit behind a bot check, so some KX details are from search summaries.
- **Twin Cities: Plymouth, Maple Grove, Roseville** (research `research/twin-cities/notes.md`): circles Plymouth
  (7 km), Maple Grove (6 km), Roseville around Rosedale Center (6 km); drive times start from the middle of Plymouth.
  Local on the route: the Maple Grove tribute, Central Park Veterans Memorial, 11:00–12:00 (A, the city's events page),
  Malone's Arbor Lakes and the Tavern Grill Arden Hills (B, 6 Nov 2026 lists; addresses from directories). Under Deals:
  5-8 Club, Tria (North Oaks) and Kendall's (Coon Rapids), just outside the area; the state ceremony in Duluth; the
  Minnesota Zoo, Museum of Illusions and Science Museum; Metro Transit (free only with a VA ID marked Service Connected,
  which the bar line says). No 2026 ceremony was found for Plymouth or Roseville; Plymouth's veterans breakfast was
  Thu 5 Nov.
- Checked 10 Nov in the `hub-main` preview: Fargo-Moorhead lands first; picking each area loads its deals, title,
  heading, forecast and centre and saves the pick; a plain address then opens the saved area; the Twin Cities Map
  draws the route by road; no console errors; no sideways scroll at 375 px. axe (WCAG 2.2 AA) clean on Route, Deals and
  Me in all three areas, light and dark, desktop and phone. 86 node tests and the 28 browser tests pass. Totals:
  Bismarck-Mandan and New Salem 33 deals at 49 stops (A 10, B 17, C 6); Twin Cities 34 deals at 181 stops (A 10,
  B 22, C 2); Fargo-Moorhead unchanged at 69 deals, 168 stops. After the 10 Nov re-check: Fargo-Moorhead 71 deals at
  171 stops (A 20, B 26, C 25), Bismarck-Mandan 33 at 49 (A 11, B 17, C 5), Twin Cities 34 at 181 (A 10, B 23, C 1).

## Reston & Northern Virginia (fourth area; live since about 10:35 PM CST 10 Nov 2026 from `fe2187a`, approved; pushed. Updates live from `fd2e434` and `ae0d44d`, about 11:00-11:10 PM, pushed)
10 Nov 2026: a fourth area for a colleague in Reston, VA. The first pass (research, REGIONS, CURATE, the store
script, the picker and the test change) was made in Antigravity (Gemini) that evening, which stopped before building.
Claude checked it against the sources the same night, corrected it and built it. Research and every correction:
`research/reston-va/notes.md`.
- **Area** `reston-va`, "Reston & Northern Virginia, VA", `?area=reston-va` (aliases `reston`, `herndon`, `tysons`,
  `fairfax`, `nova`). Circles: Reston and Herndon 7 km, Sterling and Dulles 5.5, Vienna and Tysons 5.5, Fairfax and
  Fair Oaks 6.5. Start presets: Reston Town Center, South Reston, Herndon, Sterling, Tysons, Fairfax.
- **Eastern time.** The first area off Central: REGIONS carries `tz`, `tz_offset_min` (-300), `tz_abbr` and `day_start`
  (05:00 UTC), and `local_iso` takes the area's day start, so windows read "EST" and the engine's mealtimes use the
  area's offset (`meta.tz_offset_min`). Clock times on the page come from the shared time module, so a phone shows its
  own zone. The area test now reads each area's own `day_start` and zone.
- **Totals:** 44 deals at 178 stops (A 16, B 27, C 1) on 10 Nov; 49 at 199 (A 18, B 30, C 1) since 11 Nov; drive table from Reston Town Center's grid. Local on the
  route: the RTC Run for Valor 5K (A; $35 to run, so a purchase deal, Off by default), Herndon's ceremony at 11:00 (A),
  Fairfax Post 177's at 10:30 (A), The Kensington Reston 2-4 PM (A, RSVP or call first: a senior-living community),
  Chick-fil-A Metro DC's free entree at its 10 participating stores here (A), Founding Farmers' 50% off brunch, lunch
  or dinner (A, purchase), Ted's Bulletin's tart (B). Chains new to the planner: Wawa, Sheetz, Bonefish, California
  Pizza Kitchen, Fogo de Chão, Bar Louie (Carrabba's has no store in the circles).
- **Corrections to the first pass** (all 10 Nov): sources were sites' home pages with a placeholder date, now the pages
  that carry each offer; the 5K starts at RTC Window Plaza on Opportunity Way (not the Pavilion) and costs $35;
  California Pizza Kitchen and Bonefish A to B (no 2026 word from the company), CPK's BOGO card dropped (no source);
  Founding Farmers' discount excludes breakfast; Jimmy's Old Town Tavern (no offer found) moved to the leads;
  hand-typed pins 50-700 m off replaced from OpenStreetMap; hand-typed Chick-fil-A addresses removed; the transit line
  names only what WMATA confirms (half fare for veterans rated 60% or more, with Metro's Reduced Fare SmarTrip ID).
- **`stores_region.py` fixes:** a failed All the Places download now prints a warning and says so in the basis (it
  read "0 in the area", and the first pass's `except BaseException` also caught Ctrl-C); a town given only in
  `addr:full` is used (Fogo de Chão Tysons was dropped for it); campus Chick-fil-A counters are skipped. The download
  cache `.atp-cache/` (about 90 MB) is in `.gitignore`.
- **Added 11 Nov 2026 about midnight CST** (WTOP's list, loose ends, an attached report; now 49 deals at 199
  stops, A 18, B 30, C 1): Silver Diner 25% off an entree (B, five stores from its locator), The Melting Pot Reston's
  free fondue meal with a second one bought (A, its own page; 5-9 PM), Grace for Vets' free car wash at seven Flagship
  Carwash sites (A, its own list), Paisano's free large pizza (B, Food Network; seven stores from its locator) and
  Frying Pan Farm Park's free wagon rides 10-3 (B, FFXnow; a new kind, `outing`). Extras: DC Prime to A, Udvar-Hazy's
  free parking for veterans, Metro's free parking, the Great Falls Freedom Memorial ceremony, the Park Authority's
  rec centers and Lake Fairfax camping, the Army museum, Springfield Post 176; Crafthouse Reston as a lead. The Greene
  Turtle is out (no store in the circles; Dulles Town Center closed). Founding Farmers' hours are now its own
  (11 AM-10 PM). Local stores can carry `"status": "confirmed"` and a `url` when they come from the business's own
  locator, so the page doesn't call them "from directories". Details: `research/reston-va/notes.md`.
- **Page fixes, 11 Nov:** the Deals search and Route quick-add example text is each area's own (`AREA_EXAMPLES` in
  `app.js`, tested so every word finds something in its area; Fargo's said "Mandan", which found nothing there), and
  an offer's `cost_text` replaces "free" where that misleads: the 5K reads "$35 to run; free to watch" (its value and
  worth for the engine are unchanged).
- **Practice marks clear when the day starts (every area; approved, 11 Nov):** "Got it", "Turned away", "They ran
  out" and "Skip" tapped in the preview were saved with the preview's clock and hid those deals on the day (and
  `S.last` could set the start point). The preview clock always sits on the half hour of the day, so `clearPreviewMarks`
  in `app.js` drops any `done`, `away`, `strikes` or `last` stamped exactly there once the area's day is live, on every
  render, which also covers phones that saved marks before the fix; "Not today" vetoes stay. Tested in
  `veterans.test.js` and in the preview with `?now=`. **Testing warning:** `localhost:5055` and `:5056` are on the
  report Worker's allowed origins, so a tap with `?now=` set inside the day sends a real report. Don't tap the report
  buttons in live mode locally (on 11 Nov a test "worked" at Sheetz went in and was deleted, approved).
- **Mission BBQ Herndon** (11 Nov, from an attached report): OpenStreetMap had only Sterling; both stores now from
  Mission BBQ's own pages (11 AM-9 PM). 49 deals at 200 stops.
- **Store lookups:** All the Places has no Bar Louie spider; Carrabba's is `carrabbas_italian_grill`; Krispy Kreme's
  name was right (one failed download). None of the three changes the stores.
- **Fixed the same night (every area):** Antigravity's `59c4f9e` (live since about 5:30 PM) called `E.driveMinutes`,
  which the engine never had, so every deal card and the Route tab's quick-add search threw and the Deals tab was
  blank. `placeDriveInfo` in `app.js` now reads the route's drive table (`ctx.fromPos`, seconds from you to each
  place, no parking) and falls back to a straight-line estimate. `veterans.test.js` checks every `E.` name `app.js`
  uses exists in the engine.

## Reno–Sparks (sixth area, the first on Pacific time; built 11 Nov 2026 on branch `vetday-reno-sparks`)
10 Nov 2026: an area for colleagues in Reno and Sparks, NV, from his research report of that evening. Every offer
was opened at its own source the same night and graded; research, corrections and the judgment calls made without
`research/reno-sparks/notes.md`.
- **Area** `reno-sparks`, "Reno–Sparks, NV", `?area=reno-sparks` (aliases `reno`, `sparks`, `reno-nv`, `washoe`).
  Circles: Downtown, Midtown and west Reno 6 km, Sparks and the Marina 6, South Meadows and South Reno 5.5. Drive
  times start from downtown Reno (the Virginia Street Bridge). Start presets: downtown, Midtown, Northwest Reno,
  Sparks (Victorian Square), Sparks Marina and Legends, South Reno. Drive table 520 of 563 grid points.
- **Pacific time.** REGIONS: `tz` America/Los_Angeles, `tz_offset_min` -480, `tz_abbr` PST, `day_start` 08:00 UTC
  (2 AM CST). Nothing in the app or engine assumed Central beyond the engine's default offset when a file has none:
  the preview cutoff and practice-mark stamps are relative to the area's day start, mealtimes use
  `meta.tz_offset_min`, and the report Worker has no day window. Tests: every area's `day_start` is local midnight in
  its own zone with a matching offset and zone name on its windows; Reno's Denny's, J Resort and parade times in UTC;
  and the engine plans a Pacific copy of its test town exactly as the Central one, two hours later in UTC.
- **Totals (11 Nov 2026, after phase 2):** 42 deals at 138 stops (A 15, B 26, C 1); 8 other-day and region-wide
  items; 13 leads. Phase 1 had 40 at 136 (A 13, B 26, C 1) and 12 leads.
- **Local on the route:** J Resort's buffet 4-9 PM (A; current and retired military only), Atlantis's lunch buffet at
  Toucan Charlie's 11-3 (A; one per person for 9-11 Nov; Monarch Rewards), Legends Bay's LB Grill breakfast or burger
  7 AM-10 PM (A; veterans; LB Rewards), Gold Dust West (A; current and retired military; hours not published, call
  first), Squeeze In's free meal (A; its post names no stores, so all four here with call first), In-N-Out (B; on 2026
  national lists only, call first), the Reno parade (A since phase 2, the City of Reno's own release of 3 Nov 2026;
  11:11 opening at the Virginia Street Bridge, `arrive_by` 11:00), the Sparks Marina observance 9-11:30 (A, the plaza's
  own site), the Nevada Museum of Art free for veterans and active duty 10-6 (B; call first, since its own visit page
  says it closes on national holidays), BJ's free Pizookie in Sparks (B, call first) and the Retro Radio Dolls'
  Veterans Day show at Reno Public Market 5-7 PM (A, the market's own page; admission not stated). The players' clubs use the sign-up-ahead handling (`advance_signup`).
- **Under Deals:** RTC Washoe's free rides for everyone all day (A; also the bar cards' transit line), Casino Fandango in
  Carson City (A), Virginia City, Fallon, Truckee and South Lake Tahoe events (B), NPS fee-free (A), the museum's free
  Saturday. Leads: Peppermill, Western Village, Grand Sierra (its page is 2024's), the Nugget, the Caesars downtown
  casinos, Marked Studios, Black Bear Diner, Chick-fil-A, Jiffy Lube, the AUSA dinner (registration closed), Dragon
  Lights, the Automobile Museum, Maverik (free coffee in 2024).
- **Stores:** 125 at 32 chains from All the Places and OpenStreetMap, using the main checkout's `.atp-cache`. In-N-Out
  added (`innout`). `stores_region.py` now reads a street given only in `addr:full` (Twin Peaks Reno was dropped for
  it); other areas weren't re-run. Golden Corral, Smashburger, Cracker Barrel, Circle K, Freddy's have no store here;
  Grace for Vets has no Nevada wash.
- **Corrections to the report:** Atlantis's page shows 2026's dates; J Resort and Gold Dust West name current and
  retired military, not all veterans; no Grace for Vets wash in Nevada; Legends Bay and the Sparks observance are A from
  their own pages; the museum's free day is only in Fox 11 (B); In-N-Out has no company word (B); Squeeze In names no
  stores. Full list in the notes.
- Checked in a preview on port 5058 at 375 px: the area loads from `?area=reno`, Optimal builds 14 stops at 8 AM PST,
  Deals lists 40 of 40 with Pacific windows shown in the viewer's zone, the Map draws, no sideways scroll, no console
  errors apart from the report Worker refusing that port's origin. 102 planner tests pass.
- **Phase 2 (11 Nov 2026, about midnight CST, the evening of 10 Nov in Reno):** a wider pass of local news, city,
  county and state pages, casino pages, posts and the open items, with This Is Reno, reno.gov and Instagram read in
  Chrome. The City of Reno's own release raised the parade to A; the museum's own visit page (closed on national
  holidays) added "call first"; BJ's (Sparks) and the Reno Public Market show were added; Dickey's (its only Nevada
  store is in Carson City) and Lazy Dog (none here) were left out; Maverik became a lead. Nothing on the 11th had
  ended (Reno's day hadn't begun); UNR's flag retirement and the VA canteen breakfast were Tuesday 10 Nov. Drive
  table rebuilt (520 of 563 grid points); 102 tests pass; checked on port 5058. Details: the notes' "Phase 2".

## Fort Meade, MD (built 11 Nov 2026 about 1 AM CST on branch `vetday-fort-meade`; the coordinating session merges and deploys it)
10 Nov 2026 night: an area for colleagues at Fort Meade, on Veterans Day itself. Built from a Claude research report (`Downloads\Veterans Day 2026 Near Fort Meade_ Deals, Freebies, Events and Closures.md`, 10 Nov about 11 PM CST)
and the coordinating session's leads, each read at its own source on 11 Nov 2026. Every check, correction and judgment
call: `research/fort-meade/notes.md`.
- **Area** `fort-meade`, "Fort Meade: Odenton, Laurel, Columbia, MD", `?area=fort-meade` (aliases `meade`, `ft-meade`,
  `fort-meade-md`, `odenton`, `laurel`, `columbia`, `gambrills`, `severn`). Eastern time, like Reston (`tz`,
  `tz_offset_min` -300, `tz_abbr`, `day_start` 05:00 UTC). Circles: Fort Meade and Odenton 6 km, Gambrills and Crofton
  4.5, Severn/Hanover/Arundel Mills 4.5, Laurel 5, Columbia 6. Drive times start from Odenton; start presets for
  Odenton, Fort Meade (on post), Waugh Chapel, Arundel Mills, Laurel and Columbia. Drive table: 770 of 806 grid points.
- **Totals:** 41 deals at 125 stops (A 9, B 30, C 2); 15 items under "Other days and places"; 1 lead.
- **Local on the route:** Chick-fil-A Metro DC's free entree at its one participating store here, Laurel (13600
  Baltimore Ave; A, its own list; the other nine Chick-fil-A stores in the circles aren't on it and are dropped), Silver
  Diner Elkridge (B), Grace for Vets at Flagship Carwash, Severn (A, its own list), The Greene Turtle's free dine-in meal
  up to $15 (B, WTOP 9 Nov; two stores from directories, call first), Main Event Columbia (B: its own page has no year;
  American Legion 5 Nov), All American Steakhouse Odenton and KPOT Laurel (C, one 2026 list, call first). No 2026
  ceremony was found inside the circles; Crownsville, the WWII Memorial and Annapolis (all 11:00) are under Deals.
- **On post:** stores whose address reads "Fort Meade, MD" need installation access, so they stay off the route
  (`on_post` in REGIONS; the Exchange food court's Charleys, Qdoba and Starbucks, Dunkin' on Mapes Rd, a second Qdoba).
  The Exchange's 6-12 Nov sale and 11 Nov challenge coins, the commissary's 9-5 holiday hours and MWR's holiday hours
  (DFMWR's 17 Aug 2026 sheet: bowling noon-4, Gaffney 8-noon, Murphy Field House 24/7 for registered users, the rest
  closed) are under Deals.
- **Bar line transit:** MDOT MTA's free rides on 11 Nov for veterans, active duty, Guard and Reserve (service alert
  29401, 9 Nov) with a DoD ID, VA ID or MVA Veteran designation (no DD-214).
- **Stores fixed from the chains' own pages:** Mission BBQ's three (Gambrills, Laurel, Columbia; 11 AM-9 PM), Golden
  Corral's house number (7047 Arundel Mills Blvd). `stores_region.py` accepts "Maryland"; `split_addr` reads MD.
- **Corrections to the research report** (details in the notes): MTA doesn't take a DD-214; Red Robin has no Gambrills store
  (Columbia only); Bob Evans has none in Gambrills or Laurel (Columbia only); Outback has Laurel too; Red Lobster
  Arundel Mills is on the chain's own list; Great Clips has two salons in the circles, not many; Mission BBQ and Shake
  Shack stay B (no 2026 company post); Silver Diner Elkridge is inside the area; Robinson Nature Center isn't
  confirmed open; Prince George's County (most of Laurel) closes offices, schools and libraries; MWR's 2026 hours exist;
  Col. Joshua Patton has commanded the garrison since 15 Oct 2026; the Cryptologic Museum's holiday opening is
  unconfirmed (not routed); the Greene Turtle has a Veterans Day meal this year; Grace for Vets has a Severn wash.
- **Testing:** the new worktree checked files out with CRLF (system `core.autocrlf=true`), which breaks the
  practice-marks test's regex; converting the working files to LF (git's stored form) fixed it. 99 planner and site
  tests pass on the branch, 102 after merging master's Reno–Sparks area. Checked in a preview on port 5057 (not an allowed report origin) at 375 px: `?area=meade` opens and
  saves the area; 41 of 41 deals; 12-stop Optimal route; the Map draws it by road; no sideways scroll.

## Denver metro, CO (seventh area, the first on Mountain time; built 10-11 Nov 2026 on branch `vetday-denver`; live since about 12:18 AM CST 11 Nov from `24edc10`, pushed)
10 Nov 2026: Denver metro ("metro spread") from his research report, built overnight while he slept under his
instruction to research, build and deploy without asking. Research, corrections and judgment calls:
`research/denver/notes.md`.
- **Area** `denver`, "Denver metro, CO", `?area=denver` (aliases `aurora`, `buckley`, `lakewood`, `littleton`,
  `lone-tree`, `highlands-ranch`, `centennial`, `westminster`, `thornton`, `broomfield`, `denver-co`). Six circles:
  Downtown, Capitol Hill, Cherry Creek and Lowry 8 km; Aurora and Buckley SFB 7; Lakewood and Belmar 6; Littleton and
  Highlands Ranch 6; Lone Tree, Centennial and Park Meadows 6.8; Westminster, Thornton and Broomfield 8.3. Drive times
  start from downtown Denver. Eleven start presets. Mountain time: `tz` America/Denver, -420, MST, `day_start` 07:00
  UTC. No transit line: RTD gives free rides to active duty and youth only.
- **Size.** 725 chain stores sit in the circles, so REGIONS `thin=(6, 6.0, 8.0)`: a chain with more than 6 stores here
  keeps stores 6 km apart (8 km for a deal that needs a purchase), nearest the circles' middles first. `grid_km=1.1`
  spaces the drive table's start points 1.1 km apart (911 of 930 kept; drive.json 2.4 MB). Totals: 101 deals at 397
  stops (A 20, B 79, C 2); `planDay` about 116 ms at 7 AM in node against Reston's 78 ms. Other areas are unchanged.
- **Colorado chains** (shared with Colorado Springs, commit `ffba0e3` on `vetday-co-chains`): 47 chains' 2026 offers
  from the coordinating session's research, appended to `national-2026.json`, each limited by `only` to the area(s)
  with stores. Stores come from All the Places (31 Oct; Yard House and Cheddar's 17 Oct) and OpenStreetMap. Bass Pro
  Shops and Cabela's are one chain with two spiders (a list in SPIDERS). `in_area` in CURATE gives one area its own
  fields: Colorado's Jiffy Lube franchisee gives a free oil change. Rodizio's offer is downtown only (`drop`).
  Whataburger, Wienerschnitzel, Bombshells, Benihana, Pilot and Tommy's Express have no store in the circles.
- **Local on the route** (15 entries): Westminster's ceremony at the Armed Forces Tribute Garden 10-11 AM (A, the
  city's calendar; `arrive_by` 10:00), Wings Over the Rockies free for veterans 10-5 (A), Salt Water Social and STK
  (A, a starter bought), The Melting Pot Littleton (A, a second meal bought), Shucking Good's Blue Island (Cherry Creek
  and Lone Tree), Ash and Agave and Oliver's Italian (B), Thirsty Lion (B), the Rendezvous at Heather Gardens (B),
  discounts at Denver Chophouse, Henry's, ViewHouse and Tamayo (B, purchase), Legacy Ridge golf (B, call first).
- **Under Deals:** free meters in Denver, state parks free, NPS, the zoo's free day (timed tickets, likely gone),
  closures, golf and Bonfire Burritos just outside, Holidaily, Emagine Parker, Cherokee Ranch, the Red Rocks car show,
  Parker and Castle Rock fireworks, Aurora's Veterans Salute (Thu), the Denver parade (Sat), VETEFITS (Sat); 3 leads.
- **Corrections to the report:** Westminster's ceremony is 10-11 AM at 6001 W 104th Ave (the report: time TBA, 6601);
  the zoo's day is for everyone with a timed ticket; Rodizio is downtown only; the fireworks are July 4 shows moved.
- Checked in a preview on port 5059 at 375 px with `?area=lakewood&now=` 8 AM MST: Denver loads, Optimal builds 15
  stops (Sport Clips, Cobblestone, Wings, Good Times...), Deals lists 101 of 101, the Map draws the route by road, no
  sideways scroll, no console errors apart from the report Worker refusing that port. 103 planner tests pass.

## Optimal (engine v1.4, app v1.3; live since about 12:15 PM CST 10 Nov 2026 from `0b12a0d`, approved; not pushed)
10 Nov 2026: the Maximize routes "can include redundant types of locations on the same route in the same time
frame e.g. multiple free coffee grabs within a short window of time ... most users won't want to do that. So the
Optimal route will lead users to the best deals on a path without repeating the same types of stops." His answers
the same day: finer kinds than the Deals categories; a kind may come back after 3 hours; tickets for later don't
count; Optimal is its own button, first, and the default.
- **Kinds** (`kinds` on each offer, from `kinds_for` in `build_data.py`, `kinds=` in CURATE for exceptions): meal
  (breakfast, lunch or dinner, at a table or a counter, post lunches included), snack (chips, fries, popcorn, the
  Bloomin' Onion), coffee (Kwik Trip and Pilot are meal and coffee; the Air Museum's coffee hour is coffee), sweet
  (donuts, cookies, shakes; Dunkin's offer is a donut), bar (bars with a free meal are bar and meal), haircut, car
  wash, oil change, shopping, ceremony (a program that also feeds you is ceremony and meal: West Fargo VFW, AMVETS
  Post 9, the University of Mary), memorial (the All Veterans Memorial, the Field of Flags), flag (Scheels), games
  (Dave & Buster's). A ticket for later has none. A test checks every offer in every area has known kinds.
- **The rule** (engine `tooSoon`, `SPACING_MS`): on an Optimal route no stop starts within 3 hours of the start of
  an earlier stop of any of its kinds. What you marked Got it today counts (turned away doesn't). A pinned deal and
  "Go here first" may repeat a kind; "Ending soon" lists a deal even when Optimal holds it back, since adding it pins
  it. Being one kind a day (haircut) still holds in every goal.
- **Scoring:** like Most savings (expected dollars, minutes only break ties, the search ranks plans at $0.20 a
  minute), but counting likes and what a ceremony is worth (`ev`), and with Best for me's quarter off a sit-down meal
  outside mealtimes. It ignores pace.
- **The page:** Plan for reads Optimal · Best for me · Maximize. A new phone starts on Optimal; a phone still on the
  old default, Best for me, moves to Optimal once on load, because the two can't be told apart; once a goal is
  tapped (`S.goalSet`) the pick stays. Maximize picks never move. The About paragraph names Optimal.
- **Measured** (20 sample days per area: five starts, leaving 7, 8, 10 or 12, done by 9 PM): Fargo-Moorhead Optimal
  14.4 stops and about $97 a day with no kind repeated inside 3 hours; Most stops 26.7 stops with 17.6 such repeats;
  Best for me 9.7 stops, $91, 1.6 repeats. Bismarck-Mandan Optimal 9.5 stops, Twin Cities 10.5, neither with a
  repeat. Before the change, Most stops from the middle of Fargo at 8 AM went to six coffee places in under two
  hours, then five bars.
- **Fixed on the way (engine v1.4):** an offer open to the public was "not eligible" for veterans, retirees and
  active duty, because the engine looked only for their own status in `eligible`. So the Air Museum program, the
  West Fargo VFW program, Bismarck's All Veterans Memorial and the Mandan Field of Flags never reached a route.
  `eligibility` now treats "public" as open to everyone (tested). Also: a stop after free time showed the earliest
  possible arrival under a later "Leave" time ("Leave 3:50 PM ... Arrive 2:02 PM"); it now shows the arrival that
  matches (`windowLine`, `x.start`).
- **Seen, not changed:** the Air Museum program (worth 12, an hour) rarely makes an Optimal or Best for me route
  unless Ceremonies is on Love; the Plan for buttons are 36 px tall, not 44, because `.seg button` comes after
  `.seg-wide button` in `app.css` (as before).

## Rebuilding the data
From the repo root (Windows: `python`, not `python3`):

```
python -I veterans-day/build/build_data.py [area ...]     # research -> each area's deals.json (default: all)
python -I veterans-day/build/drive_matrix.py [area ...]   # only when stores change: OSRM tables -> drive.json (~2 min each)
python -I veterans-day/build/stores_region.py <area> <cache folder>   # new areas only: chain stores -> research/<area>/locations-2026.json
cd tests && node --test --no-warnings veterans.test.js veterans-engine.test.js veterans-roads.test.js site.test.js
```
Area ids: `fargo-moorhead`, `bismarck-mandan`, `twin-cities`, `reston-va`, `reno-sparks`, `fort-meade` (REGIONS in `build_data.py`). Rebuild Fargo-Moorhead's
`drive.json` only when its stores change; the drive table must follow every change to an area's store list.

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

**Marcus Theatres, 9 Nov 2026 evening (seen in an ad):** A 19 after it. Marcus's own banner
(on marcustheatres.com, seen on its North Dakota theatres page): "All Veterans and Active Duty Military
Receive a FREE Large Popcorn. Wednesday, November 11. Redeem offer by request when ordering at the theatre." No
ticket requirement is stated; Marcus's earlier popcorn offer for the film *Pressure* (undated on its military page)
said a ticket was required, so the absence looks deliberate, but it isn't confirmed. Not on the American Legion's
5 Nov list or Marcus's military page. Two Fargo theatres: West Acres Cinema, 4101 17th Ave S ((701) 282-6930;
OSM way/219117385), and Century Cinema, 3931 9th Ave S (Marcus writes 9th Avenue SW; (701) 281-1335 from Marcus's page;
OSM way/244092646). Now 69 deals at 168 stores. Category treat, a 10-minute counter stop, value about $9 (estimate). Hours are the usual-hours
estimate 12:00–21:30 in CURATE until Wednesday's showtimes are read. The "ask when you order" line is in `limits`,
not `caution`: the engine counts a caution as a 30% chance the deal falls through. To do on the 10 Nov scrub:
call the theatre about the ticket question and read Wednesday's first and last showtimes.

**Re-check, Tue 10 Nov 2026 (the checklist; four research helpers, the main finds read again by hand; all read
10 Nov).** Bismarck-Mandan and Twin Cities details are in their `notes.md`.
- **The first 2026 Fargo-Moorhead roundup:** Valley News Live, 9 Nov 2026. It lists Hawley High School's 9:00
  program, Nativity Catholic School and Church (Mass 8:30 with the students, flag ceremony 9:15, art crawl
  9:45-10:15), the Air Museum program at 11:00, and a flag exchange at Scheels 11:00-1:00 with AMVETS Post 7 and the
  Combat Veterans Motorcycle Association. Added: the Nativity Mass (B, 1825 11th St S from directories) and the
  Scheels flag exchange (B, 1551 45th St S; worth 0 on a route, since you need an old flag: pin it); Hawley under
  other days and places (outside the metro). A helper's Scheels address (5200 31st Ave S) was wrong. No KFGO, InForum,
  WDAY, KVRR or Fargo Underground roundup yet.
- **Up:** Sickies C to A (its own Specials & Events page: "Wednesday, November 11, 2026", a free Cheeseburger Basket
  or 20% off one item; no stores named, so both Fargo stores; veterans only as written); Village Inn C to B (Military.com:
  a 2-2-2 breakfast; Veteran.com, 9 Nov: a V.I.B. breakfast in store; they differ, and the company hasn't announced it).
  Perkins gains RestaurantNews' 5 Nov 2026 list. The Air Museum program gains the roundup as a source and an 11:00
  arrive-by.
- **Changed:** Sandy's Donuts gains its downtown shop, 300 Broadway N (its own site lists three), and its usual hours
  6:00-13:30 (the deal's window; it opened at 10:00 before, the category's default); Drekker's Wednesday hours
  4-10 PM (its own site; 4-8 PM before); Wendy's deal starts at 10:30 (Wendy's own post gives no hours, but its
  stores serve only breakfast until 10:30 and a Dave's Single isn't on that menu: general knowledge, not checked
  store by store).
- **No 2026 word, unchanged (C):** the Fargo VFW / Legion Post 2 stew (americanlegionpost2.net failed), AMVETS Post 7
  lunch, Moorhead Legion, West Fargo VFW (its own undated page: "every November 11th", flag raising 10:45, stew in
  the afternoon), Harwood Legion, Fryn' Pan, Doolittle's, Porter Creek (their sites say nothing; the publisher's confirmation
  stands, offers unknown), Granite City, Pizza Ranch, Caribou, Insomnia, Hardee's, Pub West, Brewtus', Blarney
  Stone, Royal Buffet and the ten bars. Facebook, Instagram and Google posts weren't readable.
- **Marcus:** still open. marcustheatres.com sits behind an Imperva bot check, and no other site has Wednesday's
  showtimes for West Acres or Century. Marcus's other free-popcorn offers (National Popcorn Day 2026, *Pressure*)
  required a ticket, so the Veterans Day one may too: call West Acres, (701) 282-6930.
- **Checked and left out:** Hy-Vee's 2026 free breakfast (its own page, 14 Oct) has no Fargo-Moorhead store (a helper
  said otherwise); Dairy Queen's free medium Blizzard appears only on Veteran.com ("participating", 9 Nov) with no
  word from DQ, so it stays a lead.
- No tips were checked (`tips` table): that needs wrangler and the account owner's sign-in.

**Files received, 10 Nov 2026 afternoon** (a Word file of five images from a North Dakota Guard colleague, a typed list
and a flyer). Added: the **Fargo Elks #260 chili feed**, free to all veterans from 3 PM, 3435 Broadway N (A: the
lodge's own flyer; no end time, three hours allowed); **McDonald's** free Breakfast Extra Value Meal for veterans with
ID (C: a photo of one store's sign, store unknown; owners choose; breakfast hours 5:00-10:30; nine Fargo-Moorhead
stores from OpenStreetMap, Fargo-Moorhead only). The build now skips an OpenStreetMap address that is only a house
number (a McDonald's "5160"). **Correction the same afternoon:** the chicken-dinner sign was Hornbacher's, not
Cash Wise's; I had assumed Cash Wise because the offer matched. Added **Hornbacher's** free chicken dinner, 11 AM-7 PM
(A: hornbachers.com/veterans-day, read 10 Nov, "Wednesday, November 11"; no store list; every Hornbacher's) at
its six full stores from OpenStreetMap (Osgood 4151 45th St S, Southgate 1532 32nd Ave S, West Acres 4101 13th Ave S,
Northport 2510 Broadway N, Moorhead 101 11th St S and 950 40th Ave S); the small Express on University Dr and the
West Fargo fuel stop are left out (maybe no hot deli). The Pilot / Flying J named on 32nd Ave is the one already
mapped, 3150 39th St SW at 32nd Ave S and I-29. Cash Wise stays (its own page, read again 10 Nov: Wednesday,
November 11, 11am-7pm). **From Fargo Legion Post 2's "more options" Facebook post** (images shared, since the post
didn't load here), each the business's own 2026 word, grade A: Pepper's Sports Cafe, a free lunch entree 11-4 with a
military ID, dine-in, 2510 University Dr S (from directories; pin from OpenStreetMap); Fix It Forward Auto Care, a free
oil change for any veteran at its five shops by appointment ((701) 515-9921; the 6219 53rd Ave S pin is approximate);
Super Buffet, 1000 45th St S, veterans eat free 11 AM-9 PM plus its 17th annual ceremony with the DAV at 6 PM (its
30 Oct 2026 post; removed from the earlier-years leads, and the 8 Nov note that its meal was Sun 8 Nov only was
wrong); Royal Buffet up from C to A (its own post: free buffet 10-12 Nov). Not added:
- The typed list is **Waterloo-Cedar Falls, Iowa** ("CF", "W'loo", Love's Travel Stop, Icon Donuts, Pepper's), so
  its store-specific offers (Chick-fil-A, Taco John's, Culver's, Panera, Dairy Queen, a Wendy's breakfast combo at a
  Love's) say nothing about Fargo-Moorhead stores. Its Denny's, IHOP, Starbucks and Freddy's lines match ours.
- The two 2026 graphics (a Minnesota one and a nationwide one, no publisher shown) agree with what we have: Denny's
  5 AM-noon, IHOP 7 AM-7 PM, Starbucks with spouses, Freddy's card through 25 Nov. They differ on Wendy's (a breakfast
  combo; Wendy's own 2026 post says a Dave's Single, which we keep) and Perkins (a Great American Trio; two 2026
  lists say the Magnificent Seven). The Minnesota one names Twin Cities chains we don't carry (Crooked Pint, Green
  Mill, Old Chicago, Kona Grill, Leo's Grill & Malt Shop, White Castle, Happy Joe's, Bruegger's, Noodles, Fogo de
  Chão, McCormick & Schmick's): not added yet; each needs its stores in the circles and a new Twin Cities drive table.
- Fargo Santa Day (Thu 17 Dec 2026, 5:30-7:30 PM, Armed Forces Reserve Center, 3290 31st St N): not a Veterans Day
  event.

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
