/*! Veterans Day 2026 planner · app v1.3 · The Intelligence Company. Load tic-time.js, engine.js and roads.js first.
 *  v1.2 (10 Nov 2026): areas. Fargo-Moorhead, Bismarck-Mandan and New Salem, and the Twin Cities' Plymouth, Maple
 *  Grove and Roseville, picked in the top bar.
 *  v1.3 (10 Nov 2026): Plan for Optimal (engine v1.4), first and the default: the best deal of each kind, no
 *  two of a kind within 3 hours. A phone still on the old default, Best for me, moves to Optimal once; a goal tapped
 *  after that stays (S.goalSet).
 *  Everything about the user (settings, history, position) stays in this browser. The only network calls: the
 *  page's own data files, the NWS forecast, the shared field-report service (API below) and, on the Map tab, map tiles
 *  and the road shapes between the stores on your route (roads.js, from OSRM; never your position).
 */
(function () {
  "use strict";
  const E = window.VDEngine, T = window.TicTime, R = window.VDRoads;
  const API = "https://vetday.metacog.workers.dev"; // field-report Worker (veterans-day/worker); "" keeps reports on the phone
  const KEY = "vd2026-v1", MIN = 60000, HOUR = 3600000;
  // Areas (9 Nov 2026: friends in New Salem, ND, and in the Rosedale, Plymouth and Maple Grove areas of the Twin
  // Cities). Fargo-Moorhead is the default and where a first visit lands. The area picked in the top bar is remembered
  // on this phone; a link with ?area=<id> opens that area and remembers it. Each area's data sits in its own folder,
  // and its deals.json says the rest (meta.region: name, centre, forecast place, transit). The ids match the <select>.
  const AREAS = [
    { id: "fargo-moorhead", dir: "data/" },
    { id: "bismarck-mandan", dir: "data/bismarck-mandan/" },
    { id: "twin-cities", dir: "data/twin-cities/" },
    { id: "reston-va", dir: "data/reston-va/" },
    { id: "reno-sparks", dir: "data/reno-sparks/" },
    { id: "fort-meade", dir: "data/fort-meade/" },
    { id: "denver", dir: "data/denver/" },
    { id: "colorado-springs", dir: "data/colorado-springs/" }
  ];
  const DEFAULT_AREA = "fargo-moorhead";
  const AWAY_KM = 15; // further than this from the area's nearest start point, your location is somewhere else
  let areaId = DEFAULT_AREA, AREA = null;
  const CATS = [["breakfast", "Breakfast"], ["meal", "Sit-down meals"], ["quick", "Quick bites"], ["coffee", "Coffee"],
    ["treat", "Treats"], ["bar", "Bars and breweries (21+)"], ["service", "Haircuts and car care"],
    ["shopping", "Shopping discounts"], ["event", "Ceremonies and veterans' posts"]];
  const CAT = Object.fromEntries(CATS);
  // Likes: every category, plus deals that need a purchase (a buy-one-get-one, a percentage off), off unless turned on.
  // Bars are on (8 Nov 2026), with a drive-safe line wherever one shows up.
  const LIKES = CATS.concat([["purchase", "Deals that need a purchase"]]);
  const OFF_BY_DEFAULT = { purchase: true };
  const DRIVE_SAFE = "21 and over. If you drink, don't drive: bring a sober driver, take a cab or rideshare";
  // Each area finishes the line with its own transit (MATBUS is free with a veteran ID in Fargo-Moorhead).
  const driveSafe = () => DRIVE_SAFE + (AREA && AREA.transit ? ", or " + AREA.transit : "") + ".";
  const likeOf = (c) => (S.prefs[c] === undefined ? (OFF_BY_DEFAULT[c] ? 0 : 1) : S.prefs[c]);
  const likeWord = (w) => (w > 1 ? "Love" : w > 0 ? "Fine" : "Off");
  const GOAL_NAME = { optimal: "Optimal", best: "Best for me", stops: "Most stops", savings: "Most savings", both: "Stops + savings" };
  const GOAL_NOTE = {
    optimal: "The best deal of each kind on your way, with no two of the same kind (coffee, meal, bar, haircut) within 3 hours. Tickets for later don't count, and a pinned deal always fits. Counts what you love; leaves out anything Off.",
    best: "Weighs each deal against your time, at your pace, with more of what you love.",
    stops: "Fits in the most places before you're done. Ignores pace and Love; leaves out anything Off.",
    savings: "Collects the most dollars before you're done. Ignores pace and Love; leaves out anything Off.",
    both: "Balances the most places with the most dollars. Ignores pace and Love; leaves out anything Off."
  };
  const GRADE = { A: "Confirmed 2026", B: "Announced 2026", C: "Not confirmed: call first" };
  const GRADE_LONG = {
    A: "The business itself announced this for 2026.",
    B: "2026 deal lists or news reports carry it. Single stores can opt out.",
    C: "We found only earlier years, or a single 2026 listing we couldn't confirm. Call before you go."
  };
  const MODE = { dine_in: "dine-in", to_go: "to go", drive_thru: "drive-thru", dine_in_or_to_go: "dine-in or to go",
    in_store: "in store", online: "online", voucher: "card or voucher for later", event: "event" };
  // Where drive times start until you set a start: the area's centre (Fargo-Moorhead: 13th Ave S and 25th St, Fargo).
  const center = () => (AREA && AREA.center ? { lat: AREA.center[0], lng: AREA.center[1] } : { lat: 46.8600, lng: -96.8100 });

  let data = null, offersById = {}, placesById = {}, dayStart = 0, S = null, wxSlick = false;
  const live = { pos: null, acc: null, at: 0, watch: null, last: null };
  const shared = { events: [], overrides: {}, community: null, at: 0, ok: null };
  let focus = null, picking = false, map = null, mapLayer = null, mapReady = null, lastAnnounce = "";
  let roadLines = null, routeLayer = null, shownRoute = null; // the Map's route line (roads.js)
  let fitRoute = false, lastTab = null, mapFocusPlaceId = null; // opening the Map zooms to the route once
  // Folded stops and deal cards that are open. The lists are rebuilt every 30 seconds; these keep them open.
  const openStops = new Set(), openDeals = new Set();
  const DEALS_PAGE = 20; // deals shown before "Show all"
  let dealsShown = DEALS_PAGE, dealsKey = "";
  const STOPS_PAGE = 5; // later stops shown under the first before "Show all": the route re-plans at every stop
  let allStops = false;

  // ---------------------------------------------------------------- small helpers
  const $ = (s, r) => (r || document).querySelector(s);
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    add(el, kids);
    return el;
  }
  function add(el, c) {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) c.forEach((x) => add(el, x));
    else el.appendChild(typeof c === "object" ? c : document.createTextNode(String(c)));
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }
  function ext(href, text, cls) {
    return h("a", { href, target: "_blank", rel: "noopener", "aria-describedby": "newtab", class: cls }, text + " ↗");
  }
  const fmt = (ms) => T.format(new Date(ms), { date: false });
  const fmtNZ = (ms) => T.format(new Date(ms), { date: false, zoneName: false });
  const money = (v) => "$" + Math.round(v);
  // cost_text (from CURATE's show) says what a deal costs when "free" would mislead: the 5K is $35 to run, free to
  // watch (11 Nov 2026). It changes only the words; the engine still scores the offer by value and worth.
  const worthText = (o) => (o.cost_text ? o.cost_text : o.value > 0 ? "about " + money(o.value) : o.category === "shopping" ? "a discount" : "free");
  // "7 min", "1 h 5 min": no-break spaces keep a duration on one line; rounding first avoids "1 h 60 min".
  const mins = (m) => {
    if (m < 1) return "under a minute";
    const r = Math.round(m);
    return r < 60 ? r + " min" : Math.floor(r / 60) + " h " + (r % 60) + " min";
  };
  const localMs = (minOfDay) => dayStart + minOfDay * MIN;

  // ---------------------------------------------------------------- stored state (this phone only)
  function defaults() {
    return {
      profile: { status: "veteran", spouse: false, kids: 0, proof: { military_id: true }, ready: {}, pace: "balanced",
        dayEndMin: 21 * 60, mealsMax: 2, roads: "auto", blocks: [], togo: false },
      done: {}, away: {}, strikes: {}, vetoed: {}, pinned: {}, prefs: {}, learned: {},
      starts: {}, area: null, gps: false, sent: [], previewMin: 8 * 60, cats: {}, qfilters: {}, // starts: a start point per area
      goal: "optimal", goalSet: false, maxGoal: "both", leaveMin: null // leaveMin: minutes after midnight, or null for "now"
    };
  }
  function load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { s = null; }
    const d = defaults();
    if (!s) return d;
    // Before areas there was one start point, always in Fargo-Moorhead.
    if (s.start && !s.starts) s.starts = { [DEFAULT_AREA]: s.start };
    delete s.start;
    // Before Optimal (10 Nov 2026) every phone started on Best for me. One that never picked a goal since gets the new
    // default; Maximize picks stay.
    if (!s.goalSet && (s.goal === "best" || !s.goal)) s.goal = "optimal";
    return Object.assign(d, s, { profile: Object.assign(d.profile, s.profile || {}) });
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* private mode: still works this visit */ } }

  // ---------------------------------------------------------------- the clock
  const loadedAt = Date.now();
  const forced = (() => { const q = new URLSearchParams(location.search).get("now"); const t = q ? Date.parse(q) : NaN; return isNaN(t) ? null : t; })();
  function realNow() { return forced !== null ? forced + (Date.now() - loadedAt) : Date.now(); }
  function mode() {
    const t = realNow();
    if (t < dayStart + 4 * HOUR) return "preview";
    if (t >= dayStart + 24 * HOUR) return "over";
    return "live";
  }
  function now() { return mode() === "preview" ? localMs(S.previewMin) : realNow(); }
  // Practice marks (11 Nov 2026): "Got it", "Turned away" and "Skip" tapped in the preview were saved with the
  // preview's clock and hid those deals on the day. The preview clock is always on the half hour of the day, so once
  // the day is live any mark stamped exactly there is dropped (a real tap landing on it to the millisecond is a
  // one-in-millions chance), which also clears marks phones saved before this fix. "Not today" choices stay.
  function previewStamp(t) { return typeof t === "number" && t > 0 && (t - dayStart) % (30 * MIN) === 0; }
  function clearPreviewMarks() {
    if (mode() === "preview") return 0;
    let n = 0;
    Object.keys(S.done).forEach((id) => { if (S.done[id] && previewStamp(S.done[id].t)) { delete S.done[id]; n++; } });
    Object.keys(S.away).forEach((p) => { if (previewStamp(S.away[p])) { delete S.away[p]; n++; } });
    Object.keys(S.strikes).forEach((id) => { const s = S.strikes[id]; if (s && previewStamp(s.until - 45 * MIN)) { delete S.strikes[id]; n++; } });
    if (S.last && previewStamp(S.last.t)) { S.last = null; n++; }
    if (n) { save(); if ($("#toast")) toast("Cleared your practice marks from the preview. Every deal is back."); }
    return n;
  }
  // When the route starts: now, or a later time you picked to leave.
  function leaveAt() { const t = now(); return S.leaveMin === null || S.leaveMin === undefined ? t : Math.max(t, localMs(S.leaveMin)); }

  // ---------------------------------------------------------------- inputs for the engine
  function roads() { return S.profile.roads === "auto" ? (wxSlick ? "slick" : "normal") : S.profile.roads; }
  function engineProfile() {
    const p = S.profile;
    return { status: p.status, spouse: p.spouse, kids: Number(p.kids) || 0, proof: p.proof, ready: p.ready, pace: p.pace,
      dayEnd: localMs(p.dayEndMin), mealsMax: Number(p.mealsMax), roads: roads(),
      blocks: p.blocks.map((b) => ({ start: localMs(b.from), end: localMs(b.to) })), goal: S.goal, togo: !!p.togo };
  }
  function engineState() {
    const prefs = {};
    CATS.forEach(([c]) => { prefs[c] = likeOf(c) * (S.learned[c] || 1); });
    prefs.purchase = likeOf("purchase");
    const pinned = {};
    Object.entries(S.pinned || {}).forEach(([k, v]) => {
      if (!v) return;
      if (typeof v === "object") {
        pinned[k] = { placeId: v.placeId || null, targetMs: v.targetMin !== undefined && v.targetMin !== null ? localMs(v.targetMin) : null };
      } else {
        pinned[k] = true;
      }
    });
    return { done: S.done, away: S.away, strikes: S.strikes, vetoed: S.vetoed, pinned, prefs };
  }
  function engineReports() {
    const r = { place: {}, offer: {} };
    const put = (e) => { (r.place[e.p] = r.place[e.p] || []).push(e); (r.offer[e.o] = r.offer[e.o] || []).push(e); };
    shared.events.forEach(put);
    S.sent.forEach((e) => { if (!e.synced) put(e); });
    return r;
  }
  // Near enough to this area's grid of start points to time trips from there.
  function inArea(p) {
    const a = data && data.drive && data.drive.anchors;
    if (!a || !a.length) return true;
    let best = Infinity;
    for (let i = 0; i < a.length; i++) best = Math.min(best, E.km(p, { lat: a[i][0], lng: a[i][1] }));
    return best <= AWAY_KM;
  }
  function position() {
    const gpsOn = live.pos && Date.now() - live.at < 10 * MIN;
    if (gpsOn && inArea(live.pos)) return { pos: live.pos, kind: "gps" };
    // Without live location, assume you're still at the stop you last marked, for two hours.
    if (S.last && Math.abs(now() - S.last.t) < 2 * HOUR && (S.last.area || DEFAULT_AREA) === areaId) return { pos: S.last, kind: "last" };
    const away = !!gpsOn; // your location is in another area: plan from this area's start or centre, and say so
    const st = S.starts[areaId];
    if (st) return { pos: st, kind: "start", away };
    return { pos: center(), kind: "center", away };
  }
  function context(t, pos) {
    return E.prepare(data, engineProfile(), engineState(), engineReports(), t, pos, shared.overrides);
  }

  // ---------------------------------------------------------------- describing a stop
  function windowText(c) {
    const o = c.offer;
    if (o.start || o.end) return (o.start && c.open > dayStart + 30 * MIN ? fmtNZ(c.open) + "–" : "until ") + fmt(c.close);
    return (c.place.hoursAssumed ? "usual hours, about " : "open ") + fmtNZ(c.open) + "–" + fmt(c.close);
  }
  function whyBits(step) {
    const c = step.c, o = c.offer, bits = [];
    bits.push(step.driveMin < 1.5 ? "you're here" : mins(step.driveMin - 2.5) + " drive");
    if (o.arriveBy && o.arriveBy < c.close) bits.push("be there by " + fmt(o.arriveBy)); // a ceremony's start
    else if (o.end || c.close - dayStart < 23.5 * HOUR) bits.push((o.end ? "deal ends " : "closes ") + fmt(c.close));
    else bits.push("open late");
    if (step.slackMin < 90) bits.push(mins(step.slackMin) + " to spare");
    let v = worthText(o);
    if (S.profile.spouse && o.spouse === "yes") v += o.value > 0 ? " each, spouse too" : ", spouse too";
    bits.push(v);
    if (step.queueMin >= 10) bits.push("line about " + Math.round(step.queueMin) + " min");
    return bits;
  }
  function fieldLine(c) {
    const t = now(), ev = shared.events.concat(S.sent.filter((e) => !e.synced)).filter((e) => e.p === c.place.id && t - e.t < 4 * HOUR);
    const worked = ev.filter((e) => e.k === "worked").length, away = ev.filter((e) => e.k === "away").length;
    const out = ev.some((e) => e.k === "out");
    if (!worked && !away && !out) return null;
    const parts = [];
    if (worked) parts.push(worked + (worked === 1 ? " person" : " people") + " got it here");
    if (away) parts.push(away + " turned away");
    if (out) parts.push("someone reported they ran out");
    return h("p", { class: "field" + (away > worked || out ? " bad" : "") }, parts.join(", ") + " in the last 4 hours.");
  }
  function callBtn(pl, cls) {
    return pl && pl.phone ? h("a", { class: cls || "btn btn-quiet btn-small", href: "tel:" + pl.phone.replace(/[^\d+]/g, "") }, "Call") : null;
  }
  function showOnMap(pl) {
    if (!pl) return;
    mapFocusPlaceId = pl.id;
    location.hash = "#map";
    renderAll();
  }
  function mapBtn(pl, cls) {
    return pl ? h("button", { type: "button", class: cls || "btn btn-quiet btn-small", onclick: () => showOnMap(pl) }, "On map") : null;
  }
  function makeBranchSelect(o, pl) {
    const sameOfferPlaces = data.places.filter((p) => p.offer === o.id);
    if (sameOfferPlaces.length <= 1) return null;
    const swapSel = h("select", { class: "sched-select", "aria-label": "Change location for " + o.brand },
      sameOfferPlaces.map((p) => h("option", { value: p.id }, p.address.split(",")[0])));
    swapSel.value = pl.id;
    swapSel.addEventListener("change", () => {
      const cur = S.pinned[o.id];
      const tMin = cur && typeof cur === "object" ? cur.targetMin : null;
      S.pinned[o.id] = { placeId: swapSel.value, targetMin: tMin };
      if (focus === pl.id) focus = swapSel.value;
      openStops.add(swapSel.value);
      save(); renderAll();
      toast("Switched " + o.brand + " location.");
    });
    return swapSel;
  }
  function dirLinks(pl, o) {
    const ll = pl.lat + "," + pl.lng;
    return h("p", { class: "links" },
      ext("https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=" + ll, "Directions", "btn btn-small"),
      ext("https://maps.apple.com/?dirflg=d&daddr=" + ll, "Apple Maps", "btn btn-quiet btn-small"),
      mapBtn(pl),
      callBtn(pl),
      o ? makeSchedSelect(o, pl) : null,
      o ? makeBranchSelect(o, pl) : null);
  }
  function offerHoursMin(o, p) {
    let openMs = o.start || (p ? p.open : dayStart + 6 * HOUR);
    let closeMs = o.end || (p ? p.close : dayStart + 21 * HOUR);
    if (p) { openMs = Math.max(openMs, p.open); closeMs = Math.min(closeMs, p.close); }
    const startMin = Math.max(5 * 60, Math.ceil(((openMs - dayStart) / MIN) / 30) * 30);
    const endMin = Math.min(22 * 60, Math.floor(((closeMs - dayStart - (o.minutes || 15) * MIN) / MIN) / 30) * 30);
    return { startMin, endMin: Math.max(startMin, endMin) };
  }
  function setOfferSchedule(o, p, val) {
    if (!val) {
      delete S.pinned[o.id];
      save(); renderAll();
      toast("Removed " + o.brand + " from locked route stops.");
      return;
    }
    const targetMin = val === "best" ? null : Number(val);
    S.pinned[o.id] = { placeId: p ? p.id : null, targetMin };
    delete S.vetoed[o.id];
    delete S.strikes[o.id];
    save(); renderAll();
    const locLabel = p ? " (" + p.address.split(",")[0] + ")" : "";
    const timeLabel = targetMin !== null ? " around " + fmt(localMs(targetMin)) : " at the best time";
    toast("Added " + o.brand + locLabel + " to your route" + timeLabel + ".");
  }
  function makeSchedSelect(o, p) {
    const cur = S.pinned[o.id];
    const isThisPlace = cur && (cur === true || !cur.placeId || !p || cur.placeId === p.id);
    const curVal = !isThisPlace ? "" : (typeof cur === "object" && cur.targetMin !== null && cur.targetMin !== undefined ? String(cur.targetMin) : "best");
    const { startMin, endMin } = offerHoursMin(o, p);
    const sel = h("select", { class: "sched-select", "aria-label": "Schedule " + o.brand + (p ? " at " + p.address.split(",")[0] : "") + " in route" },
      h("option", { value: "" }, isThisPlace ? "★ In route (change…)" : "+ Build into route…"),
      h("option", { value: "best" }, "★ Route at best time"));
    for (let m = startMin; m <= endMin; m += 30) {
      sel.append(h("option", { value: String(m) }, "Route at " + fmt(localMs(m))));
    }
    sel.value = curVal;
    sel.addEventListener("change", () => setOfferSchedule(o, p, sel.value));
    return sel;
  }
  function chips(o) {
    return [h("span", { class: "cat" }, CAT[o.category] || o.category), h("span", { class: "grade grade-" + o.grade, title: GRADE_LONG[o.grade] }, GRADE[o.grade]),
      o.ticket ? h("span", { class: "cat cat-ticket", title: "A card or voucher to use later: a quick stop, nothing to eat there." }, "Ticket for later") : null,
      o.purchase ? h("span", { class: "cat", title: "You have to buy something to get this." }, "Needs a purchase") : null];
  }

  // ---------------------------------------------------------------- Next
  function announce(text) {
    if (text === lastAnnounce) return;
    lastAnnounce = text;
    $("#announce").textContent = text;
  }
  // The route: one plan from where you are (or your start), at your leave time, for the goal you picked. The first
  // stop is the big card; the rest follow with each deal's window against when you'd get there.
  function buildRoute() {
    const where = position(), t = leaveAt(), ctx = context(t, where.pos);
    let first = null;
    if (focus) first = ctx.cands.find((x) => x.place.id === focus) || null;
    let plan = E.planDay(ctx, { t, first });
    if (first && (!plan.steps.length || plan.steps[0].c !== first)) { focus = null; first = null; plan = E.planDay(ctx, { t }); }
    if (!first) focus = null;
    return { where, t, ctx, plan };
  }
  function routeValue(steps) {
    return steps.reduce((s, x) => s + x.c.offer.value * (S.profile.spouse && x.c.offer.spouse === "yes" ? 2 : 1), 0);
  }
  function renderRoutePins() {
    const box = clear($("#route-pins"));
    if (!box) return;
    const keys = Object.keys(S.pinned).filter((k) => S.pinned[k] && offersById[k]);
    if (!keys.length) { box.hidden = true; return; }
    box.hidden = false;
    const ul = h("ul", { class: "plan-pins-list" });
    keys.forEach((k) => {
      const o = offersById[k], spec = S.pinned[k];
      const pl = spec && typeof spec === "object" && spec.placeId ? placesById[spec.placeId] : null;
      const tMin = spec && typeof spec === "object" && spec.targetMin !== null && spec.targetMin !== undefined ? spec.targetMin : null;
      const desc = o.brand + (pl ? " (" + pl.address.split(",")[0] + ")" : "") + (tMin !== null ? " · ~" + fmt(localMs(tMin)) : " · best time");
      ul.append(h("li", null,
        h("span", null, "★ " + desc),
        h("button", { type: "button", class: "btn btn-quiet btn-small", onclick: () => { delete S.pinned[k]; save(); renderAll(); } }, "Remove")));
    });
    box.append(h("p", { class: "small" }, h("b", null, "Locked into your route:"), " we built your schedule around these picks."), ul);
  }
  function shareRouteText(plan) {
    const lines = ["My Veterans Day 2026 Route (" + AREA.name + "):"];
    plan.steps.forEach((x, idx) => {
      const c = x.c, o = c.offer;
      lines.push((idx + 1) + ". " + fmtNZ(x.start) + " — " + o.brand + " (" + o.offer + ") · " + c.place.address);
    });
    lines.push("Plan yours: https://theintelligence.company/veterans/veterans-day/" + (areaId === DEFAULT_AREA ? "" : "?area=" + areaId));
    const text = lines.join("\n");
    if (navigator.share) {
      navigator.share({ title: "My Veterans Day Route", text }).catch(() => {});
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => toast("Route copied to clipboard!"), () => toast("Could not copy route."));
    } else {
      toast("Sharing not supported on this browser.");
    }
  }
  function downloadRouteIcs(plan) {
    const pad = (n) => String(n).padStart(2, "0");
    const toUtc = (ms) => {
      const d = new Date(ms);
      return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + "T" +
        pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + "00Z";
    };
    const stamp = toUtc(Date.now());
    const evs = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//The Intelligence Company//Veterans Day 2026//EN",
      "CALSCALE:GREGORIAN"
    ];
    plan.steps.forEach((x, i) => {
      const c = x.c, o = c.offer;
      const summary = ("Veterans Day: " + o.brand + " (" + o.offer + ")").replace(/[,;\\]/g, " ");
      const loc = c.place.address.replace(/[,;\\]/g, " ");
      const desc = (o.limits || o.notes || "Bring military ID / proof of service.").replace(/\r?\n/g, " ").replace(/[,;\\]/g, " ");
      evs.push(
        "BEGIN:VEVENT",
        "UID:vetday2026-" + areaId + "-" + i + "-" + c.place.id + "@theintelligence.company",
        "DTSTAMP:" + stamp,
        "DTSTART:" + toUtc(x.start),
        "DTEND:" + toUtc(x.depart),
        "SUMMARY:" + summary,
        "LOCATION:" + loc,
        "DESCRIPTION:" + desc,
        "END:VEVENT"
      );
    });
    evs.push("END:VCALENDAR");
    const blob = new Blob([evs.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "veterans-day-2026-" + areaId + ".ics";
    document.body.append(a);
    a.click();
    a.remove();
    toast("Downloaded calendar file (.ics).");
  }
  function renderRouteSearch(ctx) {
    const inp = $("#route-q"), list = $("#route-q-list");
    if (!inp || !list) return;
    clear(list);
    const q = normSearch(inp.value);
    if (!q) { list.hidden = true; return; }
    const matches = [];
    data.offers.forEach((o) => {
      if (o.status !== "offering") return;
      const places = data.places.filter((p) => p.offer === o.id);
      places.forEach((p) => {
        const hay = normSearch(o.brand + " " + o.offer + " " + (CAT[o.category] || "") + " " + p.address);
        if (q.split(" ").every((tok) => hay.includes(tok))) {
          matches.push({ o, p, info: placeDriveInfo(p, ctx) });
        }
      });
    });
    matches.sort((a, b) => a.info.dMin - b.info.dMin);
    if (!matches.length) {
      list.hidden = false;
      list.append(h("li", null, h("span", { class: "note" }, "No matching deals or locations in " + AREA.name + ".")));
      return;
    }
    list.hidden = false;
    matches.slice(0, 8).forEach(({ o, p, info }, idx) => {
      const isClosest = matches.length > 1 && idx === 0;
      const distText = (isClosest ? "★ Closest · " : "") + info.dMin + " min drive (" + info.miles + " mi)";
      list.append(h("li", null,
        h("span", null,
          h("b", null, o.brand), " · " + o.offer + " — " + p.address.split(",")[0] + " ",
          h("span", { class: "loc-meta" + (isClosest ? " closest" : "") }, distText)),
        h("span", { class: "links" },
          h("button", { type: "button", class: "btn btn-quiet btn-small", onclick: () => {
            delete S.vetoed[o.id]; delete S.strikes[o.id];
            S.pinned[o.id] = { placeId: p.id, targetMin: null };
            focus = p.id; inp.value = ""; save(); renderAll();
            toast(o.brand + " (" + p.address.split(",")[0] + ") set as next stop.");
          } }, "Go here next"),
          makeSchedSelect(o, p),
          mapBtn(p))));
    });
  }
  function renderRoute() {
    const r = buildRoute(), { ctx, plan, t, where } = r, steps = plan.steps;
    renderLoc(where);
    renderControls();
    renderRouteSearch(ctx);
    renderRoutePins();
    const card = clear($("#next-card")), sum = $("#route-sum");
    $("#drive-safe").hidden = true;
    if (mode() === "over") { sum.textContent = ""; card.append(h("p", { class: "empty" }, "That's a wrap for 2026. Your day is under Me.")); hideLists(); return; }
    if (!steps.length) {
      const soon = ctx.cands.filter((c) => c.open > t).sort((a, b) => a.open - b.open)[0];
      sum.textContent = "";
      card.append(h("p", { class: "next-name" }, "Nothing fits right now"),
        h("p", { class: "empty" }, soon ? "Next to open: " + soon.offer.brand + " at " + fmt(soon.open) + "." :
          "Everything you can still use today is done, off, closed or past your done-by time. Check What I'm after and Me if that looks wrong."));
      hideLists(); announce("Nothing fits right now"); return;
    }
    const last = steps[steps.length - 1], drive = steps.reduce((s, x) => s + x.driveMin, 0);
    sum.textContent = GOAL_NAME[ctx.goal] + ": " + steps.length + (steps.length === 1 ? " stop" : " stops") + " · about " +
      money(routeValue(steps)) + " in deals · " + mins(drive) + " driving · done about " + fmt(last.depart);
    $("#drive-safe").hidden = !steps.some((x) => x.c.offer.category === "bar");
    nextCard(card, steps[0], t);
    renderStops(ctx, plan, t);
    renderSoon(ctx, plan, t);
    renderAlts(ctx, steps[0], t);
  }

  function nextCard(card, s, t) {
    const c = s.c, o = c.offer, pl = c.place;
    card.append(
      h("p", { class: "next-kicker" }, focus ? "Your pick" : t > now() + 5 * MIN ? "First stop" : "Next stop", ...chips(o)),
      h("h3", { class: "next-name" }, o.brand),
      h("p", { class: "next-offer" }, o.offer),
      h("p", { class: "next-addr" }, pl.address + (pl.verified === "unverified" ? " · address from directories, not the chain's own site" : "")),
      h("p", { class: "why" }, whyBits(s).map((b) => h("span", null, b))));
    if (s.waitMin > 10) card.append(h("p", { class: "leave" }, "Opens " + fmt(s.start) + ". Leave by " + fmt(s.start - s.driveMin * MIN) + "."));
    else if (t > now() + 5 * MIN) card.append(h("p", { class: "leave" }, "Leave at " + fmt(s.start - s.driveMin * MIN) + "."));
    const fl = fieldLine(c);
    if (fl) card.append(fl);
    const flags = c.flags.concat(o.limits ? [o.limits] : []);
    if (flags.length) card.append(h("ul", { class: "flags" }, flags.map((f) => h("li", null, f))));
    if (o.category === "bar") card.append(h("p", { class: "note drive-safe" }, driveSafe()));
    card.append(dirLinks(pl, o));
    card.append(h("div", { class: "actions" },
      h("button", { type: "button", class: "btn btn-good", onclick: () => record(c, "worked") }, "✓ Got it"),
      h("button", { type: "button", class: "btn btn-bad", onclick: () => record(c, "away") }, "✗ Turned away"),
      h("button", { type: "button", class: "btn btn-quiet", onclick: () => skip(c) }, "Skip for now"),
      h("button", { type: "button", class: "btn btn-quiet", onclick: () => never(o) }, "Never this one")));
    const line = h("select", { "aria-label": "How long is the line?" },
      h("option", { value: "" }, "Report the line…"),
      [0, 5, 10, 20, 30, 45, 60].map((m) => h("option", { value: m }, m === 0 ? "No line" : m === 60 ? "An hour or more" : "About " + m + " min")));
    line.addEventListener("change", () => { if (line.value !== "") report(c, "line", Number(line.value)); });
    card.append(h("p", { class: "links" }, line,
      h("button", { type: "button", class: "btn btn-quiet btn-small", onclick: () => record(c, "out") }, "They ran out"),
      focus ? h("button", { type: "button", class: "btn btn-quiet btn-small", onclick: () => { focus = null; renderAll(); } }, "Back to the suggestion") : null));
    if (mode() === "preview") card.append(h("p", { class: "note" }, "Preview: what you mark now is practice. It stays on this phone, isn't shared, and clears when the day starts."));
    announce((focus ? "Your pick: " : "Next stop: ") + o.brand + ", " + whyBits(s)[0]);
  }

  // How a stop sits in its deal's window: when you'd arrive, when the deal ends, and the time to spare.
  function windowLine(x) {
    const c = x.c, o = c.offer, by = o.arriveBy && o.arriveBy < c.close ? o.arriveBy : null; // a ceremony's start
    // Leaving at the time the stop shows (after any free time) gets you there as it opens: x.start, not x.arrive.
    const spare = ((by || c.close) - x.start) / MIN;
    const ends = by ? "be there by " + fmt(by) : o.end || c.close - dayStart < 23.5 * HOUR ? (o.end ? "deal ends " : "closes ") + fmt(c.close) : "open late";
    const bits = ["Arrive " + fmtNZ(x.start), ends];
    if (ends !== "open late") bits.push(spare < 60 ? "only " + mins(spare) + " to spare" : mins(spare) + " to spare");
    return h("span", { class: "stop-win" + (spare < 25 ? " tight" : "") }, bits.join(" · "));
  }
  const SVGNS = "http://www.w3.org/2000/svg";
  function svg(tag, attrs) {
    const el = document.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
    return el;
  }
  // A bar from the start of your route to your done-by time: the deal's hours in blue, your visit in amber.
  function windowBar(x, from, to) {
    const span = Math.max(MIN, to - from), X = (ms) => Math.max(0, Math.min(100, ((ms - from) / span) * 100));
    const c = x.c, a = X(Math.max(c.open, from)), b = X(Math.min(c.close, to));
    const bar = svg("svg", { class: "wbar", viewBox: "0 0 100 10", preserveAspectRatio: "none", focusable: "false", "aria-hidden": "true" });
    bar.append(svg("rect", { class: "wb-day", x: 0, y: 4, width: 100, height: 2 }),
      svg("rect", { class: "wb-open", x: a, y: 2, width: Math.max(0.6, b - a), height: 6 }),
      svg("rect", { class: "wb-you", x: X(x.start), y: 0, width: Math.max(1, X(x.depart) - X(x.start)), height: 10 }));
    return bar;
  }
  function renderStops(ctx, plan, t) {
    const list = clear($("#route-list")), steps = plan.steps, from = t, to = ctx.dayEnd;
    let prev = steps[0].depart;
    const later = steps.slice(1), shown = allStops ? later : later.slice(0, STOPS_PAGE);
    shown.forEach((x, k) => {
      const c = x.c, o = c.offer, go = Math.max(x.leave, x.start - x.driveMin * MIN);
      if (go - prev > 20 * MIN) list.append(h("li", { class: "gap" }, "Free time " + fmtNZ(prev) + "–" + fmt(go)));
      // Folded: the stop's time, name and window show; the address, notes and buttons open on a tap.
      const id = c.place.id;
      const swapSel = makeBranchSelect(o, c.place);
      list.append(h("li", { class: "stop" },
        h("details", { class: "stop-d fold", open: openStops.has(id), ontoggle: (ev) => { if (ev.target.open) openStops.add(id); else openStops.delete(id); } },
          h("summary", null,
            h("span", { class: "stop-name" }, h("span", { class: "stop-n", "aria-label": "Stop " + (k + 2) }, String(k + 2)), h("b", null, o.brand), " · " + o.offer,
              o.ticket ? h("span", { class: "cat cat-ticket" }, "Ticket for later") : null),
            h("span", { class: "stop-when" }, "Leave " + fmtNZ(go) + " · " + mins(x.driveMin - 2.5) + " drive · " +
              mins(o.minutes + x.queueMin) + " there"),
            windowLine(x),
            windowBar(x, from, to)),
          o.ticket ? h("p", { class: "note" }, "A card or voucher for later: a quick stop, nothing to eat there.") : null,
          h("p", { class: "note" }, c.place.address + (c.flags.length ? " · " + c.flags.join("; ") : "")),
          o.limits ? h("p", { class: "note" }, o.limits) : null,
          h("p", { class: "links" },
            h("button", { type: "button", class: "btn btn-quiet btn-small", onclick: () => { focus = id; renderAll(); window.scrollTo(0, 0); } }, "Go here first"),
            makeSchedSelect(o, c.place),
            swapSel,
            mapBtn(c.place),
            h("button", { type: "button", class: "btn btn-quiet btn-small", onclick: () => never(o) }, "Not today"),
            ext("https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=" + c.place.lat + "," + c.place.lng, "Directions", "btn btn-quiet btn-small"),
            callBtn(c.place)))));
      prev = x.depart;
    });
    if (later.length > shown.length) {
      list.append(h("li", { class: "more-row" }, h("button", { type: "button", class: "btn btn-quiet more",
        onclick: () => { allStops = true; renderAll(); } }, "Show all " + later.length + " later stops (" + (later.length - shown.length) + " more)")));
    }
    $("#route-wrap").hidden = false;
    $("#route-list").hidden = steps.length < 2;
    const last = steps[steps.length - 1], left = (ctx.dayEnd - last.depart) / MIN, end = $("#route-end");
    if (left < 90) end.textContent = "That fills your day to your done-by time, " + fmt(ctx.dayEnd) + ".";
    else if (ctx.goal === "best") end.textContent = "The route stops at " + fmt(last.depart) + " because nothing else is worth the drive at your pace. Maximize fits in more; so does a faster pace under Me.";
    else if (ctx.goal === "optimal") end.textContent = "Nothing else fits after " + fmt(last.depart) + " without a second stop of the same kind within 3 hours, or what's left is closed, done, turned off or more food than you'd want. Maximize fits in more.";
    else end.textContent = "Nothing else fits after " + fmt(last.depart) + ": what's left is closed, done, turned off, past your sit-down meal limit or more food than you'd want.";
    end.append(" On the day it re-plans after every stop you mark.");
    // Google Maps takes at most 9 stops between the start and the end: one link per 10 stops.
    const links = clear($("#route-links")), origin0 = position().pos;
    for (let i = 0; i < steps.length; i += 10) {
      const chunk = steps.slice(i, i + 10), dest = chunk[chunk.length - 1].c.place;
      const origin = i === 0 ? origin0 : steps[i - 1].c.place;
      let url = "https://www.google.com/maps/dir/?api=1&travelmode=driving&origin=" + origin.lat + "," + origin.lng +
        "&destination=" + dest.lat + "," + dest.lng;
      const mid = chunk.slice(0, -1).map((x) => x.c.place.lat + "," + x.c.place.lng);
      if (mid.length) url += "&waypoints=" + encodeURIComponent(mid.join("|"));
      links.append(ext(url, steps.length > 10 ? "Stops " + (i + 1) + "–" + (i + chunk.length) + " in Google Maps" : "Whole route in Google Maps", "btn btn-quiet"));
    }
    links.append(
      h("button", { type: "button", class: "btn btn-quiet", onclick: () => shareRouteText(plan) }, "Share / Copy route"),
      h("button", { type: "button", class: "btn btn-quiet", onclick: () => downloadRouteIcs(plan) }, "Add to Calendar (.ics)"),
      h("button", { type: "button", class: "btn btn-quiet", onclick: () => window.print() }, "Print")
    );
  }
  // Deals that end within two hours and aren't on the route, so they don't slip by unnoticed.
  function renderSoon(ctx, plan, t) {
    const box = clear($("#soon")), inRoute = new Set(plan.steps.map((x) => x.c.offer.id)), seen = new Set();
    const st0 = E._internal.startState(ctx, t);
    // force: listed even when Optimal holds it back for repeating a kind; adding it pins it, and a pin always fits.
    ctx.cands.filter((c) => !inRoute.has(c.offer.id) && c.close - t < 2 * HOUR)
      .map((c) => ({ c, step: E.evalStop(ctx, st0, c, true) })).filter((x) => x.step)
      .sort((a, b) => a.c.close - b.c.close || a.step.driveMin - b.step.driveMin)
      .forEach((x) => {
        const o = x.c.offer;
        if (seen.has(o.id) || seen.size >= 4) return;
        seen.add(o.id);
        box.append(h("li", null,
          h("span", { class: "a-name" }, o.brand + " · " + o.offer),
          h("span", { class: "a-why" }, (o.end ? "Deal ends " : "Closes ") + fmt(x.c.close) + " · " + mins(x.step.driveMin - 2.5) + " drive · " + worthText(o)),
          h("button", { type: "button", class: "btn btn-quiet btn-small", onclick: () => { S.pinned[o.id] = true; save(); renderAll(); toast(o.brand + " is on your route. Unpin it under Deals."); } }, "Add to my route")));
      });
    $("#soon-wrap").hidden = !box.children.length;
  }
  function renderAlts(ctx, first, t) {
    const alts = clear($("#alts"));
    E.nextOptions(ctx, { limit: 10, t }).filter((x) => x.step.c.place.id !== first.c.place.id && x.step.waitMin <= 20).slice(0, 5)
      .forEach((x) => alts.append(h("li", null,
        h("span", { class: "a-name" }, x.step.c.offer.brand + " · " + x.step.c.offer.offer),
        h("span", { class: "a-why" }, whyBits(x.step).slice(0, 3).join(" · ")),
        h("button", { type: "button", class: "btn btn-quiet btn-small", onclick: () => { focus = x.step.c.place.id; renderAll(); window.scrollTo(0, 0); } }, "Go here"))));
    $("#alts-wrap").hidden = !alts.children.length;
    $("#alts-n").textContent = "(" + alts.children.length + ")";
  }
  function hideLists() { ["#route-wrap", "#alts-wrap", "#soon-wrap"].forEach((s) => { $(s).hidden = true; }); }

  // The route's settings at the top of the page: leave and done-by times, the goal, what you're after, food to go.
  function renderControls() {
    const kind = S.goal === "best" || S.goal === "optimal" ? S.goal : "max";
    $("#goal-kind").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.kind === kind ? "true" : "false"));
    $("#goal-max").hidden = kind !== "max";
    $("#goal-max").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.goal === S.goal ? "true" : "false"));
    $("#goal-note").textContent = GOAL_NOTE[S.goal] || GOAL_NOTE.optimal;
    $("#rb-leave").value = S.leaveMin === null || S.leaveMin === undefined ? "now" : String(S.leaveMin);
    $("#rb-end").value = String(S.profile.dayEndMin);
    $("#rb-togo").checked = !!S.profile.togo;
    const box = clear($("#likes"));
    LIKES.forEach(([c, label]) => {
      const w = likeOf(c), word = likeWord(w);
      // The spoken name starts with the visible words ("Breakfast Fine"), as speech control needs.
      box.append(h("button", { type: "button", class: "like like-" + word.toLowerCase(), "aria-label": label + " " + word + ", tap to change",
        onclick: () => { S.prefs[c] = w > 1 ? 0 : w > 0 ? 1.5 : 1; save(); renderAll(); } },
        h("span", { class: "like-name" }, label), " ", h("span", { class: "like-state" }, word)));
    });
    const love = LIKES.filter(([c]) => likeOf(c) > 1).length, off = LIKES.filter(([c]) => likeOf(c) <= 0).length;
    const likes = [love ? love + " loved" : "", off ? off + " off" : ""].filter(Boolean).join(", ");
    $("#likes-sum").textContent = "What I'm after" + (likes ? ": " + likes : "");
    // The folded settings' summary line: what the route is built on, without opening it.
    const leave = S.leaveMin === null || S.leaveMin === undefined ? "Leave now" : "Leave " + fmtNZ(localMs(S.leaveMin));
    $("#rb-set-sum").textContent = [leave, "done by " + fmtNZ(localMs(S.profile.dayEndMin)), GOAL_NAME[S.goal] || GOAL_NAME.optimal, likes]
      .filter(Boolean).join(" · ");
  }

  function renderLoc(where) {
    const st = $("#loc-status");
    if (where.kind === "gps") st.textContent = "Using your location" + (live.acc ? " (within " + Math.round(live.acc) + " m)" : "") + ". It stays on this phone.";
    else if (where.kind === "last") st.textContent = "Drive times from " + S.last.name + ", your last stop. Share your location for live directions; it stays on this phone.";
    else if (where.away) st.textContent = "You're outside " + AREA.name + ", so drive times are from " +
      (where.kind === "start" ? "your start point there" : AREA.center_label) + ". Pick a start on the map, or choose your area at the top.";
    else if (where.kind === "start") st.textContent = "Drive times from your start point. Share your location for live directions; it stays on this phone.";
    else st.textContent = "Drive times are from " + AREA.center_label + " until you share your location or pick a start. Your location stays on this phone.";
    $("#loc-gps").textContent = live.watch !== null ? "Stop using my location" : "Use my location";
  }

  // ---------------------------------------------------------------- what you did
  function record(c, kind) {
    const t = now(), o = c.offer;
    S.last = { lat: c.place.lat, lng: c.place.lng, name: o.brand, t, area: areaId };
    if (kind === "worked") {
      S.done[o.id] = { r: "worked", t, place: c.place.id };
      S.learned = E.learn(S.learned, o.category, "worked");
    } else {
      S.away[c.place.id] = t;
      if (!S.done[o.id]) S.done[o.id] = { r: "away", t, place: c.place.id };
    }
    report(c, kind);
    focus = null;
    save();
    renderAll();
  }
  function skip(c) {
    const r = E.strike(S, c.offer.id, now());
    S.strikes[c.offer.id] = r.strike;
    if (r.veto) S.vetoed[c.offer.id] = true;
    S.learned = E.learn(S.learned, c.offer.category, "skip");
    focus = null; save(); renderAll();
    toast(r.veto ? "Third skip: " + c.offer.brand + " is off your list (undo under Me)." : c.offer.brand + " hidden for 45 minutes.");
  }
  function never(o) {
    S.vetoed[o.id] = true;
    S.learned = E.learn(S.learned, o.category, "skip");
    focus = null; save(); renderAll();
    toast(o.brand + " is off your list. Undo under Me.");
  }
  function report(c, kind, m) {
    const e = { p: c.place.id, o: c.offer.id, k: kind, t: now(), synced: false };
    if (m !== undefined) e.m = m;
    if (kind === "worked") e.v = Math.round(c.offer.value * (S.profile.spouse && c.offer.spouse === "yes" ? 2 : 1));
    if (mode() !== "live") { e.synced = true; e.local = true; }
    S.sent.push(e);
    save();
    if (kind === "line") toast("Thanks: line reported.");
    sync();
  }

  // ---------------------------------------------------------------- shared reports
  async function sync() {
    if (!API) return;
    for (const e of S.sent.filter((x) => !x.synced)) {
      try {
        const r = await fetch(API + "/v1/report", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ p: e.p, o: e.o, k: e.k, m: e.m, v: e.v }) });
        if (r.ok || r.status === 400 || r.status === 429) e.synced = true;
      } catch (err) { break; }
    }
    save();
  }
  async function pull() {
    if (!API) return;
    try {
      const r = await fetch(API + "/v1/state", { cache: "no-store" });
      if (!r.ok) throw new Error(r.status);
      const j = await r.json();
      shared.events = (j.events || []).filter((e) => placesById[e.p]);
      shared.overrides = j.overrides || {};
      shared.community = j.community || null;
      shared.at = Date.now(); shared.ok = true;
    } catch (err) { shared.ok = false; }
    renderAll();
  }

  // ---------------------------------------------------------------- Deals
  function normSearch(s) {
    return String(s || "").toLowerCase().replace(/['’`.\-&/]/g, "").replace(/\s+/g, " ").trim();
  }
  // Drive minutes from where you are, from the route's own table (ctx.fromPos: seconds to each place, no parking),
  // and straight-line miles. 59c4f9e called an engine "driveMinutes" that never existed, so every deal card and the
  // quick-add search threw (found 10 Nov 2026).
  let placeIdx = null, placeIdxOf = null;
  function placeDriveInfo(p, ctx) {
    if (placeIdxOf !== data.places) { placeIdx = new Map(data.places.map((x, i) => [x.id, i])); placeIdxOf = data.places; }
    const sec = ctx.fromPos ? ctx.fromPos[placeIdx.get(p.id)] : null;
    const km = ctx.pos ? E.km(ctx.pos, p) : 0;
    const dMin = Math.max(1, Math.round(sec !== null && sec !== undefined && isFinite(sec) ? sec * ctx.roads / 60 : km * 1.4 / 25 * 60));
    return { dMin, miles: (km * 0.621371).toFixed(1) };
  }
  function dealState(ctx) {
    const byOffer = {};
    ctx.cands.forEach((c) => { (byOffer[c.offer.id] = byOffer[c.offer.id] || []).push(c); });
    return byOffer;
  }
  function renderDeals() {
    const t = now(), ctx = context(t, position().pos), live = dealState(ctx);
    const rawQ = $("#q").value.trim(), q = normSearch(rawQ), sort = $("#sort").value;
    const anyCat = CATS.some(([c]) => S.cats[c]);
    const qf = S.qfilters || {};
    let list = data.offers.filter((o) => {
      if (anyCat && !S.cats[o.category]) return false;
      if (qf.openNow) {
        const cs = live[o.id];
        if (!cs || !cs.some((c) => c.open <= t && c.close > t)) return false;
      }
      if (qf.ticket && !o.ticket) return false;
      if (qf.spouse && o.spouse !== "yes") return false;
      if (!q) return true;
      const places = data.places.filter((p) => p.offer === o.id);
      const hay = normSearch(o.brand + " " + o.offer + " " + (CAT[o.category] || "") + " " + places.map((p) => p.address).join(" "));
      return q.split(" ").every((tok) => hay.includes(tok));
    });
    const end = (o) => { const cs = live[o.id]; return cs ? Math.min(...cs.map((c) => c.close)) : Infinity; };
    if (sort === "value") list.sort((a, b) => b.value - a.value);
    else if (sort === "name") list.sort((a, b) => a.brand.localeCompare(b.brand));
    else list.sort((a, b) => end(a) - end(b) || b.value - a.value);
    const box = clear($("#deal-list"));
    // A new search, filter or sort starts again from the first page.
    const key = q + "|" + sort + "|" + CATS.filter(([c]) => S.cats[c]).map(([c]) => c).join(",") + "|" +
      Object.keys(qf).filter((k) => qf[k]).join(",");
    if (key !== dealsKey) { dealsKey = key; dealsShown = DEALS_PAGE; }
    const anyFilter = anyCat || q || qf.openNow || qf.ticket || qf.spouse;
    $("#deals-count").textContent = list.length + " of " + data.offers.length + " deals" + (anyFilter ? " match" : "") +
      ". Faded ones don't fit you right now; each says why.";
    list.slice(0, dealsShown).forEach((o) => box.append(dealCard(o, live[o.id], ctx, q)));
    const rest = list.length - dealsShown;
    $("#deals-more-wrap").hidden = rest <= 0;
    $("#deals-more").textContent = "Show all " + list.length + " deals (" + rest + " more)";
  }
  // A deal card: name, offer and when, at a glance; locations, proof, notes and sources fold under "Details".
  function dealCard(o, cands, ctx, q) {
    const places = data.places.filter((p) => p.offer === o.id)
      .map((p) => ({ p, info: placeDriveInfo(p, ctx) }))
      .sort((a, b) => a.info.dMin - b.info.dMin);
    const reason = cands ? null : (places.map((x) => ctx.excluded[x.p.id]).find(Boolean) || "not available");
    const meta = [];
    if (o.start && o.end) meta.push(fmtNZ(o.start) + "–" + fmt(o.end));
    else if (o.start) meta.push("from " + fmt(o.start));
    else meta.push("during store hours");
    if (o.mode) meta.push(MODE[o.mode] || o.mode);
    meta.push(worthText(o));
    if (o.guard_reserve === "yes") meta.push("Guard/Reserve named"); else if (o.guard_reserve === "unclear") meta.push("Guard/Reserve not named");
    if (o.spouse === "yes") meta.push("spouse too");
    const pinSpec = S.pinned[o.id];
    const pinned = !!pinSpec;
    const pinnedPlace = pinSpec && typeof pinSpec === "object" && pinSpec.placeId ? placesById[pinSpec.placeId] : null;
    const pinnedMin = pinSpec && typeof pinSpec === "object" && pinSpec.targetMin !== null && pinSpec.targetMin !== undefined ? pinSpec.targetMin : null;
    const pinLabel = !pinned ? "☆ Must do" : "★ Must do" +
      (pinnedPlace ? " (" + pinnedPlace.address.split(",")[0] + ")" : "") +
      (pinnedMin !== null ? " ~" + fmt(localMs(pinnedMin)) : "");
    const card = h("article", { class: "card deal" + (reason ? " out" : "") },
      h("div", { class: "deal-head" }, h("h3", { class: "deal-name" }, o.brand),
        h("button", { type: "button", class: "btn btn-quiet btn-small", "aria-pressed": pinned ? "true" : "false",
          title: "Must do: always on your route when it fits",
          onclick: () => { if (S.pinned[o.id]) delete S.pinned[o.id]; else S.pinned[o.id] = true; save(); renderAll(); } },
          pinLabel)),
      h("p", { class: "deal-chips" }, ...chips(o)),
      h("p", { class: "deal-offer" }, o.offer),
      h("p", { class: "deal-meta" }, meta.join(" · ")),
      // Kept in sight, not folded: the drive-safe line on every bar (8 Nov 2026) and sign-ups needed ahead.
      o.category === "bar" ? h("p", { class: "note drive-safe" }, driveSafe()) : null,
      o.advance ? h("p", { class: "note" }, "Sign up first: " + o.advance) : null,
      reason ? h("p", { class: "note" }, "Not suggested: " + reason + ".") : null);
    const locs = h("ul", { class: "locs" }, places.map(({ p, info }, idx) => {
      const c = cands && cands.find((x) => x.place.id === p.id);
      const isClosest = places.length > 1 && idx === 0;
      const distText = (isClosest ? "★ Closest · " : "") + info.dMin + " min drive (" + info.miles + " mi)";
      return h("li", null,
        h("span", null,
          p.address + (p.verified === "unverified" ? " (location not verified)" : ""),
          " ",
          h("span", { class: "loc-meta" + (isClosest ? " closest" : "") }, distText)),
        h("span", { class: "links" },
          h("button", { type: "button", class: "btn btn-quiet btn-small", onclick: () => {
            delete S.vetoed[o.id]; delete S.strikes[o.id];
            if (!c) S.pinned[o.id] = { placeId: p.id, targetMin: null };
            focus = p.id; save(); location.hash = "#route"; renderAll();
            toast(o.brand + " (" + p.address.split(",")[0] + ") set as next stop.");
          } }, "Go here next"),
          makeSchedSelect(o, p),
          mapBtn(p),
          ext("https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=" + p.lat + "," + p.lng, "Directions", "btn btn-quiet btn-small"),
          callBtn(p)));
    }));
    const n = (o.sources || []).length;
    const closestHint = places.length ? " · closest " + places[0].info.dMin + " min away" : "";
    card.append(h("details", { class: "deal-more fold", open: openDeals.has(o.id) || !!q || pinned, ontoggle: (ev) => { if (ev.target.open) openDeals.add(o.id); else openDeals.delete(o.id); } },
      h("summary", null, "Details · " + (places.length === 1 ? "1 location" : places.length + " locations") + closestHint + " · " + n + (n === 1 ? " source" : " sources")),
      o.proof && o.proof.length ? h("p", { class: "note" }, "Bring: " + o.proof.map(E.proofLabel).join(" or ")) : null,
      o.voucher_use_by ? h("p", { class: "note" }, "Use the card or voucher by " + o.voucher_use_by + ".") : null,
      o.limits ? h("p", { class: "note" }, o.limits) : null,
      o.notes ? h("p", { class: "note" }, o.notes) : null,
      locs,
      h("p", { class: "note" }, GRADE_LONG[o.grade]),
      h("ul", { class: "srcs" }, (o.sources || []).map((s) => h("li", null, srcItem(s), s.published ? " · " + s.published : ""))),
      h("p", { class: "deal-actions" }, S.vetoed[o.id]
        ? h("button", { type: "button", class: "btn btn-quiet btn-small", onclick: () => { delete S.vetoed[o.id]; delete S.strikes[o.id]; save(); renderAll(); } }, "Allow again")
        : h("button", { type: "button", class: "btn btn-quiet btn-small", onclick: () => never(o) }, "Never this one"))));
    return card;
  }
  // A source with no link (the site is gone or unsafe) is cited as text.
  const srcItem = (s) => (s.url ? ext(s.url, s.publisher || s.url) : h("span", null, s.publisher || "Unnamed source"));
  // Under Deals, off the route: other days and region-wide perks, then places with a deal in earlier years only.
  function renderExtras() {
    const other = data.other || [], leads = data.leads || [];
    clear($("#other"));
    other.forEach((x) => $("#other").append(h("li", null,
      h("p", null, h("b", null, x.name), " ", h("span", { class: "grade grade-" + x.grade, title: GRADE_LONG[x.grade] }, GRADE[x.grade])),
      h("p", { class: "deal-meta" }, x.day + (x.at ? ", " + fmt(Date.parse(x.at)) : "") + " · " + x.where),
      h("p", null, x.offer),
      x.note ? h("p", { class: "note" }, x.note) : null,
      x.sources && x.sources.length ? h("p", { class: "note" }, "Sources: ", x.sources.map((s, i) => [i ? " · " : "", srcItem(s)])) : null)));
    $("#other-wrap").hidden = !other.length;
    $("#other-n").textContent = "(" + other.length + ")";
    $("#leads-n").textContent = String(leads.length);
    clear($("#leads"));
    leads.forEach((l) => $("#leads").append(h("li", null,
      h("p", null, h("b", null, l.name), l.area ? " · " + l.area : ""),
      h("p", null, l.offer + " (" + (/^\d{4}$/.test(l.last_seen) ? "last seen " + l.last_seen : l.last_seen) + ")"),
      h("p", { class: "links" },
        ext("https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(l.q), "Find it to call", "btn btn-quiet btn-small"),
        l.source ? h("span", { class: "note" }, "Source: ", srcItem(l.source)) : null))));
    $("#leads-wrap").hidden = !leads.length;
  }
  function renderChips() {
    const box = clear($("#chips"));
    S.qfilters = S.qfilters || {};
    const QUICKS = [
      ["openNow", "● Open right now"],
      ["ticket", "Ticket for later"],
      ["spouse", "Spouse too"]
    ];
    QUICKS.forEach(([k, label]) => box.append(h("button", { type: "button", class: "chip chip-quick", "aria-pressed": S.qfilters[k] ? "true" : "false",
      onclick: () => { S.qfilters[k] = !S.qfilters[k]; save(); renderChips(); renderDeals(); } }, label)));
    CATS.forEach(([c, label]) => box.append(h("button", { type: "button", class: "chip", "aria-pressed": S.cats[c] ? "true" : "false",
      onclick: () => { S.cats[c] = !S.cats[c]; save(); renderChips(); renderDeals(); } }, label)));
  }

  // ---------------------------------------------------------------- Me
  function timeOptions(sel, from, to, step, value, extra) {
    clear(sel);
    if (extra) sel.append(h("option", { value: extra[0] }, extra[1]));
    for (let m = from; m <= to; m += step) sel.append(h("option", { value: m }, fmt(localMs(m))));
    if (value !== undefined) sel.value = String(value);
  }
  function renderMe() {
    const f = $("#me-form"), p = S.profile;
    f.querySelectorAll("input[name=status]").forEach((r) => { r.checked = r.value === p.status; });
    f.spouse.checked = !!p.spouse;
    f.kids.value = String(p.kids || 0);
    f.querySelectorAll("input[name=proof]").forEach((x) => { x.checked = !!p.proof[x.value]; });
    f.mealsMax.value = String(p.mealsMax);
    f.pace.value = p.pace;
    f.roads.value = p.roads;
    timeOptions($("#me-dayend"), 12 * 60, 23 * 60 + 30, 30, p.dayEndMin);
    const rf = $("#ready-fs");
    rf.querySelectorAll("label, p").forEach((x) => x.remove());
    const adv = data.offers.filter((o) => o.advance);
    if (!adv.length) rf.append(h("p", { class: "note" }, "No deal needs a sign-up ahead."));
    adv.forEach((o) => {
      const box = h("input", { type: "checkbox" });
      box.checked = !!p.ready[o.id];
      box.addEventListener("change", () => { if (box.checked) p.ready[o.id] = true; else delete p.ready[o.id]; save(); renderAll(); });
      rf.append(h("label", null, box, " " + o.brand + ": " + o.advance));
    });
    const blocks = clear($("#blocks"));
    if (!p.blocks.length) blocks.append(h("p", { class: "note" }, "None. The plan treats the whole day as free."));
    p.blocks.forEach((b, i) => blocks.append(h("div", { class: "block-row" },
      h("span", null, fmtNZ(localMs(b.from)) + "–" + fmt(localMs(b.to))),
      h("button", { type: "button", class: "btn btn-quiet btn-small", onclick: () => { p.blocks.splice(i, 1); save(); renderAll(); } }, "Remove"))));
    const prefs = clear($("#prefs"));
    LIKES.forEach(([c, label]) => {
      const cur = likeOf(c), learned = S.learned[c] || 1;
      const seg = h("span", { class: "seg", role: "group", "aria-label": label });
      [[1.5, "Love"], [1, "Fine"], [0, "Off"]].forEach(([w, t]) => seg.append(h("button", { type: "button", "aria-pressed": cur === w ? "true" : "false",
        onclick: () => { S.prefs[c] = w; save(); renderAll(); } }, t)));
      prefs.append(h("div", { class: "pref" }, h("span", { class: "pref-name" }, label), seg,
        Math.abs(learned - 1) > 0.01 ? h("span", { class: "pref-learn" }, "Learned from you: ×" + learned.toFixed(2)) : null));
    });
    renderMine();
  }
  function renderMine() {
    const box = clear($("#mine")), done = Object.entries(S.done).sort((a, b) => a[1].t - b[1].t);
    let total = 0;
    const list = h("ul", { class: "mine-list" });
    done.forEach(([id, d]) => {
      const o = offersById[id];
      if (!o) return;
      const v = d.r === "worked" ? o.value * (S.profile.spouse && o.spouse === "yes" ? 2 : 1) : 0;
      total += v;
      list.append(h("li", null, h("span", null, fmtNZ(d.t) + " · " + o.brand + (d.r === "worked" ? " · got it" : " · turned away")),
        h("button", { type: "button", class: "btn btn-quiet btn-small", onclick: () => { delete S.done[id]; if (d.place) delete S.away[d.place]; save(); renderAll(); } }, "Undo")));
    });
    if (!done.length) box.append(h("p", { class: "note" }, "Nothing yet. Mark each stop \"Got it\" or \"Turned away\" and it shows here."));
    else box.append(h("p", { class: "total" }, "About " + money(total) + " in deals so far"), list);
    const vet = clear($("#vetoes"));
    Object.keys(S.vetoed).forEach((id) => {
      const o = offersById[id];
      if (o) vet.append(h("li", { class: "block-row" }, h("span", null, o.brand),
        h("button", { type: "button", class: "btn btn-quiet btn-small", onclick: () => { delete S.vetoed[id]; delete S.strikes[id]; save(); renderAll(); } }, "Allow again")));
    });
    $("#vetoes-n").textContent = "(" + vet.children.length + ")";
    if (!vet.children.length) vet.append(h("li", { class: "note" }, "None."));
    const com = $("#community");
    if (shared.community && shared.community.worked) {
      com.textContent = "Today veterans using this planner, in every area, reported " + shared.community.worked + " deals honoured, worth about " +
        money(shared.community.value || 0) + ". Updated " + fmt(shared.at) + ".";
    } else if (shared.ok === false) com.textContent = "Shared reports can't be reached right now. Your own marks still work.";
  }
  function bindMe() {
    const f = $("#me-form"), p = S.profile;
    f.addEventListener("change", (ev) => {
      const t = ev.target;
      if (t.name === "status") p.status = t.value;
      else if (t.name === "spouse") p.spouse = t.checked;
      else if (t.name === "kids") p.kids = Number(t.value);
      else if (t.name === "proof") { if (t.checked) p.proof[t.value] = true; else delete p.proof[t.value]; }
      else if (t.name === "mealsMax") p.mealsMax = Number(t.value);
      else if (t.name === "pace") p.pace = t.value;
      else if (t.name === "roads") p.roads = t.value;
      else if (t.name === "dayEnd") p.dayEndMin = Number(t.value);
      else return;
      save(); renderAll();
    });
    timeOptions($("#block-from"), 6 * 60, 22 * 60, 15, 11 * 60);
    timeOptions($("#block-to"), 6 * 60, 23 * 60, 15, 12 * 60);
    $("#block-add").addEventListener("click", () => {
      const a = Number($("#block-from").value), b = Number($("#block-to").value);
      if (b <= a) { toast("The end has to be after the start."); return; }
      p.blocks.push({ from: a, to: b }); p.blocks.sort((x, y) => x.from - y.from); save(); renderAll();
    });
    $("#reset").addEventListener("click", () => {
      if (!window.confirm("Clear your settings, history and start point from this phone?")) return;
      try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
      location.reload();
    });
  }

  // ---------------------------------------------------------------- Map (Leaflet loads on first visit)
  function loadLeaflet() {
    if (mapReady) return mapReady;
    mapReady = new Promise((resolve, reject) => {
      document.head.append(h("link", { rel: "stylesheet", href: "vendor/leaflet/leaflet.css" }));
      const s = h("script", { src: "vendor/leaflet/leaflet.js" });
      s.addEventListener("load", resolve);
      s.addEventListener("error", reject);
      document.body.append(s);
    });
    return mapReady;
  }
  function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  async function renderMap() {
    try { await loadLeaflet(); } catch (e) { clear($("#map")).append(h("p", { class: "empty" }, "The map couldn't load. Every deal is under Deals.")); return; }
    const L = window.L;
    if (!map) {
      map = L.map("map", { zoomControl: true }).setView(AREA && AREA.center ? AREA.center : [46.862, -96.82], AREA && AREA.zoom ? AREA.zoom : 12);
      // OpenStreetMap's own tiles (free with credit, light use); app.css darkens them in dark mode.
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19, attribution: "© <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors"
      }).addTo(map);
      map.createPane("vdroute"); // the route line: over the store dots, under the numbered stops (app.css)
      routeLayer = L.layerGroup([], { attribution: "Routes: OSRM" }).addTo(map);
      roadLines = R.create({ fetch: (u, o) => fetch(u, o), onUpdate: () => { if (currentTab() === "map") drawRoute(); } });
      mapLayer = L.layerGroup().addTo(map);
      map.on("click", (ev) => {
        if (!picking) return;
        picking = false;
        S.starts[areaId] = { lat: Math.round(ev.latlng.lat * 1e5) / 1e5, lng: Math.round(ev.latlng.lng * 1e5) / 1e5 };
        save(); toast("Start point set. It stays on this phone."); location.hash = "#route"; renderAll();
      });
    }
    map.invalidateSize();
    mapLayer.clearLayers();
    const r = buildRoute(), t = r.t, where = r.where, ctx = r.ctx, plan = r.plan;
    const best = plan.steps[0];
    const now_ = css("--now"), later = css("--later"), ring = css("--ring");
    const byPlace = {};
    ctx.cands.forEach((c) => {
      const isNow = c.open <= t, col = isNow ? now_ : later, hollow = c.offer.grade === "C";
      const m = L.circleMarker([c.place.lat, c.place.lng], { radius: 8, color: hollow ? col : ring, weight: hollow ? 3 : 2,
        fillColor: col, fillOpacity: hollow ? 0 : 0.95 });
      m.bindPopup(popup(c));
      m.addTo(mapLayer);
      byPlace[c.place.id] = m;
    });
    plan.steps.forEach((x, i) => {
      const m = L.marker([x.c.place.lat, x.c.place.lng], { icon: L.divIcon({ className: "vd-num", html: h("span", null, String(i + 1)), iconSize: [24, 24] }),
        title: (i + 1) + ". " + x.c.offer.brand, keyboard: false }).bindPopup(popup(x.c)).addTo(mapLayer);
      byPlace[x.c.place.id] = m;
    });
    if (best) {
      const m = L.circleMarker([best.c.place.lat, best.c.place.lng], { radius: 12, color: css("--ink"), weight: 3,
        fillColor: css("--mark"), fillOpacity: 1 }).bindPopup(popup(best.c)).addTo(mapLayer);
      byPlace[best.c.place.id] = m;
    }
    if (where.kind !== "center") L.circleMarker([where.pos.lat, where.pos.lng], { radius: 6, color: ring, weight: 2,
      fillColor: css("--focus"), fillOpacity: 1 }).bindTooltip(where.kind === "gps" ? "You" : "Your start").addTo(mapLayer);
    shownRoute = { stops: plan.steps.map((x) => x.c.place), where };
    drawRoute();
    roadLines.want(shownRoute.stops); // stores only: never where you are
    if (mapFocusPlaceId) {
      const targetId = mapFocusPlaceId;
      mapFocusPlaceId = null;
      fitRoute = false;
      const pl = placesById[targetId];
      if (pl) {
        map.setView([pl.lat, pl.lng], 15, { animate: false });
        if (!byPlace[targetId]) {
          const o = offersById[pl.offer];
          if (o) {
            const fakeCand = { offer: o, place: pl, open: Math.max(o.start || 0, pl.open), close: Math.min(o.end || Infinity, pl.close) };
            byPlace[targetId] = L.circleMarker([pl.lat, pl.lng], { radius: 9, color: ring, weight: 2, fillColor: later, fillOpacity: 0.9 })
              .bindPopup(popup(fakeCand)).addTo(mapLayer);
          }
        }
        if (byPlace[targetId]) byPlace[targetId].openPopup();
      }
    } else if (fitRoute) {
      fitRoute = false;
      const pts = shownRoute.stops.map((s) => [s.lat, s.lng]);
      if (where.kind === "start") pts.push([where.pos.lat, where.pos.lng]);
      if (pts.length) map.fitBounds(L.latLngBounds(pts),
        { paddingTopLeft: [52, 28], paddingBottomRight: [28, 28], maxZoom: 15, animate: false });
    }
  }
  // The route line: along the roads between stores once OSRM's shapes are in, straight until then. The leg from you
  // to the first stop is always straight and drawn here, on the phone, so your position and start point are never sent.
  function drawRoute() {
    if (!routeLayer || !shownRoute) return;
    const L = window.L, { stops, where } = shownRoute;
    routeLayer.clearLayers();
    const draw = (pts, road) => {
      const kind = road ? " vd-road" : " vd-straight";
      L.polyline(pts, { pane: "vdroute", interactive: false, className: "vd-halo" + kind }).addTo(routeLayer);
      L.polyline(pts, { pane: "vdroute", interactive: false, className: "vd-line" + kind }).addTo(routeLayer);
    };
    if (stops.length && where.kind !== "center") draw([[where.pos.lat, where.pos.lng], [stops[0].lat, stops[0].lng]], false);
    roadLines.lines(stops).forEach((ln) => draw(ln.pts, ln.road));
  }
  function popup(c) {
    return h("div", { class: "vd-pop" }, h("b", null, c.offer.brand), h("span", null, c.offer.offer),
      h("span", { class: "note" }, c.place.address),
      h("span", { class: "note" }, windowText(c) + " · " + GRADE[c.offer.grade]),
      h("div", { class: "links" },
        h("button", { type: "button", class: "btn btn-small", onclick: () => { focus = c.place.id; location.hash = "#route"; renderAll(); } }, "Go here next"),
        makeSchedSelect(c.offer, c.place),
        ext("https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=" + c.place.lat + "," + c.place.lng, "Directions", "btn btn-quiet btn-small"),
        callBtn(c.place)));
  }

  // ---------------------------------------------------------------- weather (NWS) and the get-ready list
  async function weather() {
    if (!data.meta.forecast_url) return;
    try {
      const r = await fetch(data.meta.forecast_url, { headers: { Accept: "application/geo+json" } });
      if (!r.ok) throw new Error(r.status);
      const j = await r.json(), day = new Date(dayStart + 12 * HOUR).toISOString().slice(0, 10);
      const ps = (j.properties && j.properties.periods || []).filter((p) => p.startTime && new Date(p.startTime).getTime() >= dayStart && new Date(p.startTime).getTime() < dayStart + 24 * HOUR);
      if (!ps.length) return;
      const text = ps.map((p) => p.name + ": " + p.shortForecast + ", " + (p.isDaytime ? "high " : "low ") + p.temperature + "°" + p.temperatureUnit +
        (p.windSpeed ? ", wind " + p.windDirection + " " + p.windSpeed : "")).join(". ");
      wxSlick = ps.some((p) => /snow|sleet|freezing|ice|wintry/i.test(p.shortForecast + " " + (p.detailedForecast || "")));
      const box = clear($("#wx"));
      box.append(h("b", null, "NWS forecast for " + (AREA ? AREA.wx_name : "Fargo") + ", " + day.slice(8) + " Nov. "), text + ".",
        data.meta.sunset ? " Sunset " + fmt(Date.parse(data.meta.sunset)) + "." : "",
        wxSlick ? h("span", null, " Snow or ice is possible, so drive times are stretched (change under Me).") : "");
      box.hidden = false;
      renderAll();
    } catch (e) { /* the forecast is a nice-to-have */ }
  }
  function renderReady() {
    const ul = clear($("#ready-list"));
    ul.append(h("li", null, "Bring your military ID, CAC, DD-214 or VA card. Some places take a photo in uniform."));
    data.offers.filter((o) => o.advance).forEach((o) => ul.append(h("li", null, o.brand + ": " + o.advance)));
    ul.append(h("li", null, "Set where you'll start (home) with \"Pick a start on the map\", and add busy times under Me."));
    ul.append(h("li", null, "Pin your must-dos under Deals. Mark anything you'd never do with \"Never this one\"."));
    ul.append(h("li", null, "Deals marked \"not confirmed\" are from earlier years: call before you go."));
    ul.append(h("li", null, "Charge your phone. On the day, tap \"Got it\" or \"Turned away\" at each stop: it re-plans and tells other veterans."));
  }

  // ---------------------------------------------------------------- shell
  let toastTimer = null;
  function toast(text) {
    const el = $("#toast");
    el.textContent = text; el.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 4000);
  }
  function renderClock() {
    const m = mode(), el = $("#clock");
    $("#preview").hidden = m !== "preview";
    $("#over").hidden = m !== "over";
    if (m === "preview") {
      el.textContent = "Preview. Times are shown in " + T.zoneLabel() + ".";
    } else if (m === "live") el.textContent = "Now " + fmt(now()) + (shared.ok === false ? " · shared reports offline" : "");
    else el.textContent = "Veterans Day 2026 is over. Thank you.";
  }
  function currentTab() {
    const t = (location.hash || "#route").slice(1);
    return ["route", "map", "deals", "me"].includes(t) ? t : "route"; // old links to #next and #plan land on the route
  }
  function renderAll() {
    clearPreviewMarks();
    renderClock();
    const tab = currentTab();
    if (tab === "map" && lastTab !== "map") fitRoute = true;
    const switched = lastTab !== null && tab !== lastTab;
    lastTab = tab;
    document.querySelectorAll(".tab").forEach((a) => { if (a.dataset.tab === tab) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    document.querySelectorAll(".panel").forEach((p) => { p.hidden = p.id !== "tab-" + tab; });
    if (tab === "route") renderRoute();
    else if (tab === "deals") renderDeals();
    else if (tab === "me") renderMe();
    else if (tab === "map") renderMap();
    if (tab !== "map" && roadLines) roadLines.want([]); // ask OSRM for nothing while the Map is hidden
    // A new tab opens at its top, just under the sticky tabs, not wherever the last one was scrolled to.
    if (switched) {
      const top = $("#main").getBoundingClientRect().top + window.scrollY - $(".tabs").offsetHeight;
      if (window.scrollY > top) window.scrollTo(0, top);
    }
  }

  function startGps() {
    if (!navigator.geolocation) { toast("This browser can't share a location. Pick a start on the map."); return; }
    live.watch = navigator.geolocation.watchPosition((p) => {
      const pos = { lat: p.coords.latitude, lng: p.coords.longitude };
      const moved = !live.last || E.km(live.last, pos) > 0.15;
      live.pos = pos; live.acc = p.coords.accuracy; live.at = Date.now();
      if (moved) { live.last = pos; renderAll(); } else renderLoc(position());
    }, (err) => {
      if (live.watch !== null) navigator.geolocation.clearWatch(live.watch);
      live.watch = null;
      S.gps = false; save();
      toast(err.code === 1 ? "Location is blocked for this site. Pick a start on the map instead." : "Couldn't get your location. Pick a start on the map.");
      renderAll();
    }, { enableHighAccuracy: true, maximumAge: 30000, timeout: 20000 });
    S.gps = true; save();
  }
  function stopGps() {
    if (live.watch !== null) navigator.geolocation.clearWatch(live.watch);
    live.watch = null; live.pos = null; S.gps = false; save(); renderAll();
  }

  function bindRoute() {
    $("#rb").addEventListener("submit", (ev) => ev.preventDefault());
    $("#goal-kind").addEventListener("click", (ev) => {
      const b = ev.target.closest("button");
      if (!b) return;
      S.goal = b.dataset.kind === "best" || b.dataset.kind === "optimal" ? b.dataset.kind : S.maxGoal || "both";
      S.goalSet = true;
      save(); renderAll();
    });
    $("#goal-max").addEventListener("click", (ev) => {
      const b = ev.target.closest("button");
      if (!b) return;
      S.goal = S.maxGoal = b.dataset.goal;
      S.goalSet = true;
      save(); renderAll();
    });
    timeOptions($("#rb-leave"), 5 * 60, 21 * 60, 30, S.leaveMin === null ? "now" : S.leaveMin, ["now", "Now"]);
    $("#rb-leave").addEventListener("change", (ev) => { S.leaveMin = ev.target.value === "now" ? null : Number(ev.target.value); save(); renderAll(); });
    timeOptions($("#rb-end"), 12 * 60, 23 * 60 + 30, 30, S.profile.dayEndMin);
    $("#rb-end").addEventListener("change", (ev) => { S.profile.dayEndMin = Number(ev.target.value); save(); renderAll(); });
    $("#rb-togo").addEventListener("change", (ev) => { S.profile.togo = ev.target.checked; save(); renderAll(); });
  }

  function wire() {
    window.addEventListener("hashchange", renderAll);
    $("#loc-gps").addEventListener("click", () => (live.watch !== null ? stopGps() : startGps()));
    $("#loc-map").addEventListener("click", () => { picking = true; location.hash = "#map"; toast("Tap the map where you'll start."); });
    timeOptions($("#preview-time"), 5 * 60, 22 * 60, 30, S.previewMin);
    $("#preview-time").addEventListener("change", (ev) => { S.previewMin = Number(ev.target.value); save(); renderAll(); });
    bindRoute();
    if ($("#route-q")) $("#route-q").addEventListener("input", () => renderRouteSearch(context(leaveAt(), position().pos)));
    $("#q").addEventListener("input", renderDeals);
    $("#sort").addEventListener("change", renderDeals);
    $("#deals-more").addEventListener("click", () => { dealsShown = Infinity; renderDeals(); });
    // Printing the route shows every stop and its address: list them all and open the folded stops first.
    window.addEventListener("beforeprint", () => {
      if (currentTab() === "route") { allStops = true; renderRoute(); }
      document.querySelectorAll("details.stop-d").forEach((d) => { d.open = true; });
    });
    $("#tip-form").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const f = ev.target, msg = $("#tip-msg");
      const body = Object.fromEntries(["name", "address", "offer", "when", "source"].map((k) => [k, f[k].value.trim()]));
      body.address = [body.address, "(" + AREA.name + ")"].filter(Boolean).join(" "); // which area the tip is for
      if (!API) { msg.textContent = "Tips aren't open yet. Email support@theintelligence.company instead."; return; }
      try {
        const r = await fetch(API + "/v1/tip", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        msg.textContent = r.ok ? "Thanks. We'll check it and add it if it holds up." : r.status === 429 ? "That's a lot of tips from this phone today. Email us instead." : "That didn't send. Try again, or email support@theintelligence.company.";
        if (r.ok) f.reset();
      } catch (e) { msg.textContent = "No connection. Try again in a minute."; }
    });
    bindMe();
    T.mountSettings($("#time-settings"));
    T.onChange(renderAll);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) { pull(); renderAll(); } });
    setInterval(() => { if (!document.hidden) renderAll(); }, 30000);
    setInterval(() => { if (!document.hidden) { sync(); pull(); } }, 60000);
  }

  // ---------------------------------------------------------------- areas
  const AREA_STARTS = {
    "fargo-moorhead": [
      ["", "Start from town…"],
      ["46.8600,-96.8100", "Fargo (13th Ave S)"],
      ["46.8772,-96.7898", "Downtown Fargo"],
      ["46.8750,-96.9004", "West Fargo"],
      ["46.8739,-96.7678", "Moorhead, MN"]
    ],
    "bismarck-mandan": [
      ["", "Start from town…"],
      ["46.8439,-101.4118", "New Salem, ND"],
      ["46.8267,-100.8896", "Mandan, ND"],
      ["46.8083,-100.7837", "Bismarck, ND"]
    ],
    "twin-cities": [
      ["", "Start from town…"],
      ["45.0105,-93.4555", "Plymouth, MN"],
      ["45.1095,-93.4558", "Maple Grove, MN"],
      ["45.0119,-93.1669", "Roseville, MN"]
    ],
    "reston-va": [
      ["", "Start from town…"],
      ["38.9586,-77.3570", "Reston Town Center, VA"],
      ["38.9369,-77.3315", "South Reston (South Lakes), VA"],
      ["38.9698,-77.3861", "Herndon, VA"],
      ["39.0150,-77.4250", "Sterling / Dulles, VA"],
      ["38.9187,-77.2225", "Tysons, VA"],
      ["38.8543,-77.3106", "Fairfax, VA"]
    ],
    "reno-sparks": [
      ["", "Start from town…"],
      ["39.5251,-119.8126", "Downtown Reno, NV"],
      ["39.5146,-119.8060", "Midtown Reno, NV"],
      ["39.5401,-119.8630", "Northwest Reno, NV"],
      ["39.5350,-119.7560", "Sparks (Victorian Square), NV"],
      ["39.5321,-119.7225", "Sparks Marina and Legends, NV"],
      ["39.4398,-119.7707", "South Reno (South Meadows), NV"]
    ],
    "fort-meade": [
      ["", "Start from town…"],
      ["39.0840,-76.7000", "Odenton, MD"],
      ["39.1080,-76.7430", "Fort Meade (on post), MD"],
      ["39.0360,-76.6800", "Gambrills / Crofton (Waugh Chapel), MD"],
      ["39.1560,-76.7240", "Hanover / Arundel Mills, MD"],
      ["39.0990,-76.8480", "Laurel, MD"],
      ["39.2150,-76.8600", "Columbia, MD"]
    ],
    "denver": [
      ["", "Start from town…"],
      ["39.7392,-104.9903", "Downtown Denver, CO"],
      ["39.7170,-104.9530", "Cherry Creek, CO"],
      ["39.7294,-104.8319", "Aurora (Anschutz), CO"],
      ["39.7100,-104.7800", "Aurora near Buckley SFB, CO"],
      ["39.7110,-105.0810", "Lakewood (Belmar), CO"],
      ["39.6133,-105.0166", "Littleton, CO"],
      ["39.5480,-104.9690", "Highlands Ranch, CO"],
      ["39.5620,-104.8800", "Lone Tree (Park Meadows), CO"],
      ["39.8367,-105.0372", "Westminster, CO"],
      ["39.8680,-104.9720", "Thornton, CO"],
      ["39.9205,-105.0867", "Broomfield, CO"]
    ],
    "colorado-springs": [
      ["", "Start from town…"],
      ["38.8339,-104.8214", "Downtown Colorado Springs, CO"],
      ["38.9475,-104.7955", "North Springs (Chapel Hills), CO"],
      ["38.8397,-104.7224", "East side, Powers Blvd (Peterson SFB), CO"],
      ["38.7384,-104.8043", "South side, Fort Carson Gate 1, CO"],
      ["39.0917,-104.8727", "Monument, CO"],
      ["38.9333,-104.6086", "Falcon, CO"]
    ]
  };
  // Example text in the Deals search box and the Route quick-add box, from each area's own deals and streets (the publisher,
  // 11 Nov 2026: every area showed Fargo's). tests/veterans.test.js checks each word finds something in its area.
  const AREA_EXAMPLES = {
    "fargo-moorhead": { deals: ["Hornbacher's", "13th Ave", "Moorhead"], route: ["Hornbacher's", "Perkins", "13th Ave"] },
    "bismarck-mandan": { deals: ["Perkins", "Expressway", "Mandan"], route: ["Perkins", "Olive Garden", "Century Ave"] },
    "twin-cities": { deals: ["Caribou", "Lexington Ave", "Maple Grove"], route: ["Caribou", "Perkins", "Wayzata Blvd"] },
    "reston-va": { deals: ["Chick-fil-A", "Leesburg Pike", "Herndon"], route: ["Chick-fil-A", "Wawa", "Sunset Hills"] },
    "reno-sparks": { deals: ["Squeeze In", "Kietzke", "Sparks"], route: ["Squeeze In", "In-N-Out", "McCarran"] },
    "fort-meade": { deals: ["Mission BBQ", "Baltimore Ave", "Columbia"], route: ["Mission BBQ", "Wawa", "Arundel Mills"] },
    "denver": { deals: ["Wings Over", "Colfax", "Aurora"], route: ["Golden Corral", "Wings Over", "Colfax"] },
    "colorado-springs": { deals: ["Golden Corral", "Academy Blvd", "Monument"], route: ["Golden Corral", "Starbucks", "Powers Blvd"] }
  };
  const AREA_ALIASES = {
    "new-salem": "bismarck-mandan",
    "new-salem-bismarck": "bismarck-mandan",
    "bismarck": "bismarck-mandan",
    "mandan": "bismarck-mandan",
    "fargo": "fargo-moorhead",
    "moorhead": "fargo-moorhead",
    "plymouth": "twin-cities",
    "maple-grove": "twin-cities",
    "roseville": "twin-cities",
    "reston": "reston-va",
    "herndon": "reston-va",
    "tysons": "reston-va",
    "fairfax": "reston-va",
    "nova": "reston-va",
    "reno": "reno-sparks",
    "sparks": "reno-sparks",
    "reno-nv": "reno-sparks",
    "washoe": "reno-sparks",
    "meade": "fort-meade",
    "ft-meade": "fort-meade",
    "fort-meade-md": "fort-meade",
    "odenton": "fort-meade",
    "laurel": "fort-meade",
    "columbia": "fort-meade",
    "gambrills": "fort-meade",
    "severn": "fort-meade",
    "aurora": "denver",
    "buckley": "denver",
    "lakewood": "denver",
    "littleton": "denver",
    "lone-tree": "denver",
    "highlands-ranch": "denver",
    "centennial": "denver",
    "westminster": "denver",
    "thornton": "denver",
    "broomfield": "denver",
    "denver-co": "denver",
    "springs": "colorado-springs",
    "cos": "colorado-springs",
    "colorado-springs-co": "colorado-springs",
    "monument": "colorado-springs",
    "falcon": "colorado-springs",
    "fort-carson": "colorado-springs",
    "peterson": "colorado-springs",
    "usafa": "colorado-springs"
  };
  function pickArea() {
    const raw = new URLSearchParams(location.search).get("area") || new URLSearchParams(location.search).get("sector");
    const q = raw ? (AREA_ALIASES[raw.toLowerCase()] || raw.toLowerCase()) : null;
    if (q && AREAS.some((a) => a.id === q)) { S.area = q; save(); return q; } // a shared link: remember it
    return AREAS.some((a) => a.id === S.area) ? S.area : DEFAULT_AREA;
  }
  function wireArea() {
    const sel = $("#area");
    sel.value = areaId;
    sel.addEventListener("change", () => {
      const id = sel.value;
      if (!AREAS.some((a) => a.id === id) || id === areaId) return;
      S.area = id; save();
      const u = new URL(location.href);
      u.searchParams.delete("sector");
      if (id === DEFAULT_AREA) u.searchParams.delete("area"); else u.searchParams.set("area", id);
      if (u.href === location.href) location.reload(); else location.replace(u.href); // load that area's deals
    });
    const preset = $("#loc-preset");
    const opts = AREA_STARTS[areaId];
    if (preset && opts) {
      clear(preset);
      opts.forEach(([val, label]) => preset.append(h("option", { value: val }, label)));
      const cur = S.starts && S.starts[areaId];
      if (cur) {
        const match = opts.find(([val]) => {
          if (!val) return false;
          const [lat, lng] = val.split(",").map(Number);
          return Math.abs(lat - cur.lat) < 0.01 && Math.abs(lng - cur.lng) < 0.01;
        });
        if (match) preset.value = match[0];
      }
      preset.hidden = false;
      preset.addEventListener("change", () => {
        if (!preset.value) return;
        const [lat, lng] = preset.value.split(",").map(Number);
        const label = preset.options[preset.selectedIndex].textContent;
        S.starts[areaId] = { lat, lng };
        save();
        fitRoute = true;
        if (map) map.setView([lat, lng], areaId === "bismarck-mandan" && label.includes("New Salem") ? 10 : AREA.zoom || 12);
        renderAll();
        toast("Start point set to " + label + ".");
      });
    }
  }
  function showArea() {
    document.title = "Veterans Day 2026 in " + AREA.name + " · The Intelligence Company";
    document.querySelectorAll(".area-name").forEach((el) => { el.textContent = AREA.name; });
    $("#drive-safe-transit").textContent = AREA.transit ? ", or " + AREA.transit : "";
    const ex = AREA_EXAMPLES[areaId];
    if (ex) {
      $("#q").placeholder = "Search deals, streets or cities: " + ex.deals.join(", ") + "…";
      if ($("#route-q")) $("#route-q").placeholder = "+ Quick-add a deal or place to your route (e.g. " + ex.route.join(", ") + ")…";
    }
  }

  async function main() {
    S = load();
    areaId = pickArea();
    wireArea();
    const dir = AREAS.find((a) => a.id === areaId).dir;
    try {
      const [d, drive] = await Promise.all([fetch(dir + "deals.json").then((r) => r.json()), fetch(dir + "drive.json").then((r) => r.json())]);
      data = d; data.drive = drive;
    } catch (e) {
      $("#clock").textContent = "The deal list couldn't load. Check your connection and reload.";
      return;
    }
    // Older data files have no region block: they are Fargo-Moorhead's.
    AREA = data.meta.region || { id: DEFAULT_AREA, name: "Fargo-Moorhead", center: [46.86, -96.81], center_label: "the middle of Fargo",
      zoom: 12, wx_name: "Fargo", transit: "ride MATBUS, free with a veteran ID" };
    showArea();
    dayStart = Date.parse(data.meta.day_start);
    data.tzOffsetMin = data.meta.tz_offset_min;
    data.offers.forEach((o) => {
      o.start = o.start ? Date.parse(o.start) : undefined; o.end = o.end ? Date.parse(o.end) : undefined;
      o.arriveBy = o.arrive_by ? Date.parse(o.arrive_by) : undefined; // engine v1.3: a ceremony's start
      offersById[o.id] = o;
    });
    data.places.forEach((p) => { p.open = Date.parse(p.open); p.close = Date.parse(p.close); placesById[p.id] = p; });
    const built = $("#built");
    built.setAttribute("datetime", data.meta.built_at);
    built.textContent = fmt(Date.parse(data.meta.built_at)) + ", " + T.format(new Date(data.meta.built_at), { time: false, year: true });
    document.body.append(h("p", { id: "toast", class: "toast", role: "status", hidden: true }),
      h("p", { id: "announce", class: "sr", "aria-live": "polite" }));
    $(".foot").append(h("span", { id: "newtab", class: "sr" }, "Opens in a new tab")); // inside a landmark, for axe
    wire();
    renderChips();
    renderReady();
    renderExtras();
    if (S.gps) startGps();
    renderAll();
    weather();
    pull();
    sync();
  }
  main();
})();
