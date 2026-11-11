# Reston & Northern Virginia (`reston-va`) research notes, 10 Nov 2026

10 Nov 2026: a fourth area for a colleague in Reston, VA. The first pass was done in Antigravity (Gemini) that
evening; Claude checked it against the sources the same night and corrected it. Times are Eastern (EST, UTC-5).

## Area
Circles: Reston and Herndon (7 km), Sterling and Dulles (5.5 km), Vienna and Tysons (5.5 km), Fairfax and Fair Oaks
(6.5 km). Drive times start from Reston Town Center without a location.

## On the route (local)
- **RTC Run for Valor 5K** (A): Wed 11 Nov, remarks 7:45, start 8:00 at RTC Window Plaza on Opportunity Way, finish on
  Market St at the fountain. Hosted by BXP for its veterans' employee group (Valor) with Microsoft; proceeds to
  Soldiers' Angels. **Registration $35** (watching is free), so it is a purchase deal, Off by default. Sources: the
  race's RunSignup page, FFXnow (10 Nov), Patch (5 Nov). The first pass had the Pavilion at 11900 Market St and no fee.
- **Herndon ceremony** (A): 11:00 on the Town Green, 777 Lynn St, sponsored by Wayne M. Kidwell American Legion Post
  184; Avenue of Flags at Chestnut Grove Cemetery. End time not published. FFXnow, Patch.
- **Fairfax ceremony** (A): 10:30 at American Legion Post 177, 3939 Oak St, with VFW Post 8469; keynote Judge Michael C.
  Sprano (FFXnow). End time not published (an hour allowed). The first pass's "Ballroom" and "USMC combat veteran"
  weren't found in the sources, so they're out.
- **The Kensington Reston** (A, with a caution): "An Afternoon of Gratitude & Recognition", 2:00-4:00 PM, 11501 Sunrise
  Valley Dr (its own event page). A senior-living community; the page has an RSVP and doesn't say whether the public
  may come, so the card says RSVP or call (571) 494-8100 first.
- **Chick-fil-A Metro DC** (A): cfametrodc.com, read 10 Nov: free entree open to close for veterans with proof of
  service (Chicken Biscuit, Egg White Grill or 4-count Minis until 10:30; Chicken Sandwich, Spicy Chicken Sandwich or
  8-count Nuggets after), not for mobile or delivery orders, participating restaurants only. All 10 stores All the
  Places lists in the circles are on its participating list (Dulles Town Crossing, Sugarland Crossing, George
  Washington, Fair Lakes, Fairfax Circle, Village Commons, Tyson's West In-Line, North Point Village, Dulles 28 and
  Waxpool Road, Vienna on Maple); George Mason's student-union counter isn't and is left out. The first pass's
  hand-typed store list (wrong addresses such as "22000 Dulles Retail Plaza") was removed.
- **Founding Farmers** (A, purchase): its own page: 50% off brunch, lunch or dinner (not breakfast) for active duty,
  retired military and veterans on 11 Nov; food only, dine-in only. Reston Station and Tysons. Lunch and dinner 11 AM-10 PM
  on Wednesdays at both (their pages, read 11 Nov 2026; was 11:00-21:00 assumed).
- **Ted's Bulletin** (B): a free Ted's Tart (Military.com, updated 10 Nov; Stars and Stripes, 6 Nov). Reston Town
  Center store open as of September 2026 (OpenTable replies).

## Chains added for this area (`national-2026.json`)
Wawa (A, any-size hot coffee), Sheetz (A, half turkey sub, fountain drink, car wash), Bonefish (B, Bang Bang Shrimp and
a drink: WTOP and Military.com; the first pass had A without the company's own 2026 post), California Pizza Kitchen
(B, entree from a special menu and a drink: Military.com, 10 Nov; the first pass had A and a BOGO card that no source
showed), Fogo de Chão (B, 50% off Full or Indulgent Churrasco: WTOP, Military.com), Bar Louie (B, free burger:
WTOP, Military.com), Carrabba's (no store in the circles).

## Stores
`locations-2026.json` from `build/stores_region.py reston-va .atp-cache` (All the Places run 2026-10-31 plus
OpenStreetMap). Fixed by hand on 10 Nov, with the script fixed to match: Fogo de Chão's Tysons store (1775 Tysons Blvd)
was dropped because its record has the town only in `addr:full`; the George Mason Chick-fil-A counter removed. The
All the Places downloads for Bar Louie, Carrabba's and Krispy Kreme failed (spider names not found), so those three
rely on OpenStreetMap; Bar Louie's Ashburn store is "address from directories". (11 Nov: two of the three were
wrong spider names; see "Store lookups fixed".)

## Pins
The first pass typed rounded coordinates for the local entries, 50 m to 700 m off. They now come from OpenStreetMap
(Nominatim, 10 Nov): Herndon Town Green, Post 177, the Kensington, Ted's, both Founding Farmers, and Opportunity Way
for the 5K start.

## Other days and places (`extras-2026.json`)
Arlington National Cemetery's observance (11:00, prelude 10:30; Patch), Mount Vernon (free for active duty, former
and retired military, 9-4, with its program; its own page), Alexandria (1:00, Patch), Falls Church (11:00, Patch),
Leesburg at Dodona Manor (10-1, Patch), DC Prime in Ashburn (its own post since 11 Nov; see above), NPS fee-free day (Great
Falls), Udvar-Hazy, and Metro's half fare for veterans rated 60% or more (WMATA). Leads: Anita's, Glory Days, Lake
Anne Brew House, Jimmy's Old Town Tavern (no 2026 offer found).

## Added 11 Nov 2026, about midnight CST (WTOP's list, the loose ends and an attached report)
Now 49 deals at 199 stops (A 18, B 30, C 1). Each offer and store list was read on the business's own page where it
has one, on 11 Nov 2026 (10-11 PM CST on 10 Nov).
- **Silver Diner** (B, purchase): 25% off an entree with a valid military ID, all DC/MD/VA/NJ stores (WTOP 9 Nov,
  Stars and Stripes 6 Nov). Not on Silver Diner's own site (its promotions page lists other offers). Five stores in
  the circles from its own locator, all Wed 7 AM-11 PM: Reston (11951 Killingsworth Ave), Fair Lakes (12250 Fair Lakes
  Pkwy), Tysons (8101 Fletcher Ave, McLean), Merrifield (8150 Porter Rd, Falls Church), Ashburn (20530 Heron Overlook
  Plaza). Chantilly (44050 Pointe Plaza) is outside. Whether it's dine-in only isn't stated.
- **The Melting Pot** (A, purchase): the Reston restaurant's own events page: a free 4-course fondue meal for a veteran
  with proof of service when another guest buys one, 11 Nov only, dine-in, DC-area locations; not for family members;
  excludes the Bigger Night Out; reserve. 11730 Plaza America Dr, Ste 100, (703) 435-1277; opens 5 PM, last seating
  9 PM. Stars and Stripes also names active duty and gives other regions a different offer on 11-12 Nov.
- **Grace for Vets** (A): graceforvets.com (undated, "every Veterans Day"): a free wash for veterans and active duty
  at participating washes; proof not stated. Near Reston its list has only Flagship Carwash sites; seven are in the
  circles (632 Grant St and 2501 Centreville Rd, Herndon; 45215 Towlern Pl, Sterling; 540 Maple Ave W, Vienna; 10874
  Fairfax Blvd; 20395 Broad Overlook Dr and 43985 Pipeline Plaza, Ashburn). The list spells the Ashburn street "Board
  Overlook"; OpenStreetMap and the wash say Broad. McLean (6814 Old Dominion Dr) and 43324 Junction Plaza fall
  outside. Hours not published for the day: Flagship's usual 8 AM-8 PM (OpenStreetMap tags on other Flagship washes)
  is shown as "usual hours".
- **Paisano's Pizza** (B, from an attached report): Food Network, 9 Nov 2026: a free large one-topping pizza for
  veterans and active duty at all 40 stores in VA, MD and DC; in-store, with a US Uniformed Services ID, a veterans
  organization card or your uniform. Not on Paisano's own site or WTOP's list. Seven stores in the circles from its
  own locator (Reston, Herndon, Vienna, Tysons, Fairfax City, Fair Lakes, Ashburn); hours not published.
- **Frying Pan Farm Park wagon rides** (B, from the report): FFXnow, 10 Nov: the Park Authority's free wagon rides for
  active duty, veterans and their families, 10 AM-3 PM, 2709 West Ox Rd, Herndon. No Park Authority page for 2026
  found. A new kind, `outing`, for the Optimal route.
- **Not added:** The Greene Turtle: its locator can't be read, OpenStreetMap has none in the circles, and its Dulles
  Town Center restaurant closed years ago (The Burn reported Harvest American Diner taking over the building in 2019;
  closing date not found). Hard Rock Cafe DC and Pastis are in DC, outside the circles.
- **Extras:** DC Prime up to A (its own post, 29 Oct: veterans only, ID showing veteran status, dine-in, opens 4 PM,
  reserve; address confirmed, outside the circles in Broadlands); Udvar-Hazy (the museum's release, 2 Nov: free
  parking for veterans and active duty, usually $15 before 4 PM, and $2 off daytime IMAX; free docent tours); new:
  Metro's free parking at its garages and lots and holiday schedule (WMATA's 2026 page), the Great Falls Freedom
  Memorial ceremony at 11 (its own post, 26 Oct; outside the circles), the Park Authority's free rec centers and Lake
  Fairfax camping (FFXnow; no county page found), the Army museum at Fort Belvoir (free for all; FFXnow), Springfield
  Post 176 at 11 (FFXnow). Crafthouse Reston is a lead (free meal in 2025 per Patch; no 2026 word found).
- **Founding Farmers:** its offer page is dated 29 Oct 2026 and says the full lunch and dinner menus are available at
  all locations; both location pages give Wednesday lunch and dinner 11 AM-10 PM (was 21:00, assumed). Both list
  brunch from about 9 AM on "most weekday holidays", not confirmed for 11 Nov, so the window starts at 11. Reston's
  phone is (703) 988-7333 on its page (the first pass had 480-0870).

- **Mission BBQ Herndon** (from an attached report, 11 Nov about 11:05 PM CST on 10 Nov): OpenStreetMap had only
  Sterling, so the Herndon store was missing. Both now from Mission BBQ's own pages: 2403 Centreville Rd, Ste 34B,
  Herndon, (703) 936-2078, and 45979 Denizen Plaza, Sterling, (571) 363-3233; Wednesday 11 AM-9 PM at both. Herndon's
  pin is the Census geocoder's. 49 deals at 200 stops.
- **Checked against the attached report and left out:** Rack Room Shoes, Food Lion, Tractor Supply and the Exchange
  (retail, no store lookups done; the Exchange is on post), AutoNation (year-round), Morton's (no offer), McCormick &
  Schmick's (8 Nov, and its Reston restaurant closed in 2021), In-N-Out (none in Virginia), Lake Anne Brew House's
  bingo (a regular event; already a lead), Reston Community Center (open, no program), and Patch's unplaced 14 Nov
  ceremony. Already in the planner: Chick-fil-A, Great Clips, Shake Shack, Starbucks (spouses included), Wendy's,
  Chipotle, Dunkin', Circle K, Sport Clips, Chili's (Sterling only; Reston closed), Outback, Red Robin, Bonefish, Red
  Lobster, Applebee's, Denny's, Buffalo Wild Wings, Kohl's, Target, Walgreens, the 5K, Herndon and the NPS fee-free day.

## Store lookups fixed (11 Nov 2026)
All the Places has no Bar Louie spider (run 2026-10-31), so Bar Louie is OpenStreetMap only; Carrabba's spider is
`carrabbas_italian_grill` (its list has no store in the circles: nearest Woodbridge and Germantown, MD);
`krispy_kreme_us` was right and its 10 Nov download failed once (no store in the circles: nearest Manassas and
Alexandria). `stores_region.py` and the three bases in `locations-2026.json` say so; the store lists didn't change.

## Not added (earlier list, now done above)
From WTOP's 9 Nov list: Silver Diner, The Melting Pot and Grace for Vets were added on 11 Nov; The Greene Turtle,
Hard Rock Cafe DC and Pastis were not (see above).
