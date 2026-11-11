"""Build each area's deals.json from the research files.

Usage (from the repo root):  python -I veterans-day/build/build_data.py [area id ... | all]   (default: all)
Areas are in REGIONS below. Fargo-Moorhead, the default, keeps its original paths: research in
veterans-day/research/ and site/veterans/veterans-day/data/deals.json. Every other area has its own folder under both,
named by its id (veterans-day/research/<id>/, data/<id>/deals.json).
Inputs: national-2026.json (shared by every area), and per area local-2026.json, locations-2026.json, osm-matches.json
and extras-2026.json. Network: the US Census geocoder for store addresses without coordinates, and the NWS points
API for the forecast link. Everything about each offer is decided in CURATE below (and each area's `local` list), in
one place, so a reviewer can see why a deal is in, how long a stop takes and what window it has.

Place ids come from the offer and the street address, so they stay the same from one build to the next: field
reports on the day refer to them, and they never repeat across areas (different streets).
"""
import csv, io, json, math, os, re, sys, urllib.request, uuid
from datetime import datetime, timezone, timedelta

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RES = os.path.join(ROOT, "veterans-day", "research")
OUT = os.path.join(ROOT, "site", "veterans", "veterans-day", "data", "deals.json")
DAY = "2026-11-11"
TZ_OFFSET_MIN = -360  # CST; DST ended 1 Nov 2026
DAY_START = datetime(2026, 11, 11, 6, 0, tzinfo=timezone.utc)  # local midnight
BBOX = (46.72, -97.00, 47.00, -96.64)  # south, west, north, east: Horace to north Fargo, West Fargo to Dilworth
UA = "tic-veterans-day-build/1.0 (support@theintelligence.company)"

# The areas a visitor can pick (9 Nov 2026: friends in New Salem, ND, and in the Rosedale, Plymouth and Maple
# Grove areas of the Twin Cities; Fargo-Moorhead stays the default and the landing page). All are on Central time.
#   areas: (name, lat, lng, km) circles; a store counts when it is inside one, and drive_matrix.py lays its grid of
#          start points over them. Fargo-Moorhead uses BBOX and the stores' own extent instead, as it always has.
#   center: where drive times start until a visitor shares a location or picks a start (center_label says so).
#   transit: finishes the drive-safe line on bars ("..., take a cab or rideshare, or <transit>."); None ends it there.
REGIONS = {
    "fargo-moorhead": dict(
        name="Fargo-Moorhead", label="Fargo-Moorhead, ND/MN", out="", research="", bbox=BBOX, areas=None,
        center=(46.8600, -96.8100), center_label="the middle of Fargo", zoom=12,
        nws=(46.8772, -96.7898), wx_name="Fargo", transit="ride MATBUS, free with a veteran ID"),
    "bismarck-mandan": dict(
        name="New Salem & Bismarck/Mandan", label="New Salem & Bismarck/Mandan, ND", out="bismarck-mandan",
        research="bismarck-mandan", bbox=None, states=("ND",),
        areas=[("Bismarck and Lincoln", 46.800, -100.772, 10.0), ("Mandan", 46.828, -100.890, 5.0),
               ("New Salem", 46.845, -101.411, 3.0)],
        center=(46.8083, -100.7837), center_label="downtown Bismarck", zoom=11,
        # Bis-Man Transit (CAT): a reduced fare for veterans, not a free ride (its fare page, dated 2017).
        nws=(46.8083, -100.7837), wx_name="Bismarck", transit=None),
    "twin-cities": dict(
        name="Plymouth, Maple Grove and Roseville", label="Twin Cities: Plymouth, Maple Grove, Roseville, MN",
        out="twin-cities", research="twin-cities", bbox=None, states=("MN",),
        areas=[("Plymouth", 45.020, -93.455, 7.0), ("Maple Grove", 45.095, -93.440, 6.0),
               ("Roseville", 45.015, -93.160, 6.0)],
        center=(45.0225, -93.4600), center_label="the middle of Plymouth", zoom=11,
        # Metro Transit: free only for service-connected disabled veterans (metrotransit.org/fares, read 9 Nov 2026).
        nws=(45.0200, -93.3000), wx_name="the Twin Cities", transit="ride Metro Transit, free with a VA ID marked Service Connected"),
    "reston-va": dict(
        name="Reston & Northern Virginia", label="Reston & Northern Virginia, VA",
        out="reston-va", research="reston-va", bbox=None, states=("VA",),
        tz="America/New_York", tz_offset_min=-300, tz_abbr="EST",
        day_start=datetime(2026, 11, 11, 5, 0, tzinfo=timezone.utc),
        areas=[("Reston and Herndon", 38.960, -77.365, 7.0), ("Sterling and Dulles", 39.015, -77.425, 5.5),
               ("Vienna and Tysons", 38.915, -77.240, 5.5), ("Fairfax and Fair Oaks", 38.858, -77.330, 6.5)],
        center=(38.9586, -77.3570), center_label="Reston Town Center", zoom=11,
        nws=(38.9586, -77.3570), wx_name="Reston",
        # WMATA's reduced fare: veterans rated 60% or more, with Metro's Reduced Fare SmarTrip ID (wmata.com, read 10 Nov 2026).
        transit="ride Metro's Silver Line, half fare with Metro's Reduced Fare SmarTrip ID for veterans rated 60% or more"),
    # The first Pacific area (11 Nov 2026, for colleagues in Reno and Sparks): research/reno-sparks/notes.md.
    "reno-sparks": dict(
        name="Reno–Sparks", label="Reno–Sparks, NV",
        out="reno-sparks", research="reno-sparks", bbox=None, states=("NV",),
        tz="America/Los_Angeles", tz_offset_min=-480, tz_abbr="PST",
        day_start=datetime(2026, 11, 11, 8, 0, tzinfo=timezone.utc),
        areas=[("Downtown, Midtown and west Reno", 39.522, -119.825, 6.0), ("Sparks and the Marina", 39.550, -119.740, 6.0),
               ("South Meadows and South Reno", 39.445, -119.775, 5.5)],
        center=(39.5251, -119.8126), center_label="downtown Reno", zoom=11,
        nws=(39.5296, -119.8138), wx_name="Reno",
        # RTC Washoe: every service free for every rider all day on 11 Nov (its own release, 9 Nov 2026).
        transit="ride RTC Washoe's buses, free for everyone all day on 11 Nov"),
    # Fort Meade, MD (10 Nov 2026 night: colleagues at Fort Meade; research/fort-meade/notes.md). Eastern time.
    # Odenton, Gambrills and Crofton, Severn/Hanover/Arundel Mills, Laurel and Columbia around the post.
    "fort-meade": dict(
        name="Fort Meade, Odenton, Laurel and Columbia", label="Fort Meade: Odenton, Laurel, Columbia, MD",
        out="fort-meade", research="fort-meade", bbox=None, states=("MD",),
        tz="America/New_York", tz_offset_min=-300, tz_abbr="EST",
        day_start=datetime(2026, 11, 11, 5, 0, tzinfo=timezone.utc),
        areas=[("Fort Meade and Odenton", 39.095, -76.725, 6.0), ("Gambrills and Crofton", 39.045, -76.675, 4.5),
               ("Severn, Hanover and Arundel Mills", 39.160, -76.715, 4.5), ("Laurel", 39.100, -76.855, 5.0),
               ("Columbia", 39.200, -76.850, 6.0)],
        center=(39.0840, -76.7000), center_label="Odenton, by Fort Meade", zoom=11,
        nws=(39.1000, -76.7400), wx_name="Fort Meade",
        # Stores on the installation need base access, so they stay off the route (the Exchange is under Deals).
        on_post=r"\bFort Meade, (MD|Fort Meade)\b",
        # MDOT MTA's service alert 29401 (9 Nov 2026): free rides on 11 Nov for veterans, active duty, Guard and Reserve.
        transit="ride MTA's MARC trains, buses or Light Rail, free on 11 Nov for veterans, active duty, Guard and Reserve with a DoD or VA ID or a Maryland license marked Veteran"),
    # The first Mountain area (11 Nov 2026, the "metro spread"): research/denver/notes.md.
    "denver": dict(
        name="Denver metro", label="Denver metro, CO",
        out="denver", research="denver", bbox=None, states=("CO",),
        tz="America/Denver", tz_offset_min=-420, tz_abbr="MST",
        day_start=datetime(2026, 11, 11, 7, 0, tzinfo=timezone.utc),
        areas=[("Downtown, Capitol Hill, Cherry Creek and Lowry", 39.735, -104.965, 8.0),
               ("Aurora and Buckley SFB", 39.700, -104.810, 7.0),
               ("Lakewood and Belmar", 39.715, -105.095, 6.0),
               ("Littleton and Highlands Ranch", 39.585, -105.000, 6.0),
               ("Lone Tree, Centennial and Park Meadows", 39.565, -104.880, 6.8),
               ("Westminster, Thornton and Broomfield", 39.890, -105.020, 8.3)],
        center=(39.7392, -104.9903), center_label="downtown Denver", zoom=10,
        nws=(39.7392, -104.9903), wx_name="Denver",
        # Downtown is 8 km (not 7) to reach Bass Pro Shops at Northfield, Westminster 8.3 (not 7.5) for Thornton's Main
        # Event and Cabela's, Lone Tree 6.8 (not 5) for Oliver's Italian in Greenwood Village. Chains with more than 6 stores here keep stores 6 km apart, or 8 km for a deal that needs
        # a purchase (see `thin` in main()).
        thin=(6, 6.0, 8.0),
        grid_km=1.1,  # drive_matrix.py: start points every 1.1 km, not 800 m (the metro is twice Reston's size)
        transit=None),
}
DEFAULT_REGION = "fargo-moorhead"

# Default local hours by category when a store's Wednesday hours are unknown (flagged "usual hours").
DEFAULT_HOURS = {"breakfast": ("06:00", "14:00"), "meal": ("11:00", "21:00"), "quick": ("10:30", "21:30"),
                 "coffee": ("06:00", "19:00"), "treat": ("10:00", "21:00"), "service": ("09:00", "19:00"),
                 "shopping": ("09:00", "21:00"), "event": ("10:00", "20:00"), "bar": ("11:00", "24:00")}

# Never link these: fargobites.com has redirected every page to an unrelated "verify" site since November 2026.
BLOCKED_HOSTS = ("fargobites.com",)
# A deal that only one compiled 2026 report lists, which we couldn't trace to the business (8 Nov 2026 review).
ONE_REPORT = "Only one unconfirmed 2026 listing: call first"
# On 2026 compilers' lists, but the company itself hadn't announced it (checked 8 Nov 2026).
NO_COMPANY_WORD = "Not announced by the company for 2026: call first"

# One entry per offer that may appear. src: which research file; name: its brand/name there; loc: its key in
# locations-2026.json; osm: fallback key in osm-matches.json. minutes: time at the stop; busy: typical line at
# lunch and dinner peaks on Veterans Day (minutes); line: otherwise. window: local HH:MM override.
# kinds: what the stop is, for the Optimal route (10 Nov 2026), which never puts two of the same kind within
# 3 hours of each other (engine v1.4). Most come from the category (kinds_for below); `kinds=` here sets the rest. A
# ticket for later has none (tickets don't count).
CURATE = [
    # Sit-down meals (dine-in, count toward the meal limit)
    dict(id="applebees", src="national", name="Applebee's", loc="Applebee's", osm="applebees", category="meal", minutes=55, busy=25, meal=True, dineIn=True),
    dict(id="chilis", src="national", name="Chili's", loc="Chili's", osm="chilis", category="meal", minutes=50, busy=20, meal=True, dineIn=True),
    dict(id="olive-garden", src="national", name="Olive Garden", loc="Olive Garden", osm="olivegarden", category="meal", minutes=55, busy=25, meal=True, dineIn=True, caution=NO_COMPANY_WORD),
    dict(id="red-lobster", src="national", name="Red Lobster", loc="Red Lobster", osm="redlobster", category="meal", minutes=55, busy=20, meal=True, dineIn=True, caution=NO_COMPANY_WORD),
    dict(id="twin-peaks", src="national", name="Twin Peaks", loc="Twin Peaks", osm="twinpeaks", category="meal", minutes=50, busy=15, meal=True, dineIn=True),
    dict(id="buffalo-wild-wings", src="national", name="Buffalo Wild Wings", loc="Buffalo Wild Wings", osm="bww", category="meal", minutes=35, busy=15, meal=True, dineIn=False),
    dict(id="cracker-barrel", src="national", name="Cracker Barrel", loc="Cracker Barrel", osm="crackerbarrel", category="breakfast", minutes=45, busy=15, meal=True, dineIn=True),
    dict(id="famous-daves", src="national", name="Famous Dave's", loc="Famous Dave's", osm="famousdaves", category="meal", minutes=45, busy=10, meal=True, dineIn=True),
    dict(id="hooters", src="national", name="Hooters", loc="Hooters", osm=None, category="meal", minutes=45, busy=10, meal=True, dineIn=True),
    dict(id="buca-di-beppo", src="national", name="Buca di Beppo", loc="Buca di Beppo", osm=None, category="meal", minutes=55, busy=15, meal=True, dineIn=True),
    dict(id="bob-evans", src="national", name="Bob Evans", loc="Bob Evans", osm=None, category="meal", minutes=45, busy=10, meal=True, dineIn=True),
    dict(id="ruby-tuesday", src="national", name="Ruby Tuesday", loc="Ruby Tuesday", osm=None, category="meal", minutes=50, busy=10, meal=True, dineIn=True, fm=dict(caution="Store not confirmed open: call first")),
    dict(id="dave-busters", src="national", name="Dave & Buster's", loc="Dave & Buster's", osm=None, category="meal", minutes=60, busy=10, meal=False, dineIn=True, kinds=["games"]),
    dict(id="granite-city", src="national", name="Granite City Food & Brewery", loc="Granite City Food & Brewery", osm="granitecity", category="meal", minutes=50, busy=15, meal=True, dineIn=True, window=("11:00", "16:00"), caution="2026 offer not confirmed: call first", fm=dict(caution="Store and 2026 offer not confirmed: call first")),
    # The 2026 report is a sign at the Fargo store, so other areas get the chain's own rule (`elsewhere`).
    dict(id="pizza-ranch", src="national", name="Pizza Ranch", loc="Pizza Ranch", osm="pizzaranch", category="meal", minutes=45, busy=15, meal=True, dineIn=True,
         elsewhere=dict(offer="Last year: each Pizza Ranch chose a free Veterans Day buffet for veterans or a Veterans Week discount. Nothing found for 2026 at these stores")),
    # Chains with a 2026 offer and no Fargo-Moorhead store (other areas only; added 9 Nov 2026 with the area picker).
    dict(id="red-robin", src="national", name="Red Robin", loc="Red Robin", osm=None, category="meal", minutes=50, busy=20, meal=True, dineIn=True, only=("bismarck-mandan", "twin-cities", "reston-va", "reno-sparks", "fort-meade", "denver", "colorado-springs")),
    dict(id="outback", src="national", name="Outback Steakhouse", loc="Outback Steakhouse", osm=None, category="meal", minutes=40, busy=15, meal=False, dineIn=True, eat=0.5, kinds=["snack"], only=("bismarck-mandan", "twin-cities", "reston-va", "reno-sparks", "fort-meade", "denver", "colorado-springs")),
    dict(id="golden-corral", src="national", name="Golden Corral", loc="Golden Corral", osm=None, category="meal", minutes=55, busy=25, meal=True, dineIn=True, only=("bismarck-mandan", "twin-cities", "reston-va", "reno-sparks", "fort-meade", "denver", "colorado-springs")),
    dict(id="smashburger", src="national", name="Smashburger", loc="Smashburger", osm=None, category="quick", minutes=20, busy=10, meal=False, dineIn=True, eat=0.6, caution="Lists differ (a free burger, or 25% off): ask first", only=("bismarck-mandan", "twin-cities", "reston-va", "reno-sparks", "fort-meade", "denver", "colorado-springs")),
    dict(id="hy-vee", src="national", name="Hy-Vee", loc="Hy-Vee", osm=None, category="breakfast", minutes=35, busy=15, meal=True, dineIn=True, window=("06:00", "10:00"), caution="Stores with hot food service only", only=("bismarck-mandan", "twin-cities")),
    dict(id="cpk", src="national", name="California Pizza Kitchen", loc="California Pizza Kitchen", osm=None, category="meal", minutes=50, busy=15, meal=True, dineIn=True, only=("reston-va", "reno-sparks", "fort-meade", "denver", "colorado-springs")),
    dict(id="bonefish-grill", src="national", name="Bonefish Grill", loc="Bonefish Grill", osm=None, category="meal", minutes=40, busy=15, meal=False, dineIn=True, eat=0.5, kinds=["snack"], only=("reston-va", "reno-sparks", "fort-meade", "denver", "colorado-springs")),
    dict(id="carrabbas", src="national", name="Carrabba's Italian Grill", loc="Carrabba's Italian Grill", osm=None, category="meal", minutes=45, busy=15, meal=False, dineIn=True, eat=0.5, kinds=["snack"], only=("reston-va", "reno-sparks", "fort-meade", "denver", "colorado-springs")),
    dict(id="fogo-de-chao", src="national", name="Fogo de Chão", loc="Fogo de Chão", osm=None, category="meal", minutes=65, busy=15, meal=True, dineIn=True, purchase=True, only=("reston-va", "reno-sparks", "fort-meade", "denver", "colorado-springs")),
    dict(id="bar-louie", src="national", name="Bar Louie", loc="Bar Louie", osm=None, category="meal", minutes=45, busy=15, meal=True, dineIn=True, kinds=["bar", "meal"], only=("reston-va", "reno-sparks", "fort-meade", "denver", "colorado-springs")),
    dict(id="sheetz", src="national", name="Sheetz", loc="Sheetz", osm=None, category="quick", minutes=8, busy=5, meal=False, dineIn=False, hours=("00:00", "24:00"), kinds=["meal", "car-wash"], only=("reston-va", "fort-meade")),
    dict(id="wawa", src="national", name="Wawa", loc="Wawa", osm=None, category="coffee", minutes=6, busy=3, meal=False, dineIn=False, hours=("00:00", "24:00"), only=("reston-va", "fort-meade")),
    # Colorado chains (11 Nov 2026, for the Denver metro and Colorado Springs areas): 2026 offers checked in
    # research/colorado-chains-notes.md; `only` is where each has stores. The Melting Pot is a local entry in each area
    # (one store each, different offers).
    dict(id="pf-changs", src="national", name="P.F. Chang's", loc="P.F. Chang's", osm=None, category="meal", minutes=60, busy=20, meal=True, dineIn=True, window=("11:00", "15:00"), only=("denver",)),
    dict(id="bubbas-33", src="national", name="Bubba's 33", loc="Bubba's 33", osm=None, category="meal", minutes=55, busy=20, meal=True, dineIn=True, window=("11:00", "16:00"), only=("denver", "colorado-springs")),
    dict(id="bombshells", src="national", name="Bombshells", loc="Bombshells", osm=None, category="meal", minutes=60, busy=20, meal=True, dineIn=True, only=("denver",)),
    dict(id="old-chicago", src="national", name="Old Chicago", loc="Old Chicago", osm=None, category="meal", minutes=55, busy=20, meal=True, dineIn=True, only=("denver", "colorado-springs")),
    dict(id="lazy-dog", src="national", name="Lazy Dog", loc="Lazy Dog", osm=None, category="meal", minutes=60, busy=20, meal=True, dineIn=True, only=("denver", "colorado-springs")),
    dict(id="yard-house", src="national", name="Yard House", loc="Yard House", osm=None, category="meal", minutes=40, busy=15, meal=False, dineIn=True, eat=0.5, kinds=["snack"], only=("denver",)),
    dict(id="perrys-steakhouse", src="national", name="Perry's Steakhouse & Grille", loc="Perry's Steakhouse & Grille", osm=None, category="meal", minutes=90, busy=15, meal=True, dineIn=True, purchase=True, window=("16:00", None), only=("denver",)),
    dict(id="eddie-merlots", src="national", name="Eddie Merlot's", loc="Eddie Merlot's", osm=None, category="meal", minutes=50, busy=15, meal=True, dineIn=True, only=("denver",)),
    dict(id="bad-daddys", src="national", name="Bad Daddy's Burger Bar", loc="Bad Daddy's Burger Bar", osm=None, category="meal", minutes=50, busy=20, meal=True, dineIn=True, window=("11:00", "16:00"), only=("denver",)),
    dict(id="main-event", src="national", name="Main Event", loc="Main Event", osm=None, category="meal", minutes=75, busy=20, meal=True, dineIn=True, kinds=["meal", "games"], only=("denver", "colorado-springs")),
    dict(id="hopdoddy", src="national", name="Hopdoddy", loc="Hopdoddy", osm=None, category="meal", minutes=40, busy=15, meal=True, dineIn=True, only=("denver",)),
    dict(id="good-times", src="national", name="Good Times Burgers & Frozen Custard", loc="Good Times Burgers & Frozen Custard", osm=None, category="quick", minutes=15, busy=10, meal=True, dineIn=True, only=("denver", "colorado-springs")),
    dict(id="snarfs", src="national", name="Snarf's Sandwiches", loc="Snarf's Sandwiches", osm=None, category="quick", minutes=20, busy=10, meal=True, dineIn=True, only=("denver",)),
    dict(id="snarfburger", src="national", name="Snarfburger", loc="Snarfburger", osm=None, category="quick", minutes=20, busy=10, meal=True, dineIn=True, only=("denver",)),
    dict(id="whataburger", src="national", name="Whataburger", loc="Whataburger", osm=None, category="quick", minutes=10, busy=10, meal=False, dineIn=False, eat=0.4, window=("05:00", "11:00"), only=("denver", "colorado-springs")),
    dict(id="wienerschnitzel", src="national", name="Wienerschnitzel", loc="Wienerschnitzel", osm=None, category="quick", minutes=12, busy=8, meal=False, dineIn=True, eat=0.6, only=("denver", "colorado-springs")),
    dict(id="dickeys", src="national", name="Dickey's Barbecue Pit", loc="Dickey's Barbecue Pit", osm=None, category="quick", minutes=15, busy=10, meal=True, dineIn=True, only=("denver", "colorado-springs")),
    dict(id="teriyaki-madness", src="national", name="Teriyaki Madness", loc="Teriyaki Madness", osm=None, category="quick", minutes=15, busy=10, meal=True, dineIn=True, only=("denver", "colorado-springs")),
    dict(id="torchys", src="national", name="Torchy's Tacos", loc="Torchy's Tacos", osm=None, category="quick", minutes=15, busy=10, meal=False, dineIn=True, eat=0.5, only=("denver", "colorado-springs")),
    dict(id="tazikis", src="national", name="Taziki's Mediterranean Cafe", loc="Taziki's Mediterranean Cafe", osm=None, category="quick", minutes=20, busy=10, meal=True, dineIn=True, only=("denver",)),
    dict(id="dog-haus", src="national", name="Dog Haus", loc="Dog Haus", osm=None, category="quick", minutes=20, busy=10, meal=True, dineIn=True, only=("denver",)),
    dict(id="capriottis", src="national", name="Capriotti's", loc="Capriotti's", osm=None, category="quick", minutes=15, busy=5, meal=True, dineIn=True, purchase=True, only=("denver", "colorado-springs")),
    dict(id="mod-pizza", src="national", name="MOD Pizza", loc="MOD Pizza", osm=None, category="quick", minutes=15, busy=5, meal=True, dineIn=True, purchase=True, only=("denver", "colorado-springs")),
    dict(id="taco-johns", src="national", name="Taco John's", loc="Taco John's", osm=None, category="quick", minutes=10, busy=5, meal=True, dineIn=True, only=("denver",)),
    dict(id="kekes", src="national", name="Keke's Breakfast Cafe", loc="Keke's Breakfast Cafe", osm=None, category="breakfast", minutes=50, busy=20, meal=True, dineIn=True, window=("07:00", "14:30"), only=("denver",)),
    dict(id="einstein-bros", src="national", name="Einstein Bros. Bagels", loc="Einstein Bros. Bagels", osm=None, category="coffee", minutes=8, busy=5, meal=False, dineIn=False, kinds=["coffee", "snack"], only=("denver", "colorado-springs")),
    dict(id="ziggis", src="national", name="Ziggi's Coffee", loc="Ziggi's Coffee", osm=None, category="coffee", minutes=6, busy=5, meal=False, dineIn=False, only=("denver", "colorado-springs")),
    dict(id="paris-baguette", src="national", name="Paris Baguette", loc="Paris Baguette", osm=None, category="coffee", minutes=6, busy=3, meal=False, dineIn=False, purchase=True, only=("denver",)),
    dict(id="smoothie-king", src="national", name="Smoothie King", loc="Smoothie King", osm=None, category="treat", minutes=8, busy=5, meal=False, dineIn=False, window=("12:00", "15:00"), only=("denver",)),
    dict(id="tcby", src="national", name="TCBY", loc="TCBY", osm=None, category="treat", minutes=8, busy=3, meal=False, dineIn=False, only=("denver",)),
    dict(id="lamars", src="national", name="LaMar's Donuts", loc="LaMar's Donuts", osm=None, category="treat", minutes=6, busy=5, meal=False, dineIn=False, kinds=["sweet"], only=("denver",)),
    dict(id="le-peep", src="national", name="Le Peep", loc="Le Peep", osm=None, category="breakfast", minutes=45, busy=15, meal=True, dineIn=True, purchase=True, only=("denver",)),
    dict(id="parrys", src="national", name="Parry's Pizzeria & Taphouse", loc="Parry's Pizzeria & Taphouse", osm=None, category="meal", minutes=50, busy=20, meal=True, dineIn=True, window=("11:00", "15:00"), only=("denver", "colorado-springs")),
    dict(id="in-n-out", src="national", name="In-N-Out Burger", loc="In-N-Out Burger", osm=None, category="quick", minutes=20, busy=20, meal=True, dineIn=True, caution=NO_COMPANY_WORD, only=("denver", "colorado-springs")),
    dict(id="bass-pro-cabelas", src="national", name="Bass Pro Shops / Cabela's", loc="Bass Pro Shops / Cabela's", osm=None, category="breakfast", minutes=45, busy=20, meal=True, dineIn=True, window=("09:00", "10:00"), caution="Lists differ on when it ends (10 or 11 AM): go at 9", only=("denver", "colorado-springs")),
    dict(id="cobblestone", src="national", name="Cobblestone Car Wash", loc="Cobblestone Car Wash", osm=None, category="service", minutes=15, busy=15, meal=False, dineIn=False, kinds=["car-wash"], only=("denver",)),
    dict(id="strickland-brothers", src="national", name="Strickland Brothers 10 Minute Oil Change", loc="Strickland Brothers 10 Minute Oil Change", osm=None, category="service", minutes=25, busy=15, meal=False, dineIn=False, purchase=True, kinds=["oil-change"], only=("denver",)),
    dict(id="grease-monkey", src="national", name="Grease Monkey", loc="Grease Monkey", osm=None, category="service", minutes=30, busy=15, meal=False, dineIn=False, purchase=True, kinds=["oil-change"], only=("denver", "colorado-springs")),
    dict(id="floyds", src="national", name="Floyd's 99 Barbershop", loc="Floyd's 99 Barbershop", osm=None, category="service", minutes=30, busy=20, meal=False, dineIn=False, purchase=True, group="haircut", only=("denver", "colorado-springs")),
    dict(id="kona-grill", src="national", name="Kona Grill", loc="Kona Grill", osm=None, category="meal", minutes=70, busy=15, meal=True, dineIn=True, purchase=True, only=("denver",)),
    dict(id="benihana", src="national", name="Benihana", loc="Benihana", osm=None, category="meal", minutes=75, busy=15, meal=True, dineIn=True, purchase=True, only=("denver",)),
    dict(id="rodizio-grill", src="national", name="Rodizio Grill", loc="Rodizio Grill", osm=None, category="meal", minutes=90, busy=15, meal=True, dineIn=True, purchase=True, only=("denver",)),
    dict(id="saltgrass", src="national", name="Saltgrass Steak House", loc="Saltgrass Steak House", osm=None, category="meal", minutes=60, busy=15, meal=True, dineIn=True, purchase=True, only=("denver",)),
    dict(id="bjs", src="national", name="BJ's Restaurant & Brewhouse", loc="BJ's Restaurant & Brewhouse", osm=None, category="treat", minutes=30, busy=10, meal=False, dineIn=True, kinds=["sweet"], only=("colorado-springs",)),
    dict(id="black-bear-diner", src="national", name="Black Bear Diner", loc="Black Bear Diner", osm=None, category="meal", minutes=50, busy=20, meal=True, dineIn=True, only=("colorado-springs",)),
    dict(id="cheddars", src="national", name="Cheddar's Scratch Kitchen", loc="Cheddar's Scratch Kitchen", osm=None, category="meal", minutes=40, busy=15, meal=False, dineIn=True, eat=0.5, kinds=["snack"], only=("colorado-springs",)),
    dict(id="chicken-salad-chick", src="national", name="Chicken Salad Chick", loc="Chicken Salad Chick", osm=None, category="quick", minutes=15, busy=5, meal=True, dineIn=True, purchase=True, only=("colorado-springs",)),
    # Breakfast
    dict(id="dennys", src="national", name="Denny's", loc="Denny's", osm="dennys", category="breakfast", minutes=45, busy=15, meal=True, dineIn=True),
    # IHOP: 7 AM-7 PM per the American Legion's 2026 list (5 Nov); ihop.com wasn't readable.
    dict(id="ihop", src="national", name="IHOP", loc="IHOP", osm="ihop", category="breakfast", minutes=45, busy=15, meal=True, dineIn=True, window=("07:00", "19:00")),
    dict(id="perkins", src="national", name="Perkins", loc="Perkins", osm="perkins", category="breakfast", minutes=45, busy=10, meal=True, dineIn=True),
    dict(id="village-inn", src="national", name="Village Inn", loc="Village Inn", osm=None, category="breakfast", minutes=45, busy=10, meal=True, dineIn=True, caution="2026 lists differ on which breakfast, and Village Inn hasn't announced it: call first"),
    # Quick bites and pickups
    # ticket=True: a card or voucher for a later visit. A quick stop with nothing eaten there (8 Nov 2026).
    dict(id="texas-roadhouse", src="national", name="Texas Roadhouse", loc="Texas Roadhouse", osm="texasroadhouse", category="quick", minutes=8, busy=25, line=15, meal=False, dineIn=False, ticket=True),
    # Wendy's own post gives no hours, but its stores serve only breakfast until 10:30 AM and a Dave's Single isn't on
    # that menu (general knowledge, not checked store by store), so the deal starts at 10:30 (10 Nov 2026).
    dict(id="wendys", src="national", name="Wendy's", loc="Wendy's", osm="wendys", category="quick", minutes=12, busy=10, meal=False, dineIn=False, window=("10:30", None)),
    dict(id="little-caesars", src="national", name="Little Caesars", loc="Little Caesars", osm="littlecaesars", category="quick", minutes=8, busy=10, meal=False, dineIn=False),
    dict(id="firehouse-subs", src="national", name="Firehouse Subs", loc="Firehouse Subs", osm="firehouse", category="quick", minutes=15, busy=10, meal=False, dineIn=False, purchase=True, eat=0.5),
    # Smashburger: the Fargo store (1801 45th St SW) closed in October 2026 (8 Nov 2026); no other FM store.
    dict(id="chipotle", src="national", name="Chipotle", loc="Chipotle", osm="chipotle", category="quick", minutes=15, busy=10, meal=False, dineIn=True, purchase=True, eat=0.2),
    dict(id="qdoba", src="national", name="Qdoba", loc="Qdoba", osm="qdoba", category="quick", minutes=12, busy=5, meal=False, dineIn=True, eat=0.2),
    # Charleys: inside the Petro truck stop at 45th St S and 19th Ave S, next to Popeyes (8 Nov 2026).
    dict(id="charleys", src="national", name="Charleys Cheesesteaks", loc="Charleys Cheesesteaks", osm="charleys", category="quick", minutes=8, busy=5, meal=False, dineIn=False, eat=0.2, caution="Participating stores only", fm=dict(caution="Inside the Petro truck stop, next to Popeyes; participating stores only")),
    # Hardee's: remembered: a free breakfast sandwich in 2025 (8 Nov 2026); nothing published. Breakfast hours.
    # Fargo-Moorhead only: the memory is of a Fargo store, and nothing was published.
    dict(id="hardees", src="national", name="Hardee's", loc="Hardee's", osm=None, category="quick", minutes=8, busy=5, meal=False, dineIn=False, window=("06:00", "10:30"), hours=("06:00", "22:00"), only=("fargo-moorhead",)),
    dict(id="kwik-trip", src="national", name="Kwik Trip", loc="Kwik Trip", fm=dict(caution="Fargo stores are called Kwik Star"), osm="kwiktrip", category="quick", minutes=7, busy=5, meal=False, dineIn=False, hours=("00:00", "24:00"), kinds=["meal", "coffee"]),
    # McDonald's: a photo of one store's sign (10 Nov 2026), store unknown; owners choose, so grade C and ask first.
    # Fargo-Moorhead only: the sign came with Fargo items. Breakfast hours; stores from OpenStreetMap.
    dict(id="mcdonalds", src="national", name="McDonald's", loc=None, osm="mcdonalds", category="quick", minutes=10, busy=10, meal=False, dineIn=False, window=("05:00", "10:30"), hours=("05:00", "23:00"), kinds=["meal", "coffee"], caution="A sign at one McDonald's; each owner chooses: ask first", only=("fargo-moorhead",)),
    dict(id="pilot", src="national", name="Pilot / Flying J", loc="Pilot / Flying J", osm="pilot", category="quick", minutes=8, busy=5, meal=False, dineIn=False, kinds=["meal", "coffee"]),
    dict(id="mission-bbq", src="national", name="Mission BBQ", loc="Mission BBQ", osm=None, category="quick", minutes=20, busy=10, meal=False, dineIn=True),
    dict(id="shake-shack", src="national", name="Shake Shack", loc="Shake Shack", osm=None, category="quick", minutes=20, busy=10, meal=False, dineIn=True),
    dict(id="fazolis", src="national", name="Fazoli's", loc="Fazoli's", osm="fazolis", category="quick", minutes=20, busy=5, meal=False, dineIn=False),
    dict(id="blaze-pizza", src="national", name="Blaze Pizza", loc="Blaze Pizza", osm=None, category="quick", minutes=20, busy=10, meal=False, dineIn=True),
    # Coffee
    dict(id="starbucks", src="national", name="Starbucks", loc="Starbucks", osm="starbucks", category="coffee", minutes=8, busy=5, meal=False, dineIn=False),
    dict(id="scooters", src="national", name="Scooter's Coffee", loc="Scooter's Coffee", osm="scooters", category="coffee", minutes=6, busy=5, meal=False, dineIn=False, fm=dict(drop=["1350 21st Ave N"], caution="New store; opening not confirmed: call first")),
    dict(id="caribou", src="national", name="Caribou Coffee", loc="Caribou Coffee", osm="caribou", category="coffee", minutes=8, busy=5, meal=False, dineIn=False),
    dict(id="caseys", src="national", name="Casey's", loc="Casey's", osm="caseys", category="coffee", minutes=6, busy=3, meal=False, dineIn=False, hours=("05:00", "22:00")),
    dict(id="circle-k", src="national", name="Circle K", loc="Circle K / Holiday", osm="holiday", category="coffee", minutes=6, busy=3, meal=False, dineIn=False, hours=("05:00", "23:00")),
    dict(id="dunkin", src="national", name="Dunkin'", loc="Dunkin'", osm="dunkin", category="coffee", minutes=6, busy=5, meal=False, dineIn=False, kinds=["sweet"]),  # a free donut
    dict(id="biggby", src="national", name="Biggby Coffee", loc="Biggby Coffee", osm=None, category="coffee", minutes=6, busy=5, meal=False, dineIn=False),
    dict(id="seven-brew", src="national", name="7 Brew", loc="7 Brew", osm=None, category="coffee", minutes=6, busy=5, meal=False, dineIn=False, purchase=True),
    # Treats
    dict(id="krispy-kreme", src="national", name="Krispy Kreme", loc="Krispy Kreme", osm="krispykreme", category="treat", minutes=8, busy=5, meal=False, dineIn=False),
    dict(id="menchies", src="national", name="Menchie's", loc="Menchie's", osm="menchies", category="treat", minutes=10, busy=3, meal=False, dineIn=False),
    dict(id="insomnia", src="national", name="Insomnia Cookies", loc="Insomnia Cookies", osm="insomnia", category="treat", minutes=8, busy=3, meal=False, dineIn=False, purchase=True, eat=0.2),
    dict(id="freddys", src="national", name="Freddy's Frozen Custard & Steakburgers", loc="Freddy's Frozen Custard & Steakburgers", osm="freddys", category="treat", minutes=6, busy=5, meal=False, dineIn=False, ticket=True),
    dict(id="sonic", src="national", name="Sonic", loc="Sonic", osm=None, category="treat", minutes=8, busy=5, meal=False, dineIn=False, purchase=True, eat=0.3),
    # Marcus: free large popcorn, "by request when ordering at the theatre" (its own banner, seen 9 Nov 2026). No
    # ticket requirement stated (said in its limits, not as a caution: a caution counts as a 30% chance it falls
    # through). A counter stop; hours follow showtimes, so usual hours here until they're read.
    dict(id="marcus", src="national", name="Marcus Theatres", loc="Marcus Theatres", osm=None, category="treat", minutes=10, busy=10, line=5, meal=False, dineIn=False, eat=0.3, hours=("12:00", "21:30"), kinds=["snack"]),
    # Services. Great Clips is planned as picking up the free-haircut card (no group: it doesn't use up the day's haircut).
    dict(id="great-clips", src="national", name="Great Clips", loc="Great Clips", osm="greatclips", category="service", minutes=5, busy=5, line=3, meal=False, dineIn=False, ticket=True),
    dict(id="sport-clips", group="haircut", src="national", name="Sport Clips", loc="Sport Clips", osm="sportclips", category="service", minutes=30, busy=20, meal=False, dineIn=False, caution="Participating shops only: call first", fm=dict(caution="Participating shops only, and this address isn't confirmed: call first")),
    dict(id="tommys-express", src="national", name="Tommy's Express Car Wash", loc="Tommy's Express Car Wash", osm="tommys", category="service", minutes=12, busy=10, meal=False, dineIn=False),
    dict(id="jiffy-lube", src="national", name="Jiffy Lube", loc="Jiffy Lube", osm="jiffylube", category="service", minutes=30, busy=15, meal=False, dineIn=False, value=20, purchase=True, caution="Only some franchise shops take part: call first",
         # Colorado: Griffin Fast Lube's shops give the oil change free (research/colorado-chains-notes.md).
         in_area={"denver": dict(value=50, purchase=False, caution="Griffin Fast Lube's participating shops only, and extra fees may apply: call first", show=dict(grade="B", offer="A free conventional oil change (up to 5 quarts) for veterans and active military with proof of service, at Griffin Fast Lube's participating Jiffy Lube shops", notes="Colorado's Jiffy Lube franchisee, Griffin Fast Lube, gives a free conventional oil change on 11 Nov at participating shops (Mile High on the Cheap and KOOL 105, 10 Nov 2026; the shop lists are at jiffylubegfl.com). Fees may apply for 4x4s, shop supplies, extra oil and special filters; tax not included. Participation varies by shop: call first.")),
                  "colorado-springs": dict(value=50, purchase=False, caution="Griffin Fast Lube's participating shops only, and extra fees may apply: call first", show=dict(grade="B", offer="A free conventional oil change (up to 5 quarts) for veterans and active military with proof of service, at Griffin Fast Lube's participating Jiffy Lube shops", notes="Colorado's Jiffy Lube franchisee, Griffin Fast Lube, gives a free conventional oil change on 11 Nov at participating shops (Mile High on the Cheap and KOOL 105, 10 Nov 2026; the shop lists are at jiffylubegfl.com). Fees may apply for 4x4s, shop supplies, extra oil and special filters; tax not included. Participation varies by shop: call first."))}),
    # Shopping (no dollar value: what you save depends on what you buy, so they're listed, not routed, unless pinned)
    dict(id="target", src="national", name="Target", loc="Target", osm="target", category="shopping", minutes=25, busy=5, meal=False, dineIn=False, value=0, purchase=True),
    dict(id="kohls", src="national", name="Kohl's", loc="Kohl's", osm="kohls", category="shopping", minutes=25, busy=5, meal=False, dineIn=False, value=0, purchase=True),
    dict(id="walgreens", src="national", name="Walgreens", loc="Walgreens", osm=None, category="shopping", minutes=15, busy=5, meal=False, dineIn=False, value=0, purchase=True),
    # Local: grade C (earlier years, "call first") unless the research grades them up from the business's own 2026
    # word (Fryn' Pan, Doolittle's and Porter Creek from a phone check; the Air Museum's calendar; Cash Wise's page).
    dict(id="fryn-pan", src="local", name="Fryn' Pan Family Restaurant (M", osm="frynpan", category="meal", minutes=45, busy=15, meal=True, dineIn=True, window=("08:00", "20:00")),
    dict(id="doolittles", src="local", name="Doolittle's Woodfire Grill (Fa", osm="doolittles", category="meal", minutes=55, busy=15, meal=True, dineIn=True),
    dict(id="porter-creek", src="local", name="Porter Creek Hardwood Grill (F", osm="portercreek", category="meal", minutes=55, busy=15, meal=True, dineIn=True),
    dict(id="fargo-air-museum", src="local", name="Veterans Day Program, United P", osm="airmuseum", category="event", minutes=60, busy=0, meal=False, dineIn=False, window=("11:00", "12:00"), arrive_by="11:00", worth=12),
    dict(id="fargo-vfw-legion", src="local", name="Fargo VFW and American Legion", osm=None, category="event", minutes=40, busy=10, meal=True, dineIn=True, window=("11:45", "14:00"), kinds=["meal"]),
    dict(id="amvets-post-7", src="local", name="Fargo AMVETS Post 7 Veterans D", osm=None, category="event", minutes=40, busy=10, meal=True, dineIn=True, window=("12:00", "14:00"), kinds=["meal"]),
    dict(id="moorhead-legion", src="local", name="Moorhead American Legion Veter", osm=None, category="event", minutes=45, busy=10, meal=True, dineIn=True, window=("12:00", "18:30"), kinds=["meal"]),
    dict(id="west-fargo-vfw", src="local", name="West Fargo VFW Post 7564 Veter", osm=None, category="event", minutes=45, busy=5, meal=True, dineIn=True, window=("10:30", "14:00"), arriveEarly=True, worth=12),
    # Added 8 Nov 2026 from the consolidated report: local offers that only one 2026 listing carries (grade C, call
    # first), the Air Museum's coffee hour and the Harwood Legion's stew.
    dict(id="air-museum-coffee", src="local", name="Fargo Air Museum Veterans Coffee", osm=None, category="event", minutes=30, busy=5, meal=False, dineIn=True, window=("10:00", "12:00"), eat=0.2, kinds=["coffee"]),
    dict(id="harwood-legion", src="local", name="Harwood American Legion Post 297", osm=None, category="event", minutes=40, busy=5, meal=True, dineIn=True, window=("17:00", "19:00"), kinds=["meal"]),
    dict(id="sickies", src="local", name="Sickies Garage Burgers & Brews (Fa", osm=None, category="meal", minutes=50, busy=15, meal=True, dineIn=True),
    dict(id="brewtus", src="local", name="Brewtus' Brickhouse", osm=None, category="meal", minutes=45, busy=10, meal=True, dineIn=True, window=("11:00", "14:00"), caution=ONE_REPORT),
    dict(id="pub-west", src="local", name="Pub West", osm=None, category="meal", minutes=50, busy=10, meal=True, dineIn=True, purchase=True, caution="Offer and address not confirmed: call first", kinds=["bar", "meal"]),
    # Cash Wise: its own page (8 Nov 2026) gives the dinner but no store list, so all four metro stores, "call yours".
    dict(id="cash-wise-deli", src="local", name="Cash Wise Foods deli", osm=None, category="quick", minutes=12, busy=5, meal=False, dineIn=False, eat=0.6, window=("11:00", "19:00"), caution="Cash Wise's page lists no stores: call yours first"),
    # Hornbacher's: the same dinner (both are Coborn's stores); its sign, at every store (10 Nov 2026).
    dict(id="hornbachers-deli", src="national", name="Hornbacher's", loc="Hornbacher's", osm=None, category="quick", minutes=12, busy=5, meal=False, dineIn=False, eat=0.6, window=("11:00", "19:00"), hours=("06:00", "22:00"), only=("fargo-moorhead",)),
    # Royal Buffet: free buffet 9-11 Nov on Fargo Legion Post 2's 30 Oct 2026 list (the same offer as 2023).
    dict(id="royal-buffet", src="local", name="Royal Buffet", osm=None, category="meal", minutes=50, busy=15, meal=True, dineIn=True),
    # From Fargo Legion Post 2's "more options" post (images shared 10 Nov 2026), each the business's own 2026 word.
    dict(id="peppers", src="local", name="Pepper's Sports Cafe", osm=None, category="meal", minutes=50, busy=15, meal=True, dineIn=True, window=("11:00", "16:00")),
    dict(id="super-buffet", src="local", name="Super Buffet Sushi & Grill", osm=None, category="meal", minutes=50, busy=15, meal=True, dineIn=True, window=("11:00", "21:00")),
    dict(id="super-buffet-ceremony", src="local", name="Super Buffet Veterans Day ceremony", osm=None, category="event", minutes=60, busy=0, meal=False, dineIn=False, window=("17:45", "21:00"), arrive_by="18:00", worth=10),
    dict(id="fix-it-forward", src="local", name="Fix It Forward Auto Care", osm=None, category="service", minutes=40, busy=10, meal=False, dineIn=False, kinds=["oil-change"]),
    dict(id="sandys-donuts", src="local", name="Sandy's Donuts", osm=None, category="treat", minutes=6, busy=5, meal=False, dineIn=False, window=("06:00", "13:30"), hours=("06:00", "13:30"), caution=ONE_REPORT),
    # From Valley News Live's 2026 roundup (9 Nov): a flag swap at Scheels and a school Mass at Nativity (grade B).
    # The flag exchange needs an old flag to swap, so it has no weight on a route: it joins one only if you pin it.
    dict(id="scheels-flag-exchange", src="local", name="Scheels flag exchange", osm=None, category="event", minutes=10, busy=5, meal=False, dineIn=False, window=("11:00", "13:00"), worth=0, kinds=["flag"]),
    # The Fargo Elks' own flyer (shared 10 Nov 2026): free chili for veterans from 3 PM; no end time given.
    dict(id="fargo-elks-chili", src="local", name="Fargo Elks #260 Veterans Day chili feed", osm=None, category="event", minutes=40, busy=10, meal=True, dineIn=True, window=("15:00", "18:00"), kinds=["meal"]),
    dict(id="nativity-mass", src="local", name="Nativity Catholic Church Veterans Day Mass", osm=None, category="event", minutes=60, busy=0, meal=False, dineIn=False, window=("08:15", "10:15"), arrive_by="08:30", worth=8, hours=("08:00", "10:30")),
    # Bars: their own category, on the route since asked (8 Nov 2026: "Add the bars"); the app shows a drive-safe
    # line on their cards and on any route with one. All but Blarney Stone are earlier years only (grade C).
    dict(id="blarney-stone", src="local", name="Blarney Stone", osm=None, category="bar", minutes=30, busy=5, meal=False, dineIn=True, eat=0, caution=ONE_REPORT),
    dict(id="drekker", src="local", name="Drekker Brewing", osm=None, category="bar", minutes=30, busy=5, meal=False, dineIn=True, eat=0),
    dict(id="swing-barrel", src="local", name="Swing Barrel Brewing", osm=None, category="bar", minutes=30, busy=5, meal=False, dineIn=True, eat=0),
    dict(id="mills-lounge", src="local", name="Mills Lounge", osm=None, category="bar", minutes=30, busy=5, meal=False, dineIn=True, eat=0),
    dict(id="okellys", src="local", name="O'Kelly's", osm=None, category="bar", minutes=30, busy=5, meal=False, dineIn=True, eat=0),
    dict(id="franks-lounge", src="local", name="Frank's Lounge", osm=None, category="bar", minutes=30, busy=5, meal=False, dineIn=True, eat=0.3),
    dict(id="micks-office", src="local", name="Mick's Office", osm=None, category="bar", minutes=45, busy=10, meal=True, dineIn=True),
    dict(id="chumleys", src="local", name="J.C. Chumley's", osm=None, category="bar", minutes=45, busy=10, meal=True, dineIn=True),
    dict(id="bordertown", src="local", name="BorderTown", osm=None, category="bar", minutes=45, busy=10, meal=True, dineIn=True),
    dict(id="hen-house", src="local", name="Hen House Bar", osm=None, category="bar", minutes=45, busy=10, meal=True, dineIn=True, purchase=True),
    dict(id="spitfire", src="local", name="Spitfire Bar", osm=None, category="bar", minutes=45, busy=10, meal=True, dineIn=True, purchase=True),
]
# The src="local" entries above are Fargo-Moorhead's. Every other area's local entries are listed here, in the same
# form, and match the names in that area's research/<id>/local-2026.json.
LOCAL = {
    # Research 9-10 Nov 2026 (veterans-day/research/bismarck-mandan/notes.md). The Heritage Center program (KX News,
    # 4 Nov, organizers quoted) and the University of Mary's Mass (its own post, 27 Oct) have 2026 times; the rest are
    # earlier years (grade C). New Salem's Post 91 and the
    # Bismarck VFW have no time at all, so they're listed under Deals (extras), not routed. arrive_by: a ceremony's start
    # (engine v1.3: the route gets you there by then, not just before it ends). Fargo-Moorhead's events don't use it yet.
    "bismarck-mandan": [
        dict(id="nd-heritage-center", src="local", name="Veterans Day Program, ND Heritage Center", osm=None, category="event", minutes=75, busy=0, meal=False, dineIn=False, window=("09:30", "11:00"), arrive_by="09:45", worth=12, show=dict(notes="KX News (4 Nov 2026) quotes the organizers: AMVETS choir at 9:30 AM, program at 9:45 AM, in the Russell Reid Auditorium. No end time is published; plan on about an hour. Free and open to all in past years.")),
        dict(id="all-veterans-memorial", src="local", name="All Veterans Memorial", osm=None, category="event", minutes=20, busy=0, meal=False, dineIn=False, window=("10:55", "11:20"), arrive_by="11:00", worth=8, kinds=["memorial"], show=dict(notes="A yearly tradition: at 11:00 AM on 11 Nov, sunlight through the memorial's dome lands on North Dakota on its globe (clear days). Next to the Heritage Center. No 2026 notice found.")),
        dict(id="amvets-post-9", src="local", name="AMVETS Post 9", osm=None, category="event", minutes=60, busy=10, meal=True, dineIn=True, window=("11:45", "14:00"), show=dict(offer="Last year: a Veterans Day ceremony at the club (a rose ceremony for veterans who died that year, a gun salute, taps), then a free lunch for everyone there, from Post 9 (KX News, 2025). In an earlier year the club opened at 11 AM with the salute at noon. No 2026 time posted", notes="No 2026 time posted. Call (701) 258-8324.")),
        dict(id="umary-veterans-day", src="local", name="University of Mary Veterans Day", osm=None, category="event", minutes=105, busy=5, meal=True, dineIn=True, window=("09:45", "12:15"), arrive_by="10:00", worth=12, show=dict(notes="The University of Mary's own post (27 Oct 2026): Mass at 10:00 AM in Our Lady of the Annunciation Chapel, open to everyone, then a free brunch at The Crow's Nest campus restaurant for veterans, active-serving military and their families. No RSVP mentioned.")),
        # Flags on the school lawn: a drive-by in daylight (sunset is about 5 PM).
        dict(id="mandan-field-of-flags", src="local", name="Mandan Middle School Field of Flags", osm=None, category="event", minutes=10, busy=0, meal=False, dineIn=False, hours=("08:00", "17:00"), worth=4, kinds=["memorial"], show=dict(notes="KX News reported the 2026 display; it stays up through Thu 12 Nov. View it from outside the school.")),
    ],
    # Research 9 Nov 2026 (veterans-day/research/twin-cities/notes.md): no 2026 ceremony found for Plymouth or
    # Roseville. Places just outside the area (Tria, Kendall's) and the 5-8 Club (no address) are listed under Deals.
    "twin-cities": [
        dict(id="maple-grove-tribute", src="local", name="Maple Grove Veterans Day tribute", osm=None, category="event", minutes=60, busy=0, meal=False, dineIn=False, window=("11:00", "12:00"), arrive_by="11:00", worth=12, show=dict(notes="On the City of Maple Grove's events page for Wed 11 Nov 2026, hosted by Maple Grove Beyond the Yellow Ribbon and the Osseo-Maple Grove American Legion. Free, all ages.")),
        dict(id="malones-maple-grove", src="local", name="Malone's Bar & Grill", osm=None, category="meal", minutes=55, busy=20, meal=True, dineIn=True, caution="One 2026 deal list carries it, and the address is from directories: call first", show=dict(notes="One 6 Nov 2026 deal list carries it (Twin Cities Frugal Mom); no post from the restaurant was found. Address from directories.")),
        dict(id="tavern-grill-arden-hills", src="local", name="The Tavern Grill, Arden Hills", osm=None, category="meal", minutes=55, busy=20, meal=True, dineIn=True, caution="Address from directories: call first", show=dict(notes="A 6 Nov 2026 list (Bring Me The News) names Arden Hills among the Tavern Grill stores offering it. Address from directories.")),
    ],
    # Reston and Northern Virginia (Antigravity's research, 10 Nov 2026; sources, pins, grades and facts checked and
    # corrected the same night: details in research/reston-va/notes.md). Jimmy's Old Town Tavern moved to the leads.
    "reston-va": [
        # A paid race ($35; watching is free), so it waits under "Deals that need a purchase".
        dict(id="rtc-run-for-valor", src="local", name="RTC Run for Valor 5K, Reston Town Center", osm=None, category="event", minutes=90, busy=0, meal=False, dineIn=False, window=("06:45", "09:30"), arrive_by="07:45", worth=12, purchase=True, kinds=["ceremony"], show=dict(cost_text="$35 to run; free to watch", notes="The 2nd annual 5K, hosted by BXP for its veterans' group (Valor) with Microsoft, for Soldiers' Angels. Registration $35 through race day; watching is free. Remarks 7:45, start 8:00 at RTC Window Plaza on Opportunity Way; the finish is on Market St at the fountain. Free parking in the orange garage.")),
        dict(id="herndon-post-184-ceremony", src="local", name="Herndon Veterans Day Ceremony (American Legion Post 184)", osm=None, category="event", minutes=60, busy=0, meal=False, dineIn=False, window=("10:45", "12:00"), arrive_by="11:00", worth=12, show=dict(notes="The Town of Herndon's ceremony, sponsored by Wayne M. Kidwell American Legion Post 184, at 11:00 AM on the Town Green (777 Lynn St). End time not published. An Avenue of Flags is on display at Chestnut Grove Cemetery.")),
        dict(id="fairfax-post-177-ceremony", src="local", name="Fairfax Veterans Day Ceremony (American Legion Post 177)", osm=None, category="event", minutes=60, busy=0, meal=False, dineIn=False, window=("10:30", "11:30"), arrive_by="10:30", worth=12, show=dict(notes="American Legion Post 177 and VFW Post 8469, 3939 Oak St, Fairfax, from 10:30 AM; keynote Judge Michael C. Sprano (FFXnow, 10 Nov 2026). End time not published: an hour is allowed. Free and open to the public.")),
        dict(id="kensington-reston-celebration", src="local", name="Veterans Day Ceremony, The Kensington Reston", osm=None, category="event", minutes=60, busy=0, meal=False, dineIn=False, window=("14:00", "16:00"), worth=10, caution="A senior-living community: RSVP or call (571) 494-8100 first", show=dict(notes="\"An Afternoon of Gratitude & Recognition\" at The Kensington Reston (11501 Sunrise Valley Dr), 2:00-4:00 PM: recognition of all veterans and live music. Its page has an RSVP and doesn't say whether the public may come.")),
        dict(id="chick-fil-a-metro-dc", src="local", name="Chick-fil-A (Metro DC)", loc="Chick-fil-A", osm=None, category="quick", minutes=15, busy=12, meal=False, dineIn=False, drop=["4400 University Dr"], show=dict(notes="Chick-fil-A Metro DC's offer (cfametrodc.com, read 10 Nov 2026), open to close: a Chicken Biscuit, Egg White Grill or 4-count Chick-n-Minis until 10:30 AM; a Chicken Sandwich, Spicy Chicken Sandwich or 8-count Nuggets after. Proof of service required; not for mobile or delivery orders. All 10 stores shown are on its participating list.")),
        dict(id="founding-farmers", src="local", name="Founding Farmers", osm=None, category="meal", minutes=55, busy=20, meal=True, dineIn=True, purchase=True, show=dict(notes="50% off brunch, lunch or dinner (not breakfast) for active-duty, retired military and veterans: food only, dine-in only, not to go. Bring a valid ID or DD-214, or wear your uniform. Reston Station (1904 Reston Metro Plaza) and Tysons (1800 Tysons Blvd), lunch and dinner 11 AM-10 PM; brunch may start about 9 AM on the holiday. Its page doesn't list the locations taking part, so reserve or call first.")),
        # WTOP's 9 Nov list and the attached 11 Nov report (checked 11 Nov 2026; research/reston-va/notes.md). The
        # Greene Turtle is left out: its only store near the circles (Dulles Town Center) closed years ago.
        dict(id="silver-diner", src="local", name="Silver Diner", osm=None, category="meal", minutes=50, busy=15, meal=True, dineIn=True, purchase=True, show=dict(notes="25% off an entree for veterans and active-duty military with a valid military ID, at all its DC, Maryland and Virginia stores (WTOP, 9 Nov; Stars and Stripes, 6 Nov). Not on Silver Diner's own site.")),
        dict(id="melting-pot-reston", src="local", name="The Melting Pot", osm=None, category="meal", minutes=90, busy=10, meal=True, dineIn=True, purchase=True, window=("17:00", "21:00"), show=dict(notes="The Reston restaurant's own page: a free 4-course fondue meal for a veteran with proof of service when another guest buys one, 11 Nov only, dine-in. Not for family members. Space is limited: reserve, (703) 435-1277. Opens 5 PM; last seating 9 PM.")),
        dict(id="grace-for-vets", src="local", name="Grace for Vets", osm=None, category="service", minutes=15, busy=15, meal=False, dineIn=False, hours=("08:00", "20:00"), kinds=["car-wash"], caution="Participating washes only, hours not published for the day: call first", show=dict(notes="Grace for Vets: a free car wash for veterans and active duty every 11 Nov at participating washes; near Reston, all are Flagship Carwash sites on its list. Proof isn't stated: bring a military or veteran ID.")),
        dict(id="paisanos-pizza", src="local", name="Paisano's Pizza", osm=None, category="quick", minutes=15, busy=15, meal=False, dineIn=False, show=dict(notes="A free large one-topping pizza for veterans and active duty at all 40 Paisano's in Virginia, Maryland and DC (Food Network, 9 Nov 2026). In-store, with a US Uniformed Services ID (active or retired), a veterans organization card or your uniform. Not on Paisano's own site.")),
        dict(id="frying-pan-wagon-rides", src="local", name="Frying Pan Farm Park", osm=None, category="event", minutes=45, busy=10, meal=False, dineIn=False, window=("10:00", "15:00"), worth=8, kinds=["outing"], show=dict(notes="The Fairfax County Park Authority's free wagon rides for active-duty service members, veterans and their families, 10 AM-3 PM (FFXnow, 10 Nov 2026). 2709 West Ox Rd, Herndon; (703) 437-9101.")),
        dict(id="teds-bulletin", src="local", name="Ted's Bulletin", osm=None, category="treat", minutes=10, busy=5, meal=False, dineIn=False, show=dict(notes="A free Ted's Tart for veterans (Military.com and Stars and Stripes 2026 lists; not Ted's own page). Reston Town Center, 11948 Market St.")),
    ],
    # Reno-Sparks (11 Nov 2026, from the research report of 10 Nov; every offer checked at its own source the same night:
    # research/reno-sparks/notes.md). The casinos' players' clubs are a sign-up ahead (`advance_signup` in the
    # research), so those deals carry half weight until marked "Signed up ahead" under Me.
    "reno-sparks": [
        dict(id="reno-parade", src="local", name="Reno Veterans Day Parade", osm=None, category="event", minutes=90, busy=0, meal=False, dineIn=False, window=("10:45", "13:00"), arrive_by="11:00", worth=12, show=dict(notes="The City of Reno's parade: the opening ceremony at 11:11 AM near the Virginia Street Bridge, just south of First St (prayer, national anthem, city proclamation), then the parade north on Virginia St from Liberty St to Sixth St (KOLO, 3 Nov 2026; Fox 11, 10 Nov 2026). Streets close 5 AM-3 PM: Virginia St from Liberty to Sixth, and First St from N Sierra St to University Way. RTC buses are free all day. End time not published; streamed on the city's YouTube from 11 AM.")),
        dict(id="sparks-memorial-plaza-observance", src="local", name="Veterans Day observance, Nevada Veterans Memorial Plaza", osm=None, category="event", minutes=60, busy=0, meal=False, dineIn=False, window=("09:00", "11:30"), worth=12, show=dict(notes="The Nevada Veterans Memorial Plaza's community observance at the Sparks Marina, 300 Howard Dr, 9:00-11:30 AM (its own events page, nvmp.us). Program details not published.")),
        dict(id="nevada-museum-of-art", src="local", name="Nevada Museum of Art", osm=None, category="event", minutes=60, busy=5, meal=False, dineIn=False, window=("10:00", "18:00"), kinds=["outing"], show=dict(notes="Free admission for veterans and active duty, 10 AM-6 PM, with the new flag exhibition \"Broad Stripes Bright Stars\" (Fox 11, 10 Nov 2026, quoting the museum; not on the museum's own site). Not free for other visitors. 160 W Liberty St, two blocks from the parade.")),
        dict(id="j-resort-buffet", src="local", name="J Resort: The Buffet", osm=None, category="meal", minutes=75, busy=30, meal=True, dineIn=True, window=("16:00", "21:00"), show=dict(notes="J Resort's own page: a free buffet for current and retired military, 4-9 PM, military ID required, dine-in only. Veterans who aren't retired aren't named: call first. Friends and family pay (locals get 25% off dining). 345 N Arlington Ave, downtown.")),
        dict(id="atlantis-lunch-buffet", src="local", name="Atlantis Casino Resort Spa", osm=None, category="meal", minutes=75, busy=30, meal=True, dineIn=True, window=("11:00", "15:00"), show=dict(notes="Atlantis's own page: a free lunch buffet at Toucan Charlie's, 11 AM-3 PM, 9-11 Nov. Show a Monarch Rewards card and a military ID, military spouse ID or DD-214 at the buffet cashier. One free buffet per person for the whole promotion: if you had it Monday or Tuesday, it's used. Join Monarch Rewards (free) at its desk first; players' clubs generally need you to be 21. 3800 S Virginia St.")),
        dict(id="legends-bay-lb-grill", src="local", name="Legends Bay Casino", osm=None, category="meal", minutes=45, busy=15, meal=True, dineIn=True, window=("07:00", "22:00"), show=dict(notes="Legends Bay's own page: a free All American Breakfast or Smash Burger at LB Grill, 7 AM-10 PM, for veterans and first responders who are LB Rewards members, with ID. Join LB Rewards (free) at the casino first; players' clubs generally need you to be 21. 100 Legends Bay Dr, Sparks.")),
        dict(id="gold-dust-west", src="local", name="Gold Dust West", osm=None, category="meal", minutes=50, busy=20, meal=True, dineIn=True, caution="Hours and restaurant not published: call (775) 323-2211 first", show=dict(notes="Gold Dust West's own page: a free meal for current and retired military, dine-in, with a military ID. Veterans who aren't retired aren't named. No hours, restaurant or menu published, so usual meal hours are shown. 444 Vine St.")),
        dict(id="squeeze-in", src="local", name="Squeeze In", osm=None, category="breakfast", minutes=50, busy=25, meal=True, dineIn=True, caution="Its post names no stores, hours or proof: call yours first", show=dict(notes="Squeeze In's own post (10 Nov 2026): a free meal of your choice for veterans on 11 Nov. It doesn't name stores, hours or proof, so bring your ID and call first. Hours are each store's usual Wednesday hours from its own site.")),
        dict(id="in-n-out", src="local", name="In-N-Out Burger", loc="In-N-Out Burger", osm=None, category="quick", minutes=20, busy=20, meal=True, dineIn=True, caution=NO_COMPANY_WORD, show=dict(notes="On 2026 national lists (Newsweek, The Military Wallet): a free burger, fries and drink for veterans, active duty, Reserve and Guard with proof of service, plus a Veterans Day decal. Not announced by In-N-Out itself. Order inside: lists differ on the drive-through.")),
    ],
    # Fort Meade, MD (checked 11 Nov 2026 from the research report and the coordinating session's leads; every source and
    # correction in research/fort-meade/notes.md). No 2026 ceremony was found inside the circles, so the ceremonies are
    # under Deals (extras). Chick-fil-A, Silver Diner and Grace for Vets reuse Reston's offer ids: the same offers.
    "fort-meade": [
        # Chick-fil-A Metro DC's list names only "Laurel" here (13600 Baltimore Ave); the other nine stores aren't on it.
        dict(id="chick-fil-a-metro-dc", src="local", name="Chick-fil-A (Metro DC)", loc="Chick-fil-A", osm=None, category="quick", minutes=15, busy=12, meal=False, dineIn=False, drop=["7055 Arundel Mills", "3366 Corridor", "2615 Brandermill", "2691 Carver", "10300 Little Patuxent", "10975 Johns Hopkins", "4905 Executive Park", "6375 Dobbin", "9081 Snowden"], show=dict(notes="Chick-fil-A Metro DC's offer (cfametrodc.com, read 11 Nov 2026), open to close: a Chicken Biscuit, Egg White Grill or 4-count Chick-n-Minis until 10:30 AM; a Chicken Sandwich, Spicy Chicken Sandwich or 8-count Nuggets after. Proof of service required; not for mobile or delivery orders. Near Fort Meade its participating list names only the Laurel restaurant (13600 Baltimore Ave); other Chick-fil-A stores here have other owners and aren't on it, so ask before counting on one.")),
        dict(id="silver-diner", src="local", name="Silver Diner", osm=None, category="meal", minutes=50, busy=15, meal=True, dineIn=True, purchase=True, show=dict(notes="25% off an entree for veterans and active-duty military with a valid military ID, at all its DC, Maryland and Virginia stores (WTOP, 9 Nov; Stars and Stripes, 6 Nov). Not on Silver Diner's own site. The one here is in Elkridge, at the Columbia edge of the area.")),
        dict(id="grace-for-vets", src="local", name="Grace for Vets", osm=None, category="service", minutes=15, busy=15, meal=False, dineIn=False, hours=("08:00", "20:00"), kinds=["car-wash"], caution="Participating washes only, hours not published for the day: call first", show=dict(notes="Grace for Vets: a free car wash for veterans and active duty every 11 Nov at participating washes. In this area its list has one: Flagship Carwash, 771 Donaldson Ave, Severn. Proof isn't stated: bring a military or veteran ID.")),
        dict(id="greene-turtle", src="local", name="The Greene Turtle", osm=None, category="meal", minutes=55, busy=20, meal=True, dineIn=True, caution="Select locations, and addresses from directories: call first", show=dict(notes="A free dine-in meal up to $15 for veterans (WTOP, 9 Nov 2026); not on the Greene Turtle's own site. Lists say select locations. Addresses from directories: Columbia (8872 McGaw Rd) and Arundel Mills (7556 Teague Rd).")),
        dict(id="main-event", src="local", name="Main Event", osm=None, category="meal", minutes=60, busy=15, meal=True, dineIn=True, kinds=["meal", "games"], caution="Participating centers only: call first", show=dict(notes="A free double cheeseburger with fries and 30 minutes of game play for veterans and active duty with ID, on Main Event's Columbia page (no year shown) and the American Legion's 5 Nov 2026 list. In the Mall in Columbia; hours not read.")),
        dict(id="all-american-steakhouse", src="local", name="All American Steakhouse", osm=None, category="meal", minutes=50, busy=15, meal=True, dineIn=True, caution=ONE_REPORT, show=dict(notes="One 2026 deal list (Dealybee, 9 Nov) carries it for the Odenton restaurant; no post from the restaurant was found. Veterans only, with a valid ID; mention the promotion. 1502 Annapolis Rd, (410) 305-0505; address from directories.")),
        dict(id="kpot-laurel", src="local", name="KPOT Korean BBQ", osm=None, category="meal", minutes=75, busy=15, meal=True, dineIn=True, purchase=True, caution=ONE_REPORT, show=dict(notes="One 2026 deal list (Dealybee, 9 Nov) carries it: free for the first 20 with a valid military ID, then 50% off; drinks not included. No post from KPOT was found. 351 Montrose Ave, Laurel, (240) 280-2840; address and hours from directories.")),
    ],
    # Denver metro (11 Nov 2026, the "metro spread"; every offer checked at its own source that night:
    # research/denver/notes.md). Discounts on a meal you buy are purchase deals (Off by default).
    "denver": [
        dict(id="westminster-ceremony", src="local", name="Westminster Veterans Day Ceremony", osm=None, category="event", minutes=60, busy=0, meal=False, dineIn=False, window=("10:00", "11:00"), arrive_by="10:00", worth=12, show=dict(notes="The City of Westminster's ceremony at the Armed Forces Tribute Garden, 6001 W 104th Ave, Westminster, CO 80031, 10-11 AM (city calendar, 2026). Free; flag presentation, live music, keynote and free coffee are listed by the Denver Gazette (10 Nov 2026).")),
        dict(id="wings-over-rockies", src="local", name="Wings Over the Rockies Air & Space Museum", osm=None, category="event", minutes=90, busy=10, meal=False, dineIn=False, window=("10:00", "17:00"), kinds=["outing"], worth=15, show=dict(notes="Free admission for veterans and active duty with a military ID, no advance ticket, 10 AM-5 PM (the museum's own page, 2026). 7711 E Academy Blvd, Denver, CO 80230. Guests need tickets bought online.")),
        dict(id="blue-island", src="local", name="Blue Island Oyster Bar", osm=None, category="meal", minutes=75, busy=30, meal=True, dineIn=True, window=("11:30", "21:00"), worth=40, caution="Closing time varies by listing (9 or 10 PM); call first.", show=dict(notes="A free entree (up to $40) and a nonalcoholic drink for veterans, dine-in, on a select menu (Mile High on the Cheap and the Denver Gazette, 10 Nov 2026). Cherry Creek: 2625 E 2nd Ave, Denver, CO 80206 (11:30 AM-9 PM). Lone Tree: 10008 Commons St, Lone Tree, CO 80124 (11 AM-9 PM).")),
        dict(id="ash-and-agave", src="local", name="Ash and Agave", osm=None, category="meal", minutes=75, busy=30, meal=True, dineIn=True, window=("11:00", "21:00"), worth=35, caution="Hours are not published; the window here is an assumption. Call first.", show=dict(notes="A free entree (up to $35) and a nonalcoholic drink for veterans, dine-in (Mile High on the Cheap and the Denver Gazette, 10 Nov 2026). Cherry Creek Shopping Center, 3000 E 1st Ave, Denver, CO 80206, lower level near Neiman Marcus.")),
        dict(id="thirsty-lion", src="local", name="Thirsty Lion", osm=None, category="meal", minutes=60, busy=30, meal=True, dineIn=True, window=("11:00", "22:00"), worth=17, show=dict(notes="A free entree for veterans and active duty from a short list (Denver Gazette and Westword, 10 Nov 2026). Union Station, 1605 Wynkoop St, Denver, CO 80202, open 11 AM-10 PM (the restaurant's page). Phone 303-623-0316.")),
        dict(id="salt-water-social", src="local", name="Salt Water Social", osm=None, category="meal", minutes=75, busy=30, meal=True, dineIn=True, window=("11:00", "21:00"), purchase=True, worth=30, caution="Hours are not published; the window here is an assumption. A starter must be bought. Call first.", show=dict(notes="A free select entree with the purchase of a starter, for veterans, active duty, reservists and Gold Star families, through 11 Nov, dine-in (its own page, 2026). 201 Columbine St, Denver, CO 80206.")),
        dict(id="stk-denver", src="local", name="STK Steakhouse", osm=None, category="meal", minutes=90, busy=30, meal=True, dineIn=True, window=("17:00", "22:00"), purchase=True, worth=40, caution="Hours are not published and Denver is not named as participating on STK's page; a starter must be bought. Call first.", show=dict(notes="A free entree (Steak Frites, salmon, chicken or tagliatelle) with the purchase of any starter, for veterans, active duty, reservists and Gold Star families, through 11 Nov, dine-in (STK's own page, 2026). 1550 Market St, Denver, CO 80202.")),
        dict(id="denver-chophouse", src="local", name="Denver Chophouse & Brewery", osm=None, category="meal", minutes=75, busy=30, meal=True, dineIn=True, purchase=True, window=("11:00", "21:00"), kinds=["bar","meal"], caution="One source (Westword); hours not published and the window is an assumption. Call first.", show=dict(notes="25% off the whole meal for veterans and active duty (Westword, 10 Nov 2026). 1735 19th St, Denver, CO 80202, LoDo.")),
        dict(id="henrys-tavern", src="local", name="Henry's Tavern", osm=None, category="meal", minutes=75, busy=30, meal=True, dineIn=True, purchase=True, window=("11:00", "21:00"), kinds=["bar","meal"], caution="One source (Westword); hours not published and the window is an assumption. Call first.", show=dict(notes="25% off the whole meal for veterans and active duty (Westword, 10 Nov 2026). Denver Pavilions, 500 16th St, Suite 184B, Denver, CO 80202. Phone 720-399-8466.")),
        dict(id="viewhouse-ballpark", src="local", name="ViewHouse Eatery Bar & Rooftop (Ballpark)", osm=None, category="meal", minutes=75, busy=30, meal=True, dineIn=True, purchase=True, window=("11:00", "22:00"), kinds=["bar","meal"], caution="Which ViewHouse locations take part in 2026 is not confirmed; hours not published and the window is an assumption. Call first.", show=dict(notes="20% off for veterans and active duty (Mile High on the Cheap and Westword, 10 Nov 2026). Ballpark location: 2015 Market St, Denver, CO 80205.")),
        dict(id="tamayo", src="local", name="Tamayo", osm=None, category="meal", minutes=75, busy=30, meal=True, dineIn=True, purchase=True, window=("11:00", "21:00"), worth=8, caution="Hours are not published; the window is an assumption. Call first.", show=dict(notes="10% off the total bill for veterans (Mile High on the Cheap, 10 Nov 2026). Larimer Square, 1400 Larimer St, Denver, CO 80202.")),
        dict(id="rendezvous-heather-gardens", src="local", name="The Rendezvous at Heather Gardens", osm=None, category="meal", minutes=75, busy=20, meal=True, dineIn=True, window=("17:00", "20:00"), purchase=True, caution="Reservations required (720-282-3443). It is inside a 55+ community; ask whether non-residents are welcome.", show=dict(notes="An $8 breakfast-for-dinner for veterans, 5-8 PM, reservations required (KOOL 105, 10 Nov 2026). Heather Gardens community center, 2888 S Heather Gardens Way, Aurora, CO 80014. Phone 720-282-3443.")),
        dict(id="legacy-ridge-golf", src="local", name="Westminster Golf: Legacy Ridge", osm=None, category="event", minutes=270, busy=0, meal=False, dineIn=False, window=("08:00", "15:00"), kinds=["outing"], worth=40, caution="A free round is reported by KOOL 105 only and is not on the City of Westminster's golf pages; hours are an assumption. Call the shop at 303-438-8997 first.", show=dict(notes="KOOL 105 (10 Nov 2026) reports one free round for veterans and active military with ID at Westminster's Legacy Ridge or Walnut Creek, cart extra. Legacy Ridge, 10801 Legacy Ridge Pkwy, Westminster, CO 80031.")),
        dict(id="melting-pot-littleton", src="local", name="The Melting Pot", osm=None, category="meal", minutes=90, busy=10, meal=True, dineIn=True, window=("11:00", "22:00"), purchase=True, caution="One free four-course meal for each extra regular-price one bought; a 3% service charge is added: call 303-794-5666 to book", show=dict(notes="The Melting Pot Littleton's own events page: one free four-course veteran meal for each additional regular-price four-course meal ordered, on 11 Nov 2026. Not combinable; tax, gratuity and a 3% heart-of-house service charge extra. 2707 W Main St, Littleton, CO 80120; usual Wednesday hours 11 AM-10 PM.")),
        dict(id="olivers-italian", src="local", name="Oliver's Italian", osm=None, category="meal", minutes=75, busy=30, meal=True, dineIn=True, window=("11:00", "21:00"), caution="Hours are its usual weekday hours, not a holiday notice: call first", show=dict(notes="Shucking Good Hospitality's free entree (up to $35) and a nonalcoholic drink for veterans, dine-in (Mile High on the Cheap and the Denver Gazette, 10 Nov 2026). 4950 S Yosemite St, Greenwood Village, CO 80111; usually 11 AM-9 PM on weekdays.")),
    ],
}


SERVICE_KIND = {"tommys-express": "car-wash", "jiffy-lube": "oil-change"}


def kinds_for(cur):
    """What kind of stop an offer is, for the Optimal route: `kinds` in CURATE, else from its category. Food that is
    a meal (breakfast, lunch or dinner, at a table or a counter) is "meal"; chips, fries and popcorn are "snack"."""
    if cur.get("ticket"):
        return []
    if cur.get("kinds") is not None:
        return list(cur["kinds"])
    c = cur["category"]
    if c in ("breakfast", "meal"):
        return ["meal"]
    if c == "quick":
        return ["snack"] if cur.get("eat") is not None and cur["eat"] < 0.4 else ["meal"]
    if c == "coffee":
        return ["coffee"]
    if c == "treat":
        return ["sweet"]
    if c == "bar":
        return ["bar", "meal"] if cur.get("meal") else ["bar"]
    if c == "service":
        return [cur.get("group") or SERVICE_KIND.get(cur["id"], cur["id"])]
    if c == "shopping":
        return ["shopping"]
    if c == "event":
        return ["ceremony", "meal"] if cur.get("meal") else ["ceremony"]
    raise ValueError(f"no kind for {cur['id']} ({c})")


def strip_fm(text):
    """A national note without its sentences about Fargo-Moorhead (the research was done for it first)."""
    parts = re.split(r"(?<=\.)\s+", text or "")
    return " ".join(x for x in parts if x.strip() and not re.search(r"\bFM\b|Fargo|Moorhead", x)).strip()


def curate_for(region):
    """The CURATE entries that apply in an area: the shared national ones (an `only` list limits one to some areas),
    with Fargo-Moorhead's own adjustments (`fm`) there, then the area's local entries."""
    out = []
    for cur in CURATE:
        if cur["src"] == "local" and region != DEFAULT_REGION:
            continue
        if cur.get("only") and region not in cur["only"]:
            continue
        cur = dict(cur)
        extra = cur.pop("fm", None)
        if extra and region == DEFAULT_REGION:
            cur.update(extra)
        away = cur.pop("elsewhere", None)
        if away and region != DEFAULT_REGION:
            cur["override"] = away
        # One area's own terms for a national chain (Colorado's Jiffy Lube franchisee, 11 Nov 2026): CURATE fields, and
        # `show` for the page's text.
        mine = (cur.pop("in_area", None) or {}).get(region)
        if mine:
            cur.update(mine)
        out.append(cur)
    return out + [dict(c) for c in LOCAL.get(region, [])]


def load(name, default, sub=""):
    p = os.path.join(RES, sub, name)
    return json.load(open(p, encoding="utf-8")) if os.path.exists(p) else default


def local_iso(hhmm, day_offset=0, base_start=DAY_START):
    h, m = (int(x) for x in hhmm.split(":"))
    t = base_start + timedelta(days=day_offset, hours=h, minutes=m)
    return t.strftime("%Y-%m-%dT%H:%M:%SZ")


_T = r"(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?"


def _hhmm(h, m, ap, default_ap=None):
    h, m = int(h), int(m or 0)
    ap = (ap or default_ap or "").lower()[:1]
    if ap == "p" and h < 12:
        h += 12
    if ap == "a" and h == 12:
        h = 0
    return f"{h:02d}:{m:02d}"


def parse_hours(s):
    """'11:00-14:00', '6 AM - 10 PM', '11am–10pm' -> ('11:00', '22:00'); '16:00-close' -> ('16:00', None);
    'Open 24 hours' -> ('00:00', '24:00'); anything else -> None."""
    if not s or not isinstance(s, str):
        return None
    if re.search(r"24\s*h", s, re.I):
        return ("00:00", "24:00")
    m = re.search(_T + r"\s*[-–—to]+\s*(?:" + _T + r"|(close|midnight))", s, re.I)
    if not m:
        return None
    a = _hhmm(m.group(1), m.group(2), m.group(3), m.group(6))
    if m.group(7):
        return (a, None) if m.group(7).lower() == "close" else (a, "24:00")
    b = _hhmm(m.group(4), m.group(5), m.group(6))
    if b == "00:00":
        b = "24:00"
    return (a, b)


def find_loc(locs, key):
    """The locations entry for a chain: exact name, else the same name ignoring case and punctuation, else the
    entry whose name starts with the same first word."""
    if not key:
        return None
    if key in locs:
        return locs[key]
    norm = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())
    for k, v in locs.items():
        if norm(k) == norm(key):
            return v
    first = norm(key.split()[0])
    for k, v in locs.items():
        if norm(k.split()[0]) == first:
            return v
    return None


def clean_source(s):
    """A source as the page shows it, or None. A blocked or missing URL keeps the citation as text only."""
    if not s or not (s.get("url") or s.get("publisher")):
        return None
    url = s.get("url")
    if url and any(h in url for h in BLOCKED_HOSTS):
        url = None
    return {"url": url, "publisher": s.get("publisher"), "published": s.get("published")}


def in_bbox(lat, lng):
    return BBOX[0] <= lat <= BBOX[2] and BBOX[1] <= lng <= BBOX[3]


def km(a_lat, a_lng, b_lat, b_lng):
    p = math.pi / 180
    s = (math.sin((b_lat - a_lat) * p / 2) ** 2 +
         math.cos(a_lat * p) * math.cos(b_lat * p) * math.sin((b_lng - a_lng) * p / 2) ** 2)
    return 12742 * math.asin(math.sqrt(s))


def in_region(reg, lat, lng):
    """Inside the area: Fargo-Moorhead's box, or any of an area's circles."""
    if reg.get("bbox"):
        b = reg["bbox"]
        return b[0] <= lat <= b[2] and b[1] <= lng <= b[3]
    return any(km(lat, lng, a[1], a[2]) <= a[3] for a in reg["areas"])


def slug(s):
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", s.lower())).strip("-")


def place_id(offer_id, address):
    a = re.sub(r",.*", "", address)  # street part
    return (offer_id + "-" + slug(a))[:80].strip("-")


def census_batch(rows):
    """rows: [(id, street, city, state, zip)] -> {id: (lat, lng)}"""
    if not rows:
        return {}
    buf = io.StringIO()
    csv.writer(buf).writerows(rows)
    b = uuid.uuid4().hex
    body = (f"--{b}\r\nContent-Disposition: form-data; name=\"benchmark\"\r\n\r\nPublic_AR_Current\r\n"
            f"--{b}\r\nContent-Disposition: form-data; name=\"addressFile\"; filename=\"a.csv\"\r\nContent-Type: text/csv\r\n\r\n"
            f"{buf.getvalue()}\r\n--{b}--\r\n").encode()
    req = urllib.request.Request("https://geocoding.geo.census.gov/geocoder/locations/addressbatch", data=body,
                                 headers={"Content-Type": f"multipart/form-data; boundary={b}", "User-Agent": UA})
    out = urllib.request.urlopen(req, timeout=300).read().decode("utf-8", "replace")
    res = {}
    for rec in csv.reader(io.StringIO(out)):
        if len(rec) > 5 and rec[2] == "Match" and rec[5]:
            lng, lat = map(float, rec[5].split(","))
            res[rec[0]] = (round(lat, 6), round(lng, 6))
    return res


def split_addr(a):
    a = re.sub(r"\s*\(.*?\)", "", a)
    m = re.match(r"(.+?),\s*([A-Za-z .]+),\s*(ND|MN|VA|MD|NV|CO)\s*(\d{5})?", a)
    if not m:
        return None
    street = re.sub(r"\s*(Suite|Ste|Unit|#)\s*[\w-]+", "", m.group(1), flags=re.I).strip()
    return street, m.group(2).strip(), m.group(3), m.group(4) or ""


def sun_times(lat, lng, date):
    """NOAA sunrise/sunset (UTC datetimes) for a date."""
    n = date.timetuple().tm_yday
    g = 2 * math.pi / 365 * (n - 1)
    eq = 229.18 * (0.000075 + 0.001868 * math.cos(g) - 0.032077 * math.sin(g) - 0.014615 * math.cos(2 * g) - 0.040849 * math.sin(2 * g))
    dec = 0.006918 - 0.399912 * math.cos(g) + 0.070257 * math.sin(g) - 0.006758 * math.cos(2 * g) + 0.000907 * math.sin(2 * g) - 0.002697 * math.cos(3 * g) + 0.00148 * math.sin(3 * g)
    phi = math.radians(lat)
    ha = math.degrees(math.acos(math.cos(math.radians(90.833)) / (math.cos(phi) * math.cos(dec)) - math.tan(phi) * math.tan(dec)))
    base = datetime(date.year, date.month, date.day, tzinfo=timezone.utc)
    rise = base + timedelta(minutes=720 - 4 * (lng + ha) - eq)
    sett = base + timedelta(minutes=720 - 4 * (lng - ha) - eq)
    return rise, sett


def main(region=DEFAULT_REGION):
    reg = REGIONS[region]
    reg_day_start = reg.get("day_start", DAY_START)
    reg_tz = reg.get("tz", "America/Chicago")
    reg_tz_offset = reg.get("tz_offset_min", TZ_OFFSET_MIN)
    reg_tz_abbr = reg.get("tz_abbr", "CST")
    sub = reg["research"]
    out_path = os.path.join(os.path.dirname(OUT), reg["out"], "deals.json")
    national = {r["brand"]: r for r in load("national-2026.json", [])}
    local = load("local-2026.json", [], sub)
    locs = load("locations-2026.json", {}, sub)
    osm = load("osm-matches.json", {}, sub)
    osm_by_id = {m["osm"]: m for ms in osm.values() for m in ms}

    offers, places, report = [], [], []
    to_geocode = []
    for cur in curate_for(region):
        if cur["src"] == "national":
            r = national.get(cur["name"])
        else:
            r = next((x for x in local if x.get("name", "").startswith(cur["name"])), None)
        if not r:
            report.append(f"skip {cur['id']}: not in research")
            continue
        status = r.get("status_2026")
        grade = r.get("grade") or "C"
        if cur["src"] == "local" or (status == "no_2026_info" and r.get("offer") and r.get("offer") != "None"):
            status_out = "offering"  # shown as "not confirmed: call first"
        else:
            status_out = status
        if status_out != "offering":
            report.append(f"skip {cur['id']}: status {status}")
            continue
        # stores
        stores = []
        L = find_loc(locs, cur.get("loc"))
        if L is not None:
            if L.get("presence", L.get("fm_presence")) == "no":
                report.append(f"skip {cur['id']}: no store in the area ({L.get('basis_url', '')})")
                continue
            for s in L.get("stores", []):
                if any(d in (s.get("address") or "") for d in cur.get("drop", [])):
                    report.append(f"  dropped: {cur['id']} {s.get('address')}")
                    continue
                if reg.get("on_post") and re.search(reg["on_post"], s.get("address") or ""):
                    report.append(f"  on post (installation access): {cur['id']} {s.get('address')}")
                    continue
                if s.get("status") == "closed":
                    report.append(f"  closed: {cur['id']} {s.get('address')}")
                    continue
                stores.append({"address": s.get("address", ""), "osm": s.get("osm"), "phone": s.get("phone") or "",
                               "wed_hours": s.get("wed_hours") or "", "verified": "confirmed" if s.get("status") == "confirmed" else "unverified",
                               "url": s.get("url") or "", "geo": s.get("geo")})
        elif cur["src"] == "local" and r.get("stores"):
            # A local business with more than one store (Sickies, Sandy's, Fryn' Pan).
            # A store from the business's own locator says so ("status": "confirmed"), so the page doesn't call its
            # address "from directories" (Silver Diner, Paisano's; 11 Nov 2026).
            for s in r["stores"]:
                stores.append({"address": s["address"], "osm": None, "phone": s.get("phone") or "", "wed_hours": s.get("wed_hours") or "",
                               "verified": "confirmed" if s.get("status") == "confirmed" else "unverified", "url": s.get("url") or "", "geo": s.get("geo")})
        elif cur["src"] == "local" and r.get("address") and r["address"] != "unknown":
            stores.append({"address": r["address"], "osm": None, "phone": r.get("phone") or "", "wed_hours": r.get("wednesday_hours") or "",
                           "verified": "unverified", "url": "", "geo": r.get("geo")})
        elif cur.get("osm") and osm.get(cur["osm"]):
            for m in osm[cur["osm"]]:
                # A bare house number ("5160") isn't an address anyone can use (10 Nov 2026).
                if m.get("addr") and " " in m["addr"].strip():
                    stores.append({"address": m["addr"], "osm": m["osm"], "phone": m.get("phone", ""), "wed_hours": "",
                                   "verified": "unverified", "url": "", "geo": None})
        # A big metro (Denver, 11 Nov 2026) lists hundreds of a chain's stores, and the engine checks every stop at every
        # step, so a chain with many stores keeps only stores `thin` km apart, nearest the circles' middles first: there
        # is still one a few minutes from anywhere in the area.
        thin = reg.get("thin")
        if thin and cur["src"] == "national" and len(stores) > thin[0]:
            gap = thin[2] if cur.get("purchase") and len(thin) > 2 else thin[1]  # a discount: further apart
            mids = [(a[1], a[2]) for a in reg["areas"]]
            def mid_km(s):
                la, ln = map(float, s["geo"].split(","))
                return min(km(la, ln, *m) for m in mids)
            kept = []
            for s in sorted(stores, key=lambda s: (not s.get("geo"), s["verified"] != "confirmed", mid_km(s) if s.get("geo") else 0)):
                if s.get("geo"):
                    la, ln = map(float, s["geo"].split(","))
                    if any(km(la, ln, *map(float, k["geo"].split(","))) < gap for k in kept if k.get("geo")):
                        continue
                kept.append(s)
            report.append(f"  thinned: {cur['id']} {len(stores)} -> {len(kept)} stores, {gap} km apart")
            stores = kept
        if not stores:
            report.append(f"skip {cur['id']}: no store found")
            continue

        value = cur.get("value", r.get("est_value_usd"))
        try:
            value = float(value)
        except (TypeError, ValueError):
            value = 0.0
        win = cur.get("window") or parse_hours(r.get("hours_local"))
        dates = str(r.get("dates") or "")
        # Offers on a range of days still count on 11 Nov; offers only on other days are dropped.
        if re.match(r"\d{4}-\d{2}-\d{2}$", dates) and dates != DAY and cur["src"] == "national" and grade != "C":
            report.append(f"skip {cur['id']}: dated {dates}")
            continue
        o = {
            "id": cur["id"], "brand": re.sub(r"\s*\(.*$", "", r.get("brand") or r.get("name")), "status": "offering",
            "category": cur["category"], "offer": (r.get("offer") or "").replace("Prior year: ", "Last year: ").strip(),
            # Local entries are C (earlier years only) unless the research grades them up, as the Air Museum's own
            # 2026 events list does for its program.
            "value": round(value), "grade": grade if cur["src"] == "national" else (grade if grade in ("A", "B") else "C"),
            "start": local_iso(win[0], 0, reg_day_start) if win else None, "end": local_iso(win[1], 0, reg_day_start) if win and win[1] else None,
            "window_text": "", "mode": r.get("mode") or ("event" if cur["category"] == "event" else None),
            "minutes": cur["minutes"], "busy": cur.get("busy", 0), "line": cur.get("line", 3),
            "meal": cur["meal"], "dineIn": cur["dineIn"],
            "snack": cur["category"] in ("quick", "treat") and (r.get("mode") or "") != "voucher",
            "eligible": r.get("eligible") or ["veteran", "active"], "guard_reserve": r.get("guard_reserve") or "unclear",
            "spouse": r.get("spouse_or_guest") or "unclear", "kids": r.get("kids"),
            "proof": [p for p in (r.get("proof") or []) if p != "idme_online"],
            "advance": r.get("advance_signup"), "participating": bool(r.get("participating_locations_only")),
            "voucher_use_by": r.get("voucher_use_by"), "limits": r.get("limits") or "",
            "sources": [clean_source(s) for s in (r.get("sources") or []) if clean_source(s)],
            "notes": r.get("notes") or "", "caution": cur.get("caution") or "", "group": cur.get("group"),
        }
        if cur.get("worth") is not None:
            o["worth"] = cur["worth"]
        if cur.get("arrive_by"):
            o["arrive_by"] = local_iso(cur["arrive_by"], 0, reg_day_start)  # a ceremony: the latest arrival (engine v1.3)
        if region != DEFAULT_REGION and cur["src"] == "national":
            o["notes"] = strip_fm(o["notes"])
        o.update(cur.get("override") or {})
        # The new areas' local entries: the page's note (and offer text) from CURATE; research notes stay in notes.md.
        if cur["src"] == "local" and region != DEFAULT_REGION:
            o["notes"] = ""
        o.update(cur.get("show") or {})
        # ticket: a card or voucher for later (quick, nothing eaten); purchase: you have to buy something to save;
        # eat: how much of a meal it is when eaten there (the engine guesses from meal/dineIn/snack otherwise).
        o["ticket"] = bool(cur.get("ticket"))
        o["purchase"] = bool(cur.get("purchase"))
        o["kinds"] = kinds_for(cur)
        if o["ticket"]:
            o["snack"] = False
        if cur.get("eat") is not None:
            o["eat"] = cur["eat"]
        if win:
            o["window_text"] = f"{win[0]}–{win[1] or 'close'} {reg_tz_abbr}" if win[1] else f"from {win[0]} {reg_tz_abbr}"
        if o["grade"] == "C" and not o["offer"].lower().startswith(("last year", "prior", "predicted", "reported", "every", "in 20")):
            o["offer"] = "Last year: " + o["offer"] if cur["src"] == "local" else o["offer"]
        offers.append(o)
        for s in stores:
            pid = place_id(o["id"], s["address"])
            if any(p["id"] == pid for p in places):
                continue
            lat = lng = None
            pin = None
            if s["osm"] and s["osm"] in osm_by_id:
                lat, lng, pin = osm_by_id[s["osm"]]["lat"], osm_by_id[s["osm"]]["lng"], "osm"
            elif re.fullmatch(r"-?\d+\.\d+,-?\d+\.\d+", s.get("geo") or ""):
                # Coordinates checked in the research (OSM or the Census geocoder), so an address the batch geocoder
                # could read two ways (635 32nd Ave E, West Fargo) lands in the right place. Older entries may hold a
                # note such as "no_census_match" here instead.
                lat, lng = (float(x) for x in s["geo"].split(","))
                pin = "geo"
            hrs = parse_hours(s["wed_hours"])
            assumed = hrs is None or hrs[1] is None
            if assumed:
                # The chain's usual hours when CURATE knows them (24-hour Kwik Trips), else the category's.
                hrs = cur.get("hours") or DEFAULT_HOURS[cur["category"]]
            close_day = 1 if hrs[1] in ("24:00",) or hrs[1] < hrs[0] else 0
            close = local_iso("00:00", 1, reg_day_start) if hrs[1] == "24:00" else local_iso(hrs[1], close_day, reg_day_start)
            p = {"id": pid, "offer": o["id"], "name": "", "address": s["address"], "lat": lat, "lng": lng,
                 "phone": s["phone"], "open": local_iso(hrs[0], 0, reg_day_start), "close": close, "hoursAssumed": assumed,
                 "verified": s["verified"], "pin": pin}
            places.append(p)
            if lat is None:
                sp = split_addr(s["address"])
                if sp:
                    to_geocode.append((pid,) + sp)

    got = census_batch(to_geocode)
    for p in places:
        if p["lat"] is None and p["id"] in got:
            p["lat"], p["lng"] = got[p["id"]]
            p["pin"] = "census"
    kept = []
    for p in places:
        if p["lat"] is None:
            report.append(f"  no pin: {p['id']} {p['address']}")
        elif not in_region(reg, p["lat"], p["lng"]):
            report.append(f"  outside the area: {p['id']} {p['address']}")
        else:
            kept.append(p)
    places = kept
    live = {p["offer"] for p in places}
    dropped = [o["id"] for o in offers if o["id"] not in live]
    offers = [o for o in offers if o["id"] in live]
    for d in dropped:
        report.append(f"skip {d}: no usable store")

    # forecast link and daylight
    forecast = None
    try:
        req = urllib.request.Request("https://api.weather.gov/points/%.4f,%.4f" % reg["nws"], headers={"User-Agent": UA, "Accept": "application/geo+json"})
        forecast = json.loads(urllib.request.urlopen(req, timeout=30).read())["properties"]["forecast"]
    except Exception as e:  # the app works without it
        report.append(f"  NWS points lookup failed: {e}")
    rise, sett = sun_times(reg["nws"][0], reg["nws"][1], datetime(2026, 11, 11).date())
    meta = {"built_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "day": DAY,
            "day_start": reg_day_start.strftime("%Y-%m-%dT%H:%M:%SZ"), "tz": reg_tz, "tz_offset_min": reg_tz_offset,
            "forecast_url": forecast, "sunrise": rise.strftime("%Y-%m-%dT%H:%M:%SZ"), "sunset": sett.strftime("%Y-%m-%dT%H:%M:%SZ"),
            # What the page says about the area, and where drive_matrix.py lays its grid (None: the stores' extent).
            "region": {"id": region, "name": reg["name"], "label": reg["label"], "center": list(reg["center"]),
                       "center_label": reg["center_label"], "zoom": reg["zoom"], "wx_name": reg["wx_name"],
                       "transit": reg["transit"], "areas": [list(a) for a in reg["areas"]] if reg["areas"] else None}}
    # Under Deals, off the route: other days and region-wide perks, and places with a deal in earlier years only.
    ex = load("extras-2026.json", {}, sub)
    other = []
    for e in ex.get("other", []):
        x = {k: e.get(k) for k in ("id", "day", "at", "name", "where", "offer", "grade", "note")}
        x["sources"] = [clean_source(s) for s in e.get("sources", []) if clean_source(s)]
        other.append(x)
    lead_src = {k: clean_source(v) for k, v in ex.get("lead_sources", {}).items()}
    leads = [{"name": l["name"], "area": l.get("area") or "", "q": l["q"], "offer": l["offer"], "last_seen": l["last_seen"],
              "source": lead_src.get(l["src"])} for l in ex.get("leads", [])]

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    json.dump({"meta": meta, "offers": offers, "places": places, "other": other, "leads": leads},
              open(out_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"== {region}: {os.path.relpath(out_path, ROOT)}")
    print(f"offers {len(offers)}  places {len(places)}  (pins: osm {sum(p['pin']=='osm' for p in places)}, census {sum(p['pin']=='census' for p in places)}, geo {sum(p['pin']=='geo' for p in places)})")
    print(f"other days and perks {len(other)}  earlier-year leads {len(leads)}")
    print(f"grades: " + ", ".join(f"{g} {sum(o['grade']==g for o in offers)}" for g in "ABC"))
    print("\n".join(report))


if __name__ == "__main__":
    want = sys.argv[1:] or ["all"]
    for r in (list(REGIONS) if want == ["all"] else want):
        if r not in REGIONS:
            raise SystemExit(f"unknown area {r!r}; one of: {', '.join(REGIONS)}")
        main(r)
