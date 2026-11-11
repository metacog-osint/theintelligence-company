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
  retired military and veterans on 11 Nov; food only, dine-in only. Reston Station and Tysons. Store hours not checked
  (lunch and dinner window 11:00-21:00 assumed).
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
rely on OpenStreetMap; Bar Louie's Ashburn store is "address from directories".

## Pins
The first pass typed rounded coordinates for the local entries, 50 m to 700 m off. They now come from OpenStreetMap
(Nominatim, 10 Nov): Herndon Town Green, Post 177, the Kensington, Ted's, both Founding Farmers, and Opportunity Way
for the 5K start.

## Other days and places (`extras-2026.json`)
Arlington National Cemetery's observance (11:00, prelude 10:30; Patch), Mount Vernon (free for active duty, former
and retired military, 9-4, with its program; its own page), Alexandria (1:00, Patch), Falls Church (11:00, Patch),
Leesburg at Dodona Manor (10-1, Patch), DC Prime in Ashburn (WTOP; address not checked), NPS fee-free day (Great
Falls), Udvar-Hazy, and Metro's half fare for veterans rated 60% or more (WMATA). Leads: Anita's, Glory Days, Lake
Anne Brew House, Jimmy's Old Town Tavern (no 2026 offer found).

## Not added (the publisher's call)
From WTOP's 9 Nov list: Silver Diner (25% off an entree), The Greene Turtle (free dine-in meal up to $15), The Melting
Pot (buy one, get one four-course meal), Grace for Vets (free car wash), Hard Rock Cafe DC, Pastis. Each needs its
stores in the circles looked up.
