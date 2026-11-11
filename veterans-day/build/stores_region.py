"""Find every chain store in an area and write veterans-day/research/<area>/locations-2026.json.

Usage (from the repo root):  python -I veterans-day/build/stores_region.py <area id> <cache folder>
  e.g. python -I veterans-day/build/stores_region.py twin-cities "%TEMP%\\vd-atp"

Built 9 Nov 2026 for the area picker (Bismarck-Mandan and New Salem; Plymouth, Maple Grove and Roseville). Fargo-Moorhead's
stores were checked by hand on 8 Nov and aren't rebuilt here.

Sources, in order:
1. All the Places (alltheplaces.xyz): weekly scrapes of each chain's own store locator, with address, phone and
   opening hours. A store found there is "confirmed" (it is on the chain's own list). The run is the latest one
   (31 Oct-7 Nov 2026) unless that run's spider for the chain failed; then the newest earlier run that worked.
   Downloads go to the cache folder you give (untrusted data, kept out of the repo) and are reused.
   A store listed without coordinates (Hy-Vee's whole list) is placed by the US Census geocoder when it is in the
   area's state.
2. OpenStreetMap (Overpass API): a place within 200 m of a store from step 1 is the same store. Any other is added as
   "unverified" (the page says the address is from directories, not the chain's own site), but only where the chain's
   own list doesn't cover the area: it has none of its stores inside the area, or it is known to be partial (PARTIAL:
   Wendy's list has no Twin Cities store, Little Caesars' none in North Dakota), and for Holiday stations. Where the
   chain's list does cover the area, a store only OpenStreetMap has is most likely closed (Red Lobster in Golden
   Valley), so it is left out and logged.
Every CURATE chain gets an entry, with presence "no" when nothing is in the area, so build_data.py never falls back
to a different chain's stores.
"""
import json, math, os, re, sys, time, urllib.parse, urllib.request

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_data as B  # noqa: E402  (REGIONS, CURATE, UA, ROOT)

ATP = "https://alltheplaces-data.openaddresses.io/runs/{run}/output/{spider}.geojson"
LATEST = "2026-10-31-13-32-34"
# CURATE `loc` name -> (All the Places spider, run). Runs other than LATEST: that week's spider returned nothing.
SPIDERS = {
    "Applebee's": ("applebees", LATEST), "Chili's": ("chilis", LATEST), "Twin Peaks": ("twin_peaks", LATEST),
    "Buffalo Wild Wings": ("buffalo_wild_wings_us", LATEST), "Famous Dave's": ("famous_daves_us", LATEST),
    "Hooters": ("hooters", LATEST), "Buca di Beppo": ("buca_di_beppo_us", LATEST), "Bob Evans": ("bob_evans_us", LATEST),
    "Ruby Tuesday": ("ruby_tuesday_us", LATEST), "Dave & Buster's": ("dave_and_busters", LATEST),
    "Pizza Ranch": ("pizza_ranch_us", LATEST), "Denny's": ("dennys_us", LATEST), "IHOP": ("ihop", LATEST),
    "Perkins": ("perkins_us", LATEST), "Village Inn": ("village_inn_us", LATEST),
    "Texas Roadhouse": ("texas_roadhouse", LATEST), "Wendy's": ("wendys", LATEST),
    "Little Caesars": ("little_caesars_us", LATEST), "Firehouse Subs": ("firehouse_subs", LATEST),
    "Chipotle": ("chipotle", LATEST), "Qdoba": ("qdoba", LATEST), "Hardee's": ("hardees_us", LATEST),
    "Kwik Trip": ("kwik_trip", LATEST), "Fazoli's": ("fazolis_us", LATEST), "Starbucks": ("starbucks_us", LATEST),
    "Scooter's Coffee": ("scooters_coffee_us", LATEST), "Caribou Coffee": ("caribou_coffee_us", LATEST),
    "Circle K / Holiday": ("circle_k", LATEST), "Dunkin'": ("dunkin_us", LATEST), "Biggby Coffee": ("biggby_coffee_us", LATEST),
    "7 Brew": ("7_brew_us", LATEST), "Krispy Kreme": ("krispy_kreme_us", LATEST), "Menchie's": ("menchies", LATEST),
    "Insomnia Cookies": ("insomnia_cookies", LATEST), "Freddy's Frozen Custard & Steakburgers": ("freddys_us", LATEST),
    "Sonic": ("sonic_drivein_us", LATEST), "Great Clips": ("great_clips", LATEST), "Sport Clips": ("sport_clips_us", LATEST),
    "Jiffy Lube": ("jiffy_lube_us", LATEST), "Target": ("target_us", LATEST), "Kohl's": ("kohls_us", LATEST),
    "Walgreens": ("walgreens", LATEST), "Hy-Vee": ("hy_vee_us", LATEST), "Outback Steakhouse": ("outback_steakhouse", LATEST),
    "Golden Corral": ("golden_corral", LATEST), "Smashburger": ("smashburger", LATEST),
    "Blaze Pizza": ("blaze_pizza", "2026-10-24-13-32-37"),
    "Red Lobster": ("red_lobster_us", "2026-10-17-13-32-31"), "Charleys Cheesesteaks": ("charleys_philly_steaks", "2026-10-17-13-32-31"),
    "Shake Shack": ("shake_shack", "2026-10-17-13-32-31"), "Red Robin": ("red_robin", "2026-10-17-13-32-31"),
    "Pilot / Flying J": ("pilot_flying_j", "2026-10-10-13-32-41"),
    "Chick-fil-A": ("chick_fil_a", LATEST), "Sheetz": ("sheetz", LATEST), "Wawa": ("wawa", LATEST),
    "California Pizza Kitchen": ("california_pizza_kitchen", LATEST), "Bonefish Grill": ("bonefish_grill", LATEST),
    "Carrabba's Italian Grill": ("carrabbas_italian_grill", LATEST), "Fogo de Chão": ("fogo_de_chao", LATEST),
    "In-N-Out Burger": ("innout", LATEST),
}
# No All the Places spider for Bar Louie (run 2026-10-31 checked 11 Nov 2026): OpenStreetMap only. Carrabba's spider is
# carrabbas_italian_grill, not carrabbas; krispy_kreme_us was right (its 10 Nov download failed once).
# Every chain's OpenStreetMap name or brand, as a regex (POSIX-safe: Overpass runs the combined one too).
OSM = {
    "Applebee's": r"^Applebee'?s", "Chili's": r"^Chili'?s( Grill.*)?$", "Twin Peaks": r"^Twin Peaks",
    "Buffalo Wild Wings": r"^Buffalo Wild Wings", "Famous Dave's": r"^Famous Dave", "Hooters": r"^Hooters",
    "Buca di Beppo": r"^Buca di Beppo", "Bob Evans": r"^Bob Evans", "Ruby Tuesday": r"^Ruby Tuesday",
    "Dave & Buster's": r"^Dave (&|and) Buster", "Pizza Ranch": r"^Pizza Ranch", "Denny's": r"^Denny'?s",
    "IHOP": r"^IHOP", "Perkins": r"^Perkins( Restaurant.*)?$", "Village Inn": r"^Village Inn",
    "Texas Roadhouse": r"^Texas Roadhouse", "Wendy's": r"^Wendy'?s", "Little Caesars": r"^Little Caesar",
    "Firehouse Subs": r"^Firehouse Subs", "Chipotle": r"^Chipotle", "Qdoba": r"^Qdoba", "Hardee's": r"^Hardee'?s",
    "Kwik Trip": r"^Kwik (Trip|Star)", "Fazoli's": r"^Fazoli", "Starbucks": r"^Starbucks",
    "Scooter's Coffee": r"^Scooter'?s Coffee", "Caribou Coffee": r"^Caribou Coffee",
    "Circle K / Holiday": r"^(Circle K|Holiday)( Station(store)?s?)?$", "Dunkin'": r"^Dunkin", "Biggby Coffee": r"^Biggby",
    "7 Brew": r"^7 Brew", "Krispy Kreme": r"^Krispy Kreme", "Menchie's": r"^Menchie", "Insomnia Cookies": r"^Insomnia Cookies",
    "Freddy's Frozen Custard & Steakburgers": r"^Freddy'?s", "Sonic": r"^Sonic( Drive-?In)?$", "Great Clips": r"^Great Clips",
    "Sport Clips": r"^Sport Clips", "Jiffy Lube": r"^Jiffy Lube", "Target": r"^Target$",
    "Kohl's": r"^Kohl'?s$", "Walgreens": r"^Walgreens", "Hy-Vee": r"^Hy-?Vee$", "Outback Steakhouse": r"^Outback Steakhouse",
    "Golden Corral": r"^Golden Corral", "Smashburger": r"^Smashburger", "Blaze Pizza": r"^Blaze Pizza",
    "Red Lobster": r"^Red Lobster", "Charleys Cheesesteaks": r"^Charleys", "Shake Shack": r"^Shake Shack",
    "Red Robin": r"^Red Robin", "Pilot / Flying J": r"^(Pilot|Flying J)( Travel Cent(er|re))?$",
    "Olive Garden": r"^Olive Garden", "Cracker Barrel": r"^Cracker Barrel", "Marcus Theatres": r"^Marcus ",
    "Casey's": r"^Casey'?s( General Store)?$", "Tommy's Express Car Wash": r"^Tommy'?s Express", "Mission BBQ": r"^Mission BBQ",
    "Granite City Food & Brewery": r"^Granite City",
    "Chick-fil-A": r"^Chick-fil-A", "Sheetz": r"^Sheetz", "Wawa": r"^Wawa",
    "California Pizza Kitchen": r"^California Pizza Kitchen", "Bonefish Grill": r"^Bonefish Grill",
    "Carrabba's Italian Grill": r"^Carrabba'?s", "Fogo de Chão": r"^Fogo de Ch", "Bar Louie": r"^Bar Louie",
    "In-N-Out Burger": r"^In-N-Out",
}
FUEL_OK = {"Circle K / Holiday", "Casey's", "Kwik Trip", "Pilot / Flying J", "Sheetz", "Wawa"}
# All the Places lists known to miss whole regions (checked 10 Nov 2026): OpenStreetMap fills them in.
PARTIAL = {"Wendy's", "Little Caesars"}
# Within a spider, features that aren't the store the offer is for.
SKIP = {
    # Licensed Starbucks counters (inside Target, grocery stores, hotels, hospitals) run their own promotions.
    "Starbucks": lambda p: bool(p.get("located_in")) or bool(re.search(r"\b(target|cub|lunds|byerly|hy-?vee|harris ?teeter|safeway|giant|wegmans|hospital|hotel|marriott|hilton|hyatt|sheraton|westin|barnes|airport|university|college)\b", (p.get("name") or "") + " " + (p.get("branch") or ""), re.I)),
    # Campus counters (George Mason's student union) aren't on Chick-fil-A Metro DC's participating list, 10 Nov 2026.
    "Chick-fil-A": lambda p: bool(re.search(r"universit|college|campus|\bSUB\b|airport|hospital", (p.get("name") or "") + " " + (p.get("branch") or ""), re.I)),
    # Hy-Vee's spider also lists its gas stations, liquor and convenience stores: only the supermarkets serve breakfast.
    "Hy-Vee": lambda p: p.get("shop") not in (None, "supermarket") or bool(re.search(r"fast ?& ?fresh|wine|spirits|gas|dollar|health ?market|mainstreet|drugtown", (p.get("name") or "") + " " + (p.get("branch") or ""), re.I)),
    "Target": lambda p: p.get("shop") not in (None, "department_store", "supermarket", "variety_store"),
}
DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]


def get(url, timeout=120, data=None):
    req = urllib.request.Request(url, data=data, headers={"User-Agent": B.UA})
    for attempt in range(4):
        try:
            return urllib.request.urlopen(req, timeout=timeout).read()
        except Exception as e:
            print("  retry", attempt + 1, url[:90], e, flush=True)
            time.sleep(4 * (attempt + 1))
    raise SystemExit(f"couldn't fetch {url}")


def atp_features(cache, spider, run):
    folder = os.path.join(cache, run)
    os.makedirs(folder, exist_ok=True)
    f = os.path.join(folder, spider + ".geojson")
    if not os.path.exists(f) or os.path.getsize(f) == 0:
        print(f"  download {run}/{spider}", flush=True)
        try:
            body = get(ATP.format(run=run, spider=spider), timeout=300)
            open(f, "wb").write(body)
        except (Exception, SystemExit) as e:  # get() raises SystemExit after its retries; Ctrl-C still stops the run
            # None, not []: main() records a failed download in the basis instead of "0 in the area".
            print(f"  WARNING: All the Places download failed for {spider} ({e}); OpenStreetMap only", flush=True)
            return None
    return json.load(open(f, encoding="utf-8")).get("features", [])


def wed_hours(oh):
    """The Wednesday hours from an OpenStreetMap opening_hours value, as 'HH:MM-HH:MM', or '' when unclear."""
    if not oh or not isinstance(oh, str):
        return ""
    oh = oh.strip()
    if oh == "24/7":
        return "00:00-24:00"
    out = ""
    for rule in oh.split(";"):
        rule = rule.strip()
        m = re.match(r"^((?:(?:Mo|Tu|We|Th|Fr|Sa|Su)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?,?)+)\s+(.+)$", rule)
        if not m:
            continue
        days = set()
        for part in m.group(1).strip(",").split(","):
            a, _, b = part.partition("-")
            ia, ib = DAYS.index(a), DAYS.index(b or a)
            rng = range(ia, ib + 1) if ia <= ib else list(range(ia, 7)) + list(range(0, ib + 1))
            days.update(DAYS[i] for i in rng)
        if "We" not in days:
            continue
        times = m.group(2).strip()
        if times in ("off", "closed"):
            out = "closed"
            continue
        spans = re.findall(r"(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})", times)
        if spans:
            spans = [(a.zfill(5), b.zfill(5)) for a, b in spans]
            if len(spans) > 1 and spans[0][0] == "00:00" and spans[-1][1] in ("24:00", "00:00"):
                # "00:00-01:00,09:00-24:00": the small hours belong to the night before; open 09:00 to 01:00.
                out = f"{spans[1][0]}-{spans[0][1]}"
            else:
                out = f"{spans[0][0]}-{spans[-1][1]}"
    return "" if out == "closed" else out


def located(features, states):
    """(lat, lng, properties) for each feature: its point, or the Census geocoder's for an address in `states`."""
    out, todo = [], []
    for i, f in enumerate(features):
        p = f.get("properties") or {}
        g = f.get("geometry") or {}
        if g.get("type") == "Point":
            out.append((g["coordinates"][1], g["coordinates"][0], p))
        elif (p.get("addr:state") or "").upper()[:2] in states or (p.get("addr:state") or "") in ("North Dakota", "Minnesota", "Virginia", "Nevada", "Maryland"):
            street = p.get("addr:street_address") or " ".join(x for x in (p.get("addr:housenumber"), p.get("addr:street")) if x)
            if street:
                todo.append((str(i), street, p.get("addr:city") or "", (p.get("addr:state") or "")[:2].upper(), (p.get("addr:postcode") or "")[:5]))
    if todo:
        got = B.census_batch(todo)
        print(f"    geocoded {len(got)} of {len(todo)} stores listed without coordinates", flush=True)
        for k, (lat, lng) in got.items():
            out.append((lat, lng, features[int(k)].get("properties") or {}))
    return out


def address(p):
    street = p.get("addr:street_address") or " ".join(x for x in (p.get("addr:housenumber"), p.get("addr:street")) if x)
    if not street and p.get("addr:full"):
        # Some spiders give the street only in addr:full ("4905 S Virginia St.": Twin Peaks Reno, 11 Nov 2026).
        street = p["addr:full"].split(",")[0]
    street = re.sub(r"\s+", " ", street or "").strip()
    city, state, zp = p.get("addr:city") or "", p.get("addr:state") or "", (p.get("addr:postcode") or "")[:5]
    if not city:
        # Some spiders give the town only in addr:full ("1775 Tysons Boulevard Suite 50, Tysons, VA 22102": Fogo de Chão).
        m = re.match(r".+?,\s*([A-Za-z .'-]+),\s*[A-Z]{2}\b", p.get("addr:full") or "")
        city = m.group(1).strip() if m else ""
    if not re.search(r"[A-Za-z]{2}", street) or not city:
        return ""  # a house number alone ("851"), or no town: not an address a visitor can use
    tail = " ".join(x for x in (state, zp) if x)
    return ", ".join(x for x in (street, city, tail) if x)


def same(s, lat, lng, addr, within=0.03):
    """The same store: within `within` km, or the same street address."""
    norm = lambda x: re.sub(r"[^a-z0-9]", "", (x or "").lower().split(",")[0])
    a, b = map(float, s["geo"].split(","))
    return B.km(lat, lng, a, b) < within or bool(addr and norm(addr) == norm(s["address"]))


def overpass(reg):
    """Every place OSM names or brands as one of the chains, inside the area's bounding box."""
    lats = [a[1] for a in reg["areas"]]; lngs = [a[2] for a in reg["areas"]]
    pad = max(a[3] for a in reg["areas"]) / 70
    bbox = f"{min(lats) - pad:.4f},{min(lngs) - pad * 1.5:.4f},{max(lats) + pad:.4f},{max(lngs) + pad * 1.5:.4f}"
    rx = "|".join("(" + v + ")" for v in OSM.values())
    q = (f'[out:json][timeout:180];(nwr["brand"~"{rx}",i]({bbox});nwr["name"~"{rx}",i]({bbox}););out center tags;')
    body = get("https://overpass-api.de/api/interpreter", timeout=180, data=urllib.parse.urlencode({"data": q}).encode())
    return json.loads(body).get("elements", [])


def main(region, cache):
    reg = B.REGIONS[region]
    if not reg.get("areas"):
        raise SystemExit("Fargo-Moorhead's stores were checked by hand; this script is for the other areas")
    inside = lambda lat, lng: B.in_region(reg, lat, lng)
    locs = sorted({c["loc"] for c in B.curate_for(region) if c.get("loc")})
    out, covers = {}, {}
    for loc in locs:
        stores, basis = [], []
        if loc in SPIDERS:
            spider, run = SPIDERS[loc]
            n = 0
            feats = atp_features(cache, spider, run)
            if feats is None:
                basis.append(f"All the Places download failed ({spider})")
                covers[loc] = 0  # let OpenStreetMap fill in
                out[loc] = {"presence": "no", "basis_url": "https://www.alltheplaces.xyz/", "basis": "; ".join(basis), "stores": stores}
                continue
            pts = located(feats, reg["states"])
            # Does the chain's own list cover this area? (Wendy's has no Twin Cities store in it.)
            covers[loc] = 0 if loc in PARTIAL else sum(1 for lat, lng, _ in pts if inside(lat, lng))
            for lat, lng, p in pts:
                if not inside(lat, lng):
                    continue
                if loc in SKIP and SKIP[loc](p):
                    continue
                a = address(p)
                if not a or any(same(s, lat, lng, a) for s in stores):  # some spiders list a store more than once
                    continue
                n += 1
                stores.append({"address": a, "status": "confirmed", "wed_hours": wed_hours(p.get("opening_hours")),
                               "phone": p.get("phone") or "", "url": p.get("website") or "",
                               "geo": f"{lat:.6f},{lng:.6f}", "source": f"All the Places {run[:10]}: {spider}"})
            basis.append(f"All the Places run {run[:10]} ({spider}): {n} in the area" + (" (a partial list)" if loc in PARTIAL else ""))
        out[loc] = {"presence": "yes" if stores else "no", "basis_url": "https://www.alltheplaces.xyz/", "basis": "; ".join(basis), "stores": stores}
    # OpenStreetMap for the rest, merged so a station both lists (Circle K / Holiday) isn't counted twice.
    want = [l for l in locs if l in OSM]
    targets = [tuple(map(float, s["geo"].split(","))) for s in out.get("Target", {}).get("stores", [])]
    if want:
        print("  OpenStreetMap (Overpass)", flush=True)
        els = overpass(reg)
        for loc in want:
            rx = re.compile(OSM[loc], re.I)
            n = 0
            for e in els:
                t = e.get("tags") or {}
                if not (rx.search(t.get("brand") or "") or rx.search(t.get("name") or "")):
                    continue
                if t.get("amenity") in ("parking", "atm", "charging_station") or (t.get("amenity") == "fuel" and loc not in FUEL_OK):
                    continue
                if loc == "Hy-Vee" and t.get("shop") != "supermarket":
                    continue
                if any(k.startswith(("disused:", "was:", "abandoned:")) for k in t) or t.get("shop") == "vacant":
                    continue
                lat = e.get("lat") or (e.get("center") or {}).get("lat")
                lng = e.get("lon") or (e.get("center") or {}).get("lon")
                if lat is None or not inside(lat, lng):
                    continue
                if loc == "Starbucks" and any(B.km(lat, lng, *tg) < 0.15 for tg in targets):
                    continue  # the counter inside a Target
                a = address(t)
                if any(same(s, lat, lng, a, 0.2) for s in out[loc]["stores"]):  # parking-lot pins differ by 100 m+
                    continue
                if covers.get(loc, 0) >= 1 and loc != "Circle K / Holiday":
                    print(f"    not on {loc}'s own list, left out (likely closed): OSM {e['type']}/{e['id']} {a or t.get('name')}", flush=True)
                    continue
                if not a:
                    print(f"    no address on OSM {e['type']}/{e['id']} {t.get('name')}: left out", flush=True)
                    continue
                n += 1
                wh = wed_hours(t.get("opening_hours"))
                if wh and wh[6:] < "12:00" and wh[6:] > wh[:5]:
                    wh = ""  # a tag that ends the day before noon is usually breakfast hours alone: use usual hours
                out[loc]["stores"].append({"address": a, "status": "unverified", "wed_hours": wh,
                                           "phone": t.get("phone") or t.get("contact:phone") or "", "url": t.get("website") or "",
                                           "osm_id": f"{e['type']}/{e['id']}", "geo": f"{lat:.6f},{lng:.6f}",
                                           "source": "OpenStreetMap"})
            out[loc]["basis"] = "; ".join(x for x in (out[loc]["basis"], f"OpenStreetMap: {n} in the area") if x)
            if out[loc]["stores"]:
                out[loc]["presence"] = "yes"
    dest = os.path.join(B.RES, reg["research"], "locations-2026.json")
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    json.dump(out, open(dest, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{region}: {sum(len(v['stores']) for v in out.values())} stores, "
          f"{sum(v['presence'] == 'yes' for v in out.values())} of {len(out)} chains -> {os.path.relpath(dest, B.ROOT)}")
    for k, v in out.items():
        if v["stores"]:
            print(f"  {k}: {len(v['stores'])}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    main(sys.argv[1], sys.argv[2])
