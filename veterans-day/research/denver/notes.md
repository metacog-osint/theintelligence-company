# Denver metro (`denver`) research notes, 11 Nov 2026

Built overnight 10-11 Nov 2026 (about midnight to 2 AM CST) for the "metro spread" area, overnight, under
his instruction to research, build and deploy without asking. Source report: `Downloads\Denver-Veterans-Day-2026-Deals-and-Events.md`
(10 Nov 2026), treated as leads. Every local item was checked at its own 2026 source on 11 Nov 2026 (00:00-00:15 CST,
the evening of 10 Nov in Denver) and graded A = the business or organizer's own 2026 page, B = a dated 2026 outlet or
list, C = earlier years only. Times are Mountain (MST, UTC-7). Pins are OpenStreetMap (Nominatim) or the chains' own
store lists (All the Places).

## The area
- Six circles (name, centre, radius): Downtown, Capitol Hill, Cherry Creek and Lowry (39.735, -104.965, 8 km); Aurora
  and Buckley SFB (39.700, -104.810, 7); Lakewood and Belmar (39.715, -105.095, 6); Littleton and Highlands Ranch
  (39.585, -105.000, 6); Lone Tree, Centennial and Park Meadows (39.565, -104.880, 6.8); Westminster, Thornton and
  Broomfield (39.890, -105.020, 8.3). Three were widened from the starting plan: downtown 7 to 8 km for Bass Pro Shops
  at Northfield (0.8 km outside), Westminster 7.5 to 8.3 for Thornton's Main Event and Cabela's (on the edge), Lone
  Tree 5 to 6.8 for Oliver's Italian in Greenwood Village (1.6 km outside), which also brought in Parry's Greenwood
  Village and Highlands Ranch stores. Wings Over the Rockies, Buckley's gate area, 2270 S Parker Rd and the Armed
  Forces Tribute Garden are inside.
- Drive times start from downtown Denver (39.7392, -104.9903); the NWS forecast point is the same.
- **Transit line: none.** RTD's fares page (read 11 Nov 2026): "Youth 19 and under and active-duty U.S. military ride
  free on all RTD services." Nothing for veterans or for Veterans Day, and no 11 Nov alert on RTD's home page. RTD's
  Service Alerts page and social posts were not checked.

## Size: thinning and the drive grid (judgment calls, made without the publisher)
- The engine checks every stop at every step, and a metro this size lists far more stores than the other areas: 725
  chain stores in the circles before any trimming. `thin=(6, 6.0, 8.0)` in REGIONS: a chain with more than 6 stores
  here keeps stores at least 6 km apart (8 km for a deal that needs a purchase), nearest the circles' middles first.
  So there is still one a few minutes away from anywhere in the area. Starbucks 80 to 13, Circle K 79 to 13, Chipotle
  37 to 8, Wendy's 33 to 10, Great Clips 34 to 14, Snarf's 22 to 11, Einstein 24 to 11, Walgreens 24 to 8. Other
  areas are untouched (no `thin`).
- `grid_km=1.1`: the drive table's start points are 1.1 km apart, not 800 m (930 points instead of about 1,700).
- Result: 101 deals at 397 stops (budget was about 350). `planDay` timed in node on a stand-in table: about 140 ms at
  7 AM against Reston's 96 ms (200 stops), with purchase deals on; they're Off by default, which drops 28 deals from
  the search.

## Local (routable): 15 entries, 16 places
| Item | Grade | Notes |
|---|---|---|
| Westminster Veterans Day Ceremony | A | City of Westminster calendar: 10:00-11:00 AM, Armed Forces Tribute Garden. `arrive_by` 10:00 |
| Wings Over the Rockies Air & Space Museum | A | Its own page: free for veterans and active duty with ID, 10-5, no advance ticket; guests pay |
| Salt Water Social | A, purchase | Its own page: free select entree with a starter, 9-11 Nov; veterans, active, reservists, Gold Star |
| STK Steakhouse | A, purchase | STK's page: valid 9-11 Nov 2026, participating US locations; Denver not named, hours not found (its Denver page 404'd) |
| The Melting Pot, Littleton | A, purchase | Its own events page (the chain research): a free four-course meal for each extra regular-price one; 3% service charge |
| Blue Island Oyster Bar (Cherry Creek, Lone Tree) | B | Mile High on the Cheap and the Gazette, 10 Nov: free entree up to $40 and a nonalcoholic drink, dine-in |
| Ash and Agave | B | Same lists: entree up to $35; hours not published |
| Oliver's Italian | B | Same lists: entree up to $35; usual weekday hours 11-9 (OpenTable) |
| Thirsty Lion, Union Station | B | Gazette and Westword: free entree from a short list; its own hours 11-10 |
| Tamayo | B, purchase | Mile High: 10% off |
| The Rendezvous at Heather Gardens | B, purchase | KOOL 105 only: $8 breakfast-for-dinner 5-8 PM, reservations; inside a 55+ community |
| Denver Chophouse, Henry's Tavern | B, purchase | Westword (seen through a search summary): 25% off; hours not found |
| ViewHouse (Ballpark) | B, purchase | 20% off; which locations take part not confirmed |
| Westminster Golf: Legacy Ridge | B | KOOL 105 only: one free round; not on the city's golf pages; call 303-438-8997 |

Restaurant windows without published hours (Ash and Agave, Salt Water Social, Chophouse, Henry's, ViewHouse, Tamayo)
are assumed 11 AM-9 or 10 PM and carry a call-first caution. Discounts carry a rough dollar value (a share of a
typical meal) so the cards don't read $0.

## Colorado chains (shared commit `ffba0e3`, also used by Colorado Springs)
- 47 chains from the coordinating session's research (`research/colorado-chains-notes.md`, and the records in
  `national-2026.json`). Stores from All the Places (run 31 Oct; Yard House and Cheddar's 17 Oct) and OpenStreetMap.
- No store in the circles, so not shown: Whataburger and Wienerschnitzel (their own lists' Colorado stores are in
  Colorado Springs, Fountain, Monument and Pueblo), Bombshells (none in OpenStreetMap), Benihana (Broomfield 3 km and
  Tamarac 2 km outside), Pilot (Aurora travel center outside), Tommy's Express (its Littleton wash isn't in
  OpenStreetMap).
- Rodizio Grill: the offer is for the downtown Denver store only, so Englewood is dropped.
- Jiffy Lube: Colorado's franchisee, Griffin Fast Lube, gives a free conventional oil change (B), not the national
  discount, through `in_area` in CURATE.
- Bass Pro Shops / Cabela's breakfast: Northfield, Lone Tree and Thornton; 9-10 AM shown (the Gazette), Mile High on
  the Cheap says 9-11; the card says to go at 9.

## Under Deals (extras): 18 other-day and region-wide items, 4 leads
Free metered parking in Denver (A), Colorado state parks free 8 AM-10 PM (A, CPW), NPS fee-free (B), the Denver Zoo's
free day (A; timed tickets released 28 Oct, likely gone), RTD (A, nothing for veterans), city closures, Walnut Creek
golf and Broken Tee (about 1 km outside), Bonfire Burritos (Wheat Ridge 0.8 km outside, but its pin couldn't be
placed), Holidaily in Golden, Emagine Parker, Cherokee Ranch, the Red Rocks car show, Parker (A) and Castle Rock
fireworks at 7 PM, the Aurora Veterans Salute (Thu 12 Nov), the Denver parade and festival (Sat 14 Nov), VETEFITS (Sat
14 Nov). Leads: Factotum, FlyteCo, the Broomfield ceremony (no time), the Navy Band at Dazzle.

## Corrections to the report
- Westminster's ceremony is 10:00-11:00 AM (the report said time TBA) at 6001 W 104th Ave (the city's page and
  OpenStreetMap); the report and the Gazette print 6601.
- Castle Rock and Parker's fireworks are their July 4 shows moved to Veterans Day; Parker's launch is northeast of
  Salisbury Park.
- The Denver Zoo's day is a free day for everyone with advance timed tickets, not a veterans offer.
- Wings names veterans and active duty; Guard and Reserve aren't named.
- Rodizio is downtown only (the report said so; the chain's store list has Englewood too).
- No other 11 Nov 2026 ceremony was found in the circles (Aurora, Lakewood, Littleton, Centennial, Thornton,
  Englewood, Lone Tree, Denver, Fort Logan National Cemetery). That is an absence of search results.

## Call first
Ash and Agave, Salt Water Social, STK (hours; Denver participation), Denver Chophouse, Henry's, ViewHouse, Tamayo, The
Melting Pot (to book), Saltgrass, the Rendezvous (reservation; non-residents?), Legacy Ridge, Parry's (participating
stores), Bass Pro and Cabela's (end time).

## Reading limits
Westword and ViewHouse returned 403, Westminster's calendar item pages redirect to a login, and STK's Denver page
404'd. Facts seen only in a search-result summary are marked unconfirmed above.
