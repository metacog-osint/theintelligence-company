"""Build each area's drive.json (beside its deals.json): driving times on the road network (OSRM demo server, from
OpenStreetMap) between every pair of stores, and from a grid of points about every 800 m to every store. The app
joins a phone's position to its nearest grid points, so a position never has to be sent anywhere.

Usage (from the repo root, after build_data.py):  python -I veterans-day/build/drive_matrix.py [area id ... | all]
(default: all). Fargo-Moorhead's grid covers its stores' extent; another area's covers its circles (`areas` in
REGIONS, build_data.py) plus 1 km, so a town with one stop (New Salem) still has start points of its own.
Polite to the free server: one request a second, 50 x 50 per request.
"""
import json, math, os, sys, time, urllib.request
from datetime import datetime, timezone

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_data as B  # noqa: E402  (REGIONS, km)

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DATA = os.path.join(ROOT, "site", "veterans", "veterans-day", "data")
UA = "tic-veterans-day-build/1.0 (support@theintelligence.company)"
OSRM = "https://router.project-osrm.org/table/v1/driving/"
STEP_LAT, STEP_LNG = 0.0072, 0.0105  # about 800 m each way at 46.9 N (other latitudes: step_lng())
SNAP_MAX_M = 400  # grid points further than this from any road are dropped
CHUNK = 50
_last = [0.0]


def table(src, dst):
    """src, dst: [(lat, lng)] -> (durations[src][dst] seconds or None, source snap distances in metres)."""
    wait = 1.05 - (time.time() - _last[0])
    if wait > 0:
        time.sleep(wait)
    coords = ";".join(f"{lng:.5f},{lat:.5f}" for lat, lng in src + dst)
    q = "?sources=" + ";".join(str(i) for i in range(len(src))) + "&destinations=" + ";".join(str(len(src) + j) for j in range(len(dst))) + "&annotations=duration"
    for attempt in range(4):
        try:
            _last[0] = time.time()
            r = json.loads(urllib.request.urlopen(urllib.request.Request(OSRM + coords + q, headers={"User-Agent": UA}), timeout=90).read())
            if r.get("code") != "Ok":
                raise RuntimeError(r.get("code"))
            return r["durations"], [s.get("distance", 0) for s in r["sources"]]
        except Exception as e:
            print("  retry", attempt + 1, e, flush=True)
            time.sleep(3 * (attempt + 1))
    raise SystemExit("OSRM kept failing; try again later")


def full(src, dst):
    rows, snaps = [], []
    for i in range(0, len(src), CHUNK):
        part_rows = [[] for _ in src[i:i + CHUNK]]
        part_snap = None
        for j in range(0, len(dst), CHUNK):
            d, s = table(src[i:i + CHUNK], dst[j:j + CHUNK])
            for k, row in enumerate(d):
                part_rows[k].extend(None if v is None else int(round(v)) for v in row)
            part_snap = part_snap or s
        rows.extend(part_rows)
        snaps.extend(part_snap)
        print(f"  {min(i + CHUNK, len(src))}/{len(src)} rows", flush=True)
    return rows, snaps


def step_lng(lat, k=1.0):
    return k * 0.0072 / math.cos(math.radians(lat))  # the same 800 m east-west as STEP_LAT north-south


def area_grid(areas, grid_km=0.8):
    """Points about every 800 m (or `grid_km` in REGIONS) inside the area's circles, each widened by 1 km. Denver's
    metro (11 Nov 2026) uses 1.1 km, which halves its grid and drive.json; a position joins its nearest points."""
    k = grid_km / 0.8
    pts = []
    for name, clat, clng, r in areas:
        r += 1.0
        dlat = r / 111.2
        lat = clat - dlat
        while lat <= clat + dlat:
            st = step_lng(lat, k)
            dlng = dlat / math.cos(math.radians(lat))
            # snap to a shared lattice so overlapping circles share points
            lng = math.floor((clng - dlng) / st) * st
            while lng <= clng + dlng:
                if B.km(lat, lng, clat, clng) <= r:
                    pts.append((round(lat, 5), round(lng, 5)))
                lng += st
            lat += STEP_LAT * k
    seen, out = set(), []
    for p in pts:
        key = (round(p[0] / (STEP_LAT * k)), round(p[1] / step_lng(p[0], k)))
        if key not in seen:
            seen.add(key); out.append(p)
    return out


def main(region=B.DEFAULT_REGION):
    data = os.path.join(DATA, B.REGIONS[region]["out"])
    deals = json.load(open(os.path.join(data, "deals.json"), encoding="utf-8"))
    places = [(p["lat"], p["lng"]) for p in deals["places"]]
    areas = (deals["meta"].get("region") or {}).get("areas")
    if areas:
        grid = area_grid(areas, B.REGIONS[region].get("grid_km", 0.8))
    else:
        # Fargo-Moorhead, as first built: the stores' extent with a margin.
        lats = [p[0] for p in places]; lngs = [p[1] for p in places]
        s, n = min(lats) - 0.012, max(lats) + 0.012
        w, e = min(lngs) - 0.016, max(lngs) + 0.016
        grid = []
        lat = s
        while lat <= n:
            lng = w
            while lng <= e:
                grid.append((round(lat, 5), round(lng, 5)))
                lng += STEP_LNG
            lat += STEP_LAT
    print(f"== {region}: {len(places)} places, {len(grid)} grid points", flush=True)
    print("store to store", flush=True)
    pp, _ = full(places, places)
    print("grid to store", flush=True)
    gp, snaps = full(grid, places)
    keep = [i for i, d in enumerate(snaps) if d <= SNAP_MAX_M and any(v is not None for v in gp[i])]
    out = {
        "built_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": "OSRM demo server (router.project-osrm.org), OpenStreetMap road data",
        "place_ids": [p["id"] for p in deals["places"]],
        "places": pp,
        "anchors": [list(grid[i]) for i in keep],
        "fromAnchor": [gp[i] for i in keep],
    }
    json.dump(out, open(os.path.join(data, "drive.json"), "w", encoding="utf-8"), separators=(",", ":"))
    size = os.path.getsize(os.path.join(data, "drive.json"))
    print(f"kept {len(keep)} of {len(grid)} grid points; drive.json {size // 1024} KB")


if __name__ == "__main__":
    want = sys.argv[1:] or ["all"]
    for r in (list(B.REGIONS) if want == ["all"] else want):
        if r not in B.REGIONS:
            raise SystemExit(f"unknown area {r!r}; one of: {', '.join(B.REGIONS)}")
        main(r)
