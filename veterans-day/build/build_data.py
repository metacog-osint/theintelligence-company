"""Build site/veterans/veterans-day/data/deals.json from the research files.

Usage (from the repo root):  python -I veterans-day/build/build_data.py
Inputs (veterans-day/research/): national-2026.json, local-2026.json, locations-2026.json, osm-matches.json
Network: the US Census geocoder for store addresses without an OpenStreetMap pin, and the NWS points API for the
forecast link. Everything about each offer is decided in CURATE below, in one place, so a reviewer can see why a
deal is in, how long a stop takes and what window it has.

Place ids come from the offer and the street address, so they stay the same from one build to the next: field
reports on the day refer to them.
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
    dict(id="ruby-tuesday", src="national", name="Ruby Tuesday", loc="Ruby Tuesday", osm=None, category="meal", minutes=50, busy=10, meal=True, dineIn=True, caution="Store not confirmed open: call first"),
    dict(id="dave-busters", src="national", name="Dave & Buster's", loc="Dave & Buster's", osm=None, category="meal", minutes=60, busy=10, meal=False, dineIn=True),
    dict(id="granite-city", src="national", name="Granite City Food & Brewery", loc="Granite City Food & Brewery", osm="granitecity", category="meal", minutes=50, busy=15, meal=True, dineIn=True, window=("11:00", "16:00"), caution="Store and 2026 offer not confirmed: call first"),
    dict(id="pizza-ranch", src="national", name="Pizza Ranch", loc="Pizza Ranch", osm="pizzaranch", category="meal", minutes=45, busy=15, meal=True, dineIn=True),
    # Breakfast
    dict(id="dennys", src="national", name="Denny's", loc="Denny's", osm="dennys", category="breakfast", minutes=45, busy=15, meal=True, dineIn=True),
    # IHOP: 7 AM-7 PM per the American Legion's 2026 list (5 Nov); ihop.com wasn't readable.
    dict(id="ihop", src="national", name="IHOP", loc="IHOP", osm="ihop", category="breakfast", minutes=45, busy=15, meal=True, dineIn=True, window=("07:00", "19:00")),
    dict(id="perkins", src="national", name="Perkins", loc="Perkins", osm="perkins", category="breakfast", minutes=45, busy=10, meal=True, dineIn=True),
    dict(id="village-inn", src="national", name="Village Inn", loc="Village Inn", osm=None, category="breakfast", minutes=45, busy=10, meal=True, dineIn=True, caution=ONE_REPORT),
    # Quick bites and pickups
    # ticket=True: a card or voucher for a later visit. A quick stop with nothing eaten there (8 Nov 2026).
    dict(id="texas-roadhouse", src="national", name="Texas Roadhouse", loc="Texas Roadhouse", osm="texasroadhouse", category="quick", minutes=8, busy=25, line=15, meal=False, dineIn=False, ticket=True),
    dict(id="wendys", src="national", name="Wendy's", loc="Wendy's", osm="wendys", category="quick", minutes=12, busy=10, meal=False, dineIn=False),
    dict(id="little-caesars", src="national", name="Little Caesars", loc="Little Caesars", osm="littlecaesars", category="quick", minutes=8, busy=10, meal=False, dineIn=False),
    dict(id="firehouse-subs", src="national", name="Firehouse Subs", loc="Firehouse Subs", osm="firehouse", category="quick", minutes=15, busy=10, meal=False, dineIn=False, purchase=True, eat=0.5),
    # Smashburger: the Fargo store (1801 45th St SW) closed in October 2026 (8 Nov 2026); no other FM store.
    dict(id="chipotle", src="national", name="Chipotle", loc="Chipotle", osm="chipotle", category="quick", minutes=15, busy=10, meal=False, dineIn=True, purchase=True, eat=0.2),
    dict(id="qdoba", src="national", name="Qdoba", loc="Qdoba", osm="qdoba", category="quick", minutes=12, busy=5, meal=False, dineIn=True, eat=0.2),
    # Charleys: inside the Petro truck stop at 45th St S and 19th Ave S, next to Popeyes (8 Nov 2026).
    dict(id="charleys", src="national", name="Charleys Cheesesteaks", loc="Charleys Cheesesteaks", osm="charleys", category="quick", minutes=8, busy=5, meal=False, dineIn=False, eat=0.2, caution="Inside the Petro truck stop, next to Popeyes; participating stores only"),
    # Hardee's: remembered: a free breakfast sandwich in 2025 (8 Nov 2026); nothing published. Breakfast hours.
    dict(id="hardees", src="national", name="Hardee's", loc="Hardee's", osm=None, category="quick", minutes=8, busy=5, meal=False, dineIn=False, window=("06:00", "10:30"), hours=("06:00", "22:00")),
    dict(id="kwik-trip", src="national", name="Kwik Trip", loc="Kwik Trip", caution="Fargo stores are called Kwik Star", osm="kwiktrip", category="quick", minutes=7, busy=5, meal=False, dineIn=False, hours=("00:00", "24:00")),
    dict(id="pilot", src="national", name="Pilot / Flying J", loc="Pilot / Flying J", osm="pilot", category="quick", minutes=8, busy=5, meal=False, dineIn=False),
    dict(id="mission-bbq", src="national", name="Mission BBQ", loc="Mission BBQ", osm=None, category="quick", minutes=20, busy=10, meal=False, dineIn=True),
    dict(id="shake-shack", src="national", name="Shake Shack", loc="Shake Shack", osm=None, category="quick", minutes=20, busy=10, meal=False, dineIn=True),
    dict(id="fazolis", src="national", name="Fazoli's", loc="Fazoli's", osm="fazolis", category="quick", minutes=20, busy=5, meal=False, dineIn=False),
    dict(id="blaze-pizza", src="national", name="Blaze Pizza", loc="Blaze Pizza", osm=None, category="quick", minutes=20, busy=10, meal=False, dineIn=True),
    # Coffee
    dict(id="starbucks", src="national", name="Starbucks", loc="Starbucks", osm="starbucks", category="coffee", minutes=8, busy=5, meal=False, dineIn=False),
    dict(id="scooters", src="national", name="Scooter's Coffee", loc="Scooter's Coffee", osm="scooters", category="coffee", minutes=6, busy=5, meal=False, dineIn=False, drop=["1350 21st Ave N"], caution="New store; opening not confirmed: call first"),
    dict(id="caribou", src="national", name="Caribou Coffee", loc="Caribou Coffee", osm="caribou", category="coffee", minutes=8, busy=5, meal=False, dineIn=False),
    dict(id="caseys", src="national", name="Casey's", loc="Casey's", osm="caseys", category="coffee", minutes=6, busy=3, meal=False, dineIn=False, hours=("05:00", "22:00")),
    dict(id="circle-k", src="national", name="Circle K", loc="Circle K / Holiday", osm="holiday", category="coffee", minutes=6, busy=3, meal=False, dineIn=False, hours=("05:00", "23:00")),
    dict(id="dunkin", src="national", name="Dunkin'", loc="Dunkin'", osm="dunkin", category="coffee", minutes=6, busy=5, meal=False, dineIn=False),
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
    dict(id="marcus", src="national", name="Marcus Theatres", loc="Marcus Theatres", osm=None, category="treat", minutes=10, busy=10, line=5, meal=False, dineIn=False, eat=0.3, hours=("12:00", "21:30")),
    # Services. Great Clips is planned as picking up the free-haircut card (no group: it doesn't use up the day's haircut).
    dict(id="great-clips", src="national", name="Great Clips", loc="Great Clips", osm="greatclips", category="service", minutes=5, busy=5, line=3, meal=False, dineIn=False, ticket=True),
    dict(id="sport-clips", group="haircut", src="national", name="Sport Clips", loc="Sport Clips", osm="sportclips", category="service", minutes=30, busy=20, meal=False, dineIn=False, caution="Participating shops only, and this address isn't confirmed: call first"),
    dict(id="tommys-express", src="national", name="Tommy's Express Car Wash", loc="Tommy's Express Car Wash", osm="tommys", category="service", minutes=12, busy=10, meal=False, dineIn=False),
    dict(id="jiffy-lube", src="national", name="Jiffy Lube", loc="Jiffy Lube", osm="jiffylube", category="service", minutes=30, busy=15, meal=False, dineIn=False, value=20, purchase=True, caution="Only some franchise shops take part: call first"),
    # Shopping (no dollar value: what you save depends on what you buy, so they're listed, not routed, unless pinned)
    dict(id="target", src="national", name="Target", loc="Target", osm="target", category="shopping", minutes=25, busy=5, meal=False, dineIn=False, value=0, purchase=True),
    dict(id="kohls", src="national", name="Kohl's", loc="Kohl's", osm="kohls", category="shopping", minutes=25, busy=5, meal=False, dineIn=False, value=0, purchase=True),
    dict(id="walgreens", src="national", name="Walgreens", loc="Walgreens", osm=None, category="shopping", minutes=15, busy=5, meal=False, dineIn=False, value=0, purchase=True),
    # Local: grade C (earlier years, "call first") unless the research grades them up from the business's own 2026
    # word (Fryn' Pan, Doolittle's and Porter Creek from a phone check; the Air Museum's calendar; Cash Wise's page).
    dict(id="fryn-pan", src="local", name="Fryn' Pan Family Restaurant (M", osm="frynpan", category="meal", minutes=45, busy=15, meal=True, dineIn=True, window=("08:00", "20:00")),
    dict(id="doolittles", src="local", name="Doolittle's Woodfire Grill (Fa", osm="doolittles", category="meal", minutes=55, busy=15, meal=True, dineIn=True),
    dict(id="porter-creek", src="local", name="Porter Creek Hardwood Grill (F", osm="portercreek", category="meal", minutes=55, busy=15, meal=True, dineIn=True),
    dict(id="fargo-air-museum", src="local", name="Veterans Day Program, United P", osm="airmuseum", category="event", minutes=60, busy=0, meal=False, dineIn=False, window=("11:00", "12:00"), arriveEarly=True, worth=12),
    dict(id="fargo-vfw-legion", src="local", name="Fargo VFW and American Legion", osm=None, category="event", minutes=40, busy=10, meal=True, dineIn=True, window=("11:45", "14:00")),
    dict(id="amvets-post-7", src="local", name="Fargo AMVETS Post 7 Veterans D", osm=None, category="event", minutes=40, busy=10, meal=True, dineIn=True, window=("12:00", "14:00")),
    dict(id="moorhead-legion", src="local", name="Moorhead American Legion Veter", osm=None, category="event", minutes=45, busy=10, meal=True, dineIn=True, window=("12:00", "18:30")),
    dict(id="west-fargo-vfw", src="local", name="West Fargo VFW Post 7564 Veter", osm=None, category="event", minutes=45, busy=5, meal=True, dineIn=True, window=("10:30", "14:00"), arriveEarly=True, worth=12),
    # Added 8 Nov 2026 from the consolidated report: local offers that only one 2026 listing carries (grade C, call
    # first), the Air Museum's coffee hour and the Harwood Legion's stew.
    dict(id="air-museum-coffee", src="local", name="Fargo Air Museum Veterans Coffee", osm=None, category="event", minutes=30, busy=5, meal=False, dineIn=True, window=("10:00", "12:00"), eat=0.2),
    dict(id="harwood-legion", src="local", name="Harwood American Legion Post 297", osm=None, category="event", minutes=40, busy=5, meal=True, dineIn=True, window=("17:00", "19:00")),
    dict(id="sickies", src="local", name="Sickies Garage Burgers & Brews (Fa", osm=None, category="meal", minutes=50, busy=15, meal=True, dineIn=True, caution=ONE_REPORT),
    dict(id="brewtus", src="local", name="Brewtus' Brickhouse", osm=None, category="meal", minutes=45, busy=10, meal=True, dineIn=True, window=("11:00", "14:00"), caution=ONE_REPORT),
    dict(id="pub-west", src="local", name="Pub West", osm=None, category="meal", minutes=50, busy=10, meal=True, dineIn=True, purchase=True, caution="Offer and address not confirmed: call first"),
    # Cash Wise: its own page (8 Nov 2026) gives the dinner but no store list, so all four metro stores, "call yours".
    dict(id="cash-wise-deli", src="local", name="Cash Wise Foods deli", osm=None, category="quick", minutes=12, busy=5, meal=False, dineIn=False, eat=0.6, window=("11:00", "19:00"), caution="Cash Wise's page lists no stores: call yours first"),
    # Royal Buffet: free buffet 9-11 Nov on Fargo Legion Post 2's 30 Oct 2026 list (the same offer as 2023).
    dict(id="royal-buffet", src="local", name="Royal Buffet", osm=None, category="meal", minutes=50, busy=15, meal=True, dineIn=True, caution=ONE_REPORT),
    dict(id="sandys-donuts", src="local", name="Sandy's Donuts", osm=None, category="treat", minutes=6, busy=5, meal=False, dineIn=False, window=("06:00", "13:30"), caution=ONE_REPORT),
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


def load(name, default):
    p = os.path.join(RES, name)
    return json.load(open(p, encoding="utf-8")) if os.path.exists(p) else default


def local_iso(hhmm, day_offset=0):
    h, m = (int(x) for x in hhmm.split(":"))
    t = DAY_START + timedelta(days=day_offset, hours=h, minutes=m)
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
    m = re.match(r"(.+?),\s*([A-Za-z .]+),\s*(ND|MN)\s*(\d{5})?", a)
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


def main():
    national = {r["brand"]: r for r in load("national-2026.json", [])}
    local = load("local-2026.json", [])
    locs = load("locations-2026.json", {})
    osm = load("osm-matches.json", {})
    osm_by_id = {m["osm"]: m for ms in osm.values() for m in ms}

    offers, places, report = [], [], []
    to_geocode = []
    for cur in CURATE:
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
            if L.get("fm_presence") == "no":
                report.append(f"skip {cur['id']}: no FM store ({L.get('basis_url', '')})")
                continue
            for s in L.get("stores", []):
                if any(d in (s.get("address") or "") for d in cur.get("drop", [])):
                    report.append(f"  dropped: {cur['id']} {s.get('address')}")
                    continue
                if s.get("status") == "closed":
                    report.append(f"  closed: {cur['id']} {s.get('address')}")
                    continue
                stores.append({"address": s.get("address", ""), "osm": s.get("osm"), "phone": s.get("phone") or "",
                               "wed_hours": s.get("wed_hours") or "", "verified": "confirmed" if s.get("status") == "confirmed" else "unverified",
                               "url": s.get("url") or "", "geo": s.get("geo")})
        elif cur["src"] == "local" and r.get("stores"):
            # A local business with more than one store (Sickies, Sandy's, Fryn' Pan).
            for s in r["stores"]:
                stores.append({"address": s["address"], "osm": None, "phone": s.get("phone") or "", "wed_hours": s.get("wed_hours") or "",
                               "verified": "unverified", "url": "", "geo": s.get("geo")})
        elif cur["src"] == "local" and r.get("address") and r["address"] != "unknown":
            stores.append({"address": r["address"], "osm": None, "phone": r.get("phone") or "", "wed_hours": r.get("wednesday_hours") or "",
                           "verified": "unverified", "url": "", "geo": r.get("geo")})
        elif cur.get("osm") and osm.get(cur["osm"]):
            for m in osm[cur["osm"]]:
                if m.get("addr"):
                    stores.append({"address": m["addr"], "osm": m["osm"], "phone": m.get("phone", ""), "wed_hours": "",
                                   "verified": "unverified", "url": "", "geo": None})
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
            "start": local_iso(win[0]) if win else None, "end": local_iso(win[1]) if win and win[1] else None,
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
        # ticket: a card or voucher for later (quick, nothing eaten); purchase: you have to buy something to save;
        # eat: how much of a meal it is when eaten there (the engine guesses from meal/dineIn/snack otherwise).
        o["ticket"] = bool(cur.get("ticket"))
        o["purchase"] = bool(cur.get("purchase"))
        if o["ticket"]:
            o["snack"] = False
        if cur.get("eat") is not None:
            o["eat"] = cur["eat"]
        if win:
            o["window_text"] = f"{win[0]}–{win[1] or 'close'} CST" if win[1] else f"from {win[0]} CST"
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
            close = local_iso("00:00", 1) if hrs[1] == "24:00" else local_iso(hrs[1], close_day)
            p = {"id": pid, "offer": o["id"], "name": "", "address": s["address"], "lat": lat, "lng": lng,
                 "phone": s["phone"], "open": local_iso(hrs[0]), "close": close, "hoursAssumed": assumed,
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
        elif not in_bbox(p["lat"], p["lng"]):
            report.append(f"  outside metro: {p['id']} {p['address']}")
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
        req = urllib.request.Request("https://api.weather.gov/points/46.8772,-96.7898", headers={"User-Agent": UA, "Accept": "application/geo+json"})
        forecast = json.loads(urllib.request.urlopen(req, timeout=30).read())["properties"]["forecast"]
    except Exception as e:  # the app works without it
        report.append(f"  NWS points lookup failed: {e}")
    rise, sett = sun_times(46.8772, -96.7898, datetime(2026, 11, 11).date())
    meta = {"built_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "day": DAY,
            "day_start": DAY_START.strftime("%Y-%m-%dT%H:%M:%SZ"), "tz": "America/Chicago", "tz_offset_min": TZ_OFFSET_MIN,
            "forecast_url": forecast, "sunrise": rise.strftime("%Y-%m-%dT%H:%M:%SZ"), "sunset": sett.strftime("%Y-%m-%dT%H:%M:%SZ")}
    # Under Deals, off the route: other days and region-wide perks, and places with a deal in earlier years only.
    ex = load("extras-2026.json", {})
    other = []
    for e in ex.get("other", []):
        x = {k: e.get(k) for k in ("id", "day", "at", "name", "where", "offer", "grade", "note")}
        x["sources"] = [clean_source(s) for s in e.get("sources", []) if clean_source(s)]
        other.append(x)
    lead_src = {k: clean_source(v) for k, v in ex.get("lead_sources", {}).items()}
    leads = [{"name": l["name"], "area": l.get("area") or "", "q": l["q"], "offer": l["offer"], "last_seen": l["last_seen"],
              "source": lead_src.get(l["src"])} for l in ex.get("leads", [])]

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump({"meta": meta, "offers": offers, "places": places, "other": other, "leads": leads},
              open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"offers {len(offers)}  places {len(places)}  (pins: osm {sum(p['pin']=='osm' for p in places)}, census {sum(p['pin']=='census' for p in places)}, geo {sum(p['pin']=='geo' for p in places)})")
    print(f"other days and perks {len(other)}  earlier-year leads {len(leads)}")
    print(f"grades: " + ", ".join(f"{g} {sum(o['grade']==g for o in offers)}" for g in "ABC"))
    print("\n".join(report))


if __name__ == "__main__":
    main()
