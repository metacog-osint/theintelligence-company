/*! Veterans Day 2026 planner · app v1.1 · The Intelligence Company. Load tic-time.js, engine.js and roads.js first.
 *  Everything about the user (settings, history, position) stays in this browser. The only network calls: the
 *  page's own data files, the NWS forecast, the shared field-report service (API below) and, on the Map tab, map tiles
 *  and the road shapes between the stores on your route (roads.js, from OSRM; never your position).
 */
(function () {
  "use strict";
  const E = window.VDEngine, T = window.TicTime, R = window.VDRoads;
  const API = "https://vetday.metacog.workers.dev"; // field-report Worker (veterans-day/worker); "" keeps reports on the phone
  const KEY = "vd2026-v1", MIN = 60000, HOUR = 3600000;
  const CATS = [["breakfast", "Breakfast"], ["meal", "Sit-down meals"], ["quick", "Quick bites"], ["coffee", "Coffee"],
    ["treat", "Treats"], ["bar", "Bars and breweries (21+)"], ["service", "Haircuts and car care"],
    ["shopping", "Shopping discounts"], ["event", "Ceremonies and veterans' posts"]];
  const CAT = Object.fromEntries(CATS);
  // Likes: every category, plus deals that need a purchase (a buy-one-get-one, a percentage off), off unless turned on.
  // Bars are on (8 Nov 2026), with a drive-safe line wherever one shows up.
  const LIKES = CATS.concat([["purchase", "Deals that need a purchase"]]);
  const OFF_BY_DEFAULT = { purchase: true };
  const DRIVE_SAFE = "21 and over. If you drink, don't drive: bring a sober driver, take a cab or rideshare, or ride MATBUS, free with a veteran ID.";
  const likeOf = (c) => (S.prefs[c] === undefined ? (OFF_BY_DEFAULT[c] ? 0 : 1) : S.prefs[c]);
  const likeWord = (w) => (w > 1 ? "Love" : w > 0 ? "Fine" : "Off");
  const GOAL_NAME = { best: "Best for me", stops: "Most stops", savings: "Most savings", both: "Stops + savings" };
  const GOAL_NOTE = {
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
  const CENTER = { lat: 46.8600, lng: -96.8100 }; // 13th Ave S and 25th St, Fargo: used until you set a start

  let data = null, offersById = {}, placesById = {}, dayStart = 0, S = null, wxSlick = false;
  const live = { pos: null, acc: null, at: 0, watch: null, last: null };
  const shared = { events: [], overrides: {}, community: null, at: 0, ok: null };
  let focus = null, picking = false, map = null, mapLayer = null, mapReady = null, lastAnnounce = "";
  let roadLines = null, routeLayer = null, shownRoute = null; // the Map's route line (roads.js)
  let fitRoute = false, lastTab = null; // opening the Map zooms to the route once

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
  const worthText = (o) => (o.value > 0 ? "about " + money(o.value) : o.category === "shopping" ? "a discount" : "free");
  const mins = (m) => (m < 1 ? "under a minute" : m < 60 ? Math.round(m) + " min" : Math.floor(m / 60) + " h " + Math.round(m % 60) + " min");
  const localMs = (minOfDay) => dayStart + minOfDay * MIN;

  // ---------------------------------------------------------------- stored state (this phone only)
  function defaults() {
    return {
      profile: { status: "veteran", spouse: false, kids: 0, proof: { military_id: true }, ready: {}, pace: "balanced",
        dayEndMin: 21 * 60, mealsMax: 2, roads: "auto", blocks: [], togo: false },
      done: {}, away: {}, strikes: {}, vetoed: {}, pinned: {}, prefs: {}, learned: {},
      start: null, gps: false, sent: [], previewMin: 8 * 60, cats: {},
      goal: "best", maxGoal: "both", leaveMin: null // leaveMin: minutes after midnight, or null for "now"
    };
  }
  function load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { s = null; }
    const d = defaults();
    if (!s) return d;
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
    return { done: S.done, away: S.away, strikes: S.strikes, vetoed: S.vetoed, pinned: S.pinned, prefs };
  }
  function engineReports() {
    const r = { place: {}, offer: {} };
    const put = (e) => { (r.place[e.p] = r.place[e.p] || []).push(e); (r.offer[e.o] = r.offer[e.o] || []).push(e); };
    shared.events.forEach(put);
    S.sent.forEach((e) => { if (!e.synced) put(e); });
    return r;
  }
  function position() {
    if (live.pos && Date.now() - live.at < 10 * MIN) return { pos: live.pos, kind: "gps" };
    // Without live location, assume you're still at the stop you last marked, for two hours.
    if (S.last && Math.abs(now() - S.last.t) < 2 * HOUR) return { pos: S.last, kind: "last" };
    if (S.start) return { pos: S.start, kind: "start" };
    return { pos: CENTER, kind: "center" };
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
    if (o.end || c.close - dayStart < 23.5 * HOUR) bits.push((o.end ? "deal ends " : "closes ") + fmt(c.close));
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
  function dirLinks(pl) {
    const ll = pl.lat + "," + pl.lng;
    return h("p", { class: "links" },
      ext("https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=" + ll, "Directions", "btn"),
      ext("https://maps.apple.com/?dirflg=d&daddr=" + ll, "Apple Maps", "btn btn-quiet"),
      pl.phone ? h("a", { class: "btn btn-quiet", href: "tel:" + pl.phone.replace(/[^\d+]/g, "") }, "Call") : null);
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
  function renderRoute() {
    const r = buildRoute(), { ctx, plan, t, where } = r, steps = plan.steps;
    renderLoc(where);
    renderControls();
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
    if (o.category === "bar") card.append(h("p", { class: "note drive-safe" }, DRIVE_SAFE));
    card.append(dirLinks(pl));
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
    if (mode() === "preview") card.append(h("p", { class: "note" }, "Preview: what you mark now stays on this phone and isn't shared."));
    announce((focus ? "Your pick: " : "Next stop: ") + o.brand + ", " + whyBits(s)[0]);
  }

  // How a stop sits in its deal's window: when you'd arrive, when the deal ends, and the time to spare.
  function windowLine(x) {
    const c = x.c, o = c.offer, spare = (c.close - x.arrive) / MIN;
    const ends = o.end || c.close - dayStart < 23.5 * HOUR ? (o.end ? "deal ends " : "closes ") + fmt(c.close) : "open late";
    const bits = ["Arrive " + fmtNZ(x.arrive), ends];
    if (ends !== "open late") bits.push(spare < 60 ? "only " + mins(spare) + " to spare" : mins(spare) + " to spare");
    return h("p", { class: "stop-win" + (spare < 25 ? " tight" : "") }, bits.join(" · "));
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
    steps.slice(1).forEach((x, k) => {
      const c = x.c, o = c.offer, go = Math.max(x.leave, x.start - x.driveMin * MIN);
      if (go - prev > 20 * MIN) list.append(h("li", { class: "gap" }, "Free time " + fmtNZ(prev) + "–" + fmt(go)));
      list.append(h("li", { class: "stop" },
        h("p", { class: "stop-when" }, (k + 2) + ". Leave " + fmtNZ(go) + " · " + mins(x.driveMin - 2.5) + " drive · about " +
          Math.round(o.minutes + x.queueMin) + " min there"),
        h("p", { class: "stop-name" }, h("b", null, o.brand), " · " + o.offer),
        o.ticket ? h("p", { class: "stop-tag" }, h("span", { class: "cat cat-ticket" }, "Ticket for later"), " a quick stop, nothing to eat there") : null,
        windowLine(x),
        windowBar(x, from, to),
        h("p", { class: "note" }, c.place.address + (c.flags.length ? " · " + c.flags.join("; ") : "")),
        h("p", { class: "links" },
          h("button", { type: "button", class: "btn btn-quiet btn-small", onclick: () => { focus = c.place.id; renderAll(); window.scrollTo(0, 0); } }, "Go here first"),
          h("button", { type: "button", class: "btn btn-quiet btn-small", onclick: () => never(o) }, "Not today"),
          ext("https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=" + c.place.lat + "," + c.place.lng, "Directions", "btn btn-quiet btn-small"))));
      prev = x.depart;
    });
    $("#route-wrap").hidden = false;
    $("#route-list").hidden = steps.length < 2;
    const last = steps[steps.length - 1], left = (ctx.dayEnd - last.depart) / MIN, end = $("#route-end");
    if (left < 90) end.textContent = "That fills your day to your done-by time, " + fmt(ctx.dayEnd) + ".";
    else if (ctx.goal === "best") end.textContent = "The route stops at " + fmt(last.depart) + " because nothing else is worth the drive at your pace. Maximize fits in more; so does a faster pace under Me.";
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
    links.append(h("button", { type: "button", class: "btn btn-quiet", onclick: () => window.print() }, "Print"));
  }
  // Deals that end within two hours and aren't on the route, so they don't slip by unnoticed.
  function renderSoon(ctx, plan, t) {
    const box = clear($("#soon")), inRoute = new Set(plan.steps.map((x) => x.c.offer.id)), seen = new Set();
    const st0 = E._internal.startState(ctx, t);
    ctx.cands.filter((c) => !inRoute.has(c.offer.id) && c.close - t < 2 * HOUR)
      .map((c) => ({ c, step: E.evalStop(ctx, st0, c) })).filter((x) => x.step)
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
  }
  function hideLists() { ["#route-wrap", "#alts-wrap", "#soon-wrap"].forEach((s) => { $(s).hidden = true; }); }

  // The route's settings at the top of the page: leave and done-by times, the goal, what you're after, food to go.
  function renderControls() {
    const kind = S.goal === "best" ? "best" : "max";
    $("#goal-kind").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.kind === kind ? "true" : "false"));
    $("#goal-max").hidden = kind !== "max";
    $("#goal-max").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.goal === S.goal ? "true" : "false"));
    $("#goal-note").textContent = GOAL_NOTE[S.goal] || GOAL_NOTE.best;
    $("#rb-leave").value = S.leaveMin === null || S.leaveMin === undefined ? "now" : String(S.leaveMin);
    $("#rb-end").value = String(S.profile.dayEndMin);
    $("#rb-togo").checked = !!S.profile.togo;
    const box = clear($("#likes"));
    LIKES.forEach(([c, label]) => {
      const w = likeOf(c), word = likeWord(w);
      box.append(h("button", { type: "button", class: "like like-" + word.toLowerCase(), "aria-label": label + ": " + word + ". Tap to change.",
        onclick: () => { S.prefs[c] = w > 1 ? 0 : w > 0 ? 1.5 : 1; save(); renderAll(); } },
        h("span", { class: "like-name" }, label), h("span", { class: "like-state" }, word)));
    });
    const love = LIKES.filter(([c]) => likeOf(c) > 1).length, off = LIKES.filter(([c]) => likeOf(c) <= 0).length;
    $("#likes-sum").textContent = "What I'm after" + (love || off ? ": " + [love ? love + " loved" : "", off ? off + " off" : ""].filter(Boolean).join(", ") : "");
  }

  function renderLoc(where) {
    const st = $("#loc-status");
    if (where.kind === "gps") st.textContent = "Using your location" + (live.acc ? " (within " + Math.round(live.acc) + " m)" : "") + ". It stays on this phone.";
    else if (where.kind === "last") st.textContent = "Drive times from " + S.last.name + ", your last stop. Share your location for live directions; it stays on this phone.";
    else if (where.kind === "start") st.textContent = "Drive times from your start point. Share your location for live directions; it stays on this phone.";
    else st.textContent = "Drive times are from the middle of Fargo until you share your location or pick a start. Your location stays on this phone.";
    $("#loc-gps").textContent = live.watch !== null ? "Stop using my location" : "Use my location";
  }

  // ---------------------------------------------------------------- what you did
  function record(c, kind) {
    const t = now(), o = c.offer;
    S.last = { lat: c.place.lat, lng: c.place.lng, name: o.brand, t };
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
  function dealState(ctx) {
    const byOffer = {};
    ctx.cands.forEach((c) => { (byOffer[c.offer.id] = byOffer[c.offer.id] || []).push(c); });
    return byOffer;
  }
  function renderDeals() {
    const ctx = context(now(), position().pos), live = dealState(ctx);
    const q = $("#q").value.trim().toLowerCase(), sort = $("#sort").value;
    const anyCat = CATS.some(([c]) => S.cats[c]);
    let list = data.offers.filter((o) => (!anyCat || S.cats[o.category]) &&
      (!q || (o.brand + " " + o.offer + " " + (CAT[o.category] || "")).toLowerCase().includes(q)));
    const end = (o) => { const cs = live[o.id]; return cs ? Math.min(...cs.map((c) => c.close)) : Infinity; };
    if (sort === "value") list.sort((a, b) => b.value - a.value);
    else if (sort === "name") list.sort((a, b) => a.brand.localeCompare(b.brand));
    else list.sort((a, b) => end(a) - end(b) || b.value - a.value);
    const box = clear($("#deal-list"));
    $("#deals-count").textContent = list.length + " of " + data.offers.length + " deals" + (anyCat || q ? " match" : "") +
      ". Faded ones don't fit you right now; each says why.";
    list.forEach((o) => box.append(dealCard(o, live[o.id], ctx)));
  }
  function dealCard(o, cands, ctx) {
    const places = data.places.filter((p) => p.offer === o.id);
    const reason = cands ? null : (places.map((p) => ctx.excluded[p.id]).find(Boolean) || "not available");
    const meta = [];
    if (o.start && o.end) meta.push(fmtNZ(o.start) + "–" + fmt(o.end));
    else if (o.start) meta.push("from " + fmt(o.start));
    else meta.push("during store hours");
    if (o.mode) meta.push(MODE[o.mode] || o.mode);
    meta.push(worthText(o));
    if (o.guard_reserve === "yes") meta.push("Guard/Reserve named"); else if (o.guard_reserve === "unclear") meta.push("Guard/Reserve not named");
    if (o.spouse === "yes") meta.push("spouse too");
    const card = h("article", { class: "card deal" + (reason ? " out" : "") },
      h("div", { class: "deal-head" }, h("h3", { class: "deal-name" }, o.brand), h("span", null, ...chips(o))),
      h("p", { class: "deal-offer" }, o.offer),
      h("p", { class: "deal-meta" }, meta.join(" · ")),
      o.category === "bar" ? h("p", { class: "note drive-safe" }, DRIVE_SAFE) : null,
      reason ? h("p", { class: "note" }, "Not suggested: " + reason + ".") : null,
      o.proof && o.proof.length ? h("p", { class: "note" }, "Bring: " + o.proof.map(E.proofLabel).join(" or ")) : null,
      o.advance ? h("p", { class: "note" }, "Sign up first: " + o.advance) : null,
      o.voucher_use_by ? h("p", { class: "note" }, "Use the card or voucher by " + o.voucher_use_by + ".") : null,
      o.notes ? h("p", { class: "note" }, o.notes) : null);
    const locs = h("ul", { class: "locs" }, places.map((p) => {
      const c = cands && cands.find((x) => x.place.id === p.id);
      return h("li", null, h("span", null, p.address + (p.verified === "unverified" ? " (location not verified)" : "")),
        h("span", { class: "links" },
          c ? h("button", { type: "button", class: "btn btn-quiet btn-small", onclick: () => { focus = p.id; location.hash = "#route"; renderAll(); } }, "Go here next") : null,
          ext("https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=" + p.lat + "," + p.lng, "Directions", "btn btn-quiet btn-small")));
    }));
    card.append(h("details", null, h("summary", null, places.length === 1 ? "1 location" : places.length + " locations"), locs));
    card.append(h("details", null, h("summary", null, "Sources (" + (o.sources || []).length + ")"),
      h("p", { class: "note" }, GRADE_LONG[o.grade]),
      h("ul", { class: "srcs" }, (o.sources || []).map((s) => h("li", null, srcItem(s),
        s.published ? " · " + s.published : "")))));
    card.append(h("p", { class: "deal-actions" },
      h("button", { type: "button", class: "btn btn-quiet btn-small", "aria-pressed": S.pinned[o.id] ? "true" : "false",
        onclick: () => { if (S.pinned[o.id]) delete S.pinned[o.id]; else S.pinned[o.id] = true; save(); renderAll(); } },
        S.pinned[o.id] ? "★ Must do (pinned)" : "☆ Must do"),
      S.vetoed[o.id]
        ? h("button", { type: "button", class: "btn btn-quiet btn-small", onclick: () => { delete S.vetoed[o.id]; delete S.strikes[o.id]; save(); renderAll(); } }, "Allow again")
        : h("button", { type: "button", class: "btn btn-quiet btn-small", onclick: () => never(o) }, "Never this one")));
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
    if (!vet.children.length) vet.append(h("li", { class: "note" }, "None."));
    const com = $("#community");
    if (shared.community && shared.community.worked) {
      com.textContent = "Today veterans using this reported " + shared.community.worked + " deals honoured, worth about " +
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
      map = L.map("map", { zoomControl: true }).setView([46.862, -96.82], 12);
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
        S.start = { lat: Math.round(ev.latlng.lat * 1e5) / 1e5, lng: Math.round(ev.latlng.lng * 1e5) / 1e5 };
        save(); toast("Start point set. It stays on this phone."); location.hash = "#route"; renderAll();
      });
    }
    map.invalidateSize();
    mapLayer.clearLayers();
    const r = buildRoute(), t = r.t, where = r.where, ctx = r.ctx, plan = r.plan;
    const best = plan.steps[0];
    const now_ = css("--now"), later = css("--later"), ring = css("--ring");
    ctx.cands.forEach((c) => {
      const isNow = c.open <= t, col = isNow ? now_ : later, hollow = c.offer.grade === "C";
      const m = L.circleMarker([c.place.lat, c.place.lng], { radius: 8, color: hollow ? col : ring, weight: hollow ? 3 : 2,
        fillColor: col, fillOpacity: hollow ? 0 : 0.95 });
      m.bindPopup(popup(c));
      m.addTo(mapLayer);
    });
    plan.steps.forEach((x, i) => {
      L.marker([x.c.place.lat, x.c.place.lng], { icon: L.divIcon({ className: "vd-num", html: h("span", null, String(i + 1)), iconSize: [24, 24] }),
        title: (i + 1) + ". " + x.c.offer.brand, keyboard: false }).bindPopup(popup(x.c)).addTo(mapLayer);
    });
    if (best) L.circleMarker([best.c.place.lat, best.c.place.lng], { radius: 12, color: css("--ink"), weight: 3,
      fillColor: css("--mark"), fillOpacity: 1 }).bindPopup(popup(best.c)).addTo(mapLayer);
    if (where.kind !== "center") L.circleMarker([where.pos.lat, where.pos.lng], { radius: 6, color: ring, weight: 2,
      fillColor: css("--focus"), fillOpacity: 1 }).bindTooltip(where.kind === "gps" ? "You" : "Your start").addTo(mapLayer);
    shownRoute = { stops: plan.steps.map((x) => x.c.place), where };
    drawRoute();
    roadLines.want(shownRoute.stops); // stores only: never where you are
    // Opening the Map zooms to the route's stores (not to your position). After that the view is yours: the
    // 30-second refresh and re-plans don't move it.
    if (fitRoute) {
      fitRoute = false;
      if (shownRoute.stops.length) map.fitBounds(L.latLngBounds(shownRoute.stops.map((s) => [s.lat, s.lng])),
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
      h("span", { class: "note" }, windowText(c) + " · " + GRADE[c.offer.grade]),
      h("button", { type: "button", class: "btn btn-small", onclick: () => { focus = c.place.id; location.hash = "#route"; renderAll(); } }, "Go here next"));
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
      box.append(h("b", null, "NWS forecast for Fargo, " + day.slice(8) + " Nov. "), text + ".",
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
    $("#ready").open = mode() === "preview";
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
      $("#preview-when").textContent = "Wednesday at " + fmt(now());
    } else if (m === "live") el.textContent = "Now " + fmt(now()) + (shared.ok === false ? " · shared reports offline" : "");
    else el.textContent = "Veterans Day 2026 is over. Thank you.";
  }
  function currentTab() {
    const t = (location.hash || "#route").slice(1);
    return ["route", "map", "deals", "me"].includes(t) ? t : "route"; // old links to #next and #plan land on the route
  }
  function renderAll() {
    renderClock();
    const tab = currentTab();
    if (tab === "map" && lastTab !== "map") fitRoute = true;
    lastTab = tab;
    document.querySelectorAll(".tab").forEach((a) => { if (a.dataset.tab === tab) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    document.querySelectorAll(".panel").forEach((p) => { p.hidden = p.id !== "tab-" + tab; });
    if (tab === "route") renderRoute();
    else if (tab === "deals") renderDeals();
    else if (tab === "me") renderMe();
    else if (tab === "map") renderMap();
    if (tab !== "map" && roadLines) roadLines.want([]); // ask OSRM for nothing while the Map is hidden
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
      S.goal = b.dataset.kind === "best" ? "best" : S.maxGoal || "both";
      save(); renderAll();
    });
    $("#goal-max").addEventListener("click", (ev) => {
      const b = ev.target.closest("button");
      if (!b) return;
      S.goal = S.maxGoal = b.dataset.goal;
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
    $("#q").addEventListener("input", renderDeals);
    $("#sort").addEventListener("change", renderDeals);
    $("#tip-form").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const f = ev.target, msg = $("#tip-msg");
      const body = Object.fromEntries(["name", "address", "offer", "when", "source"].map((k) => [k, f[k].value.trim()]));
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

  async function main() {
    S = load();
    try {
      const [d, drive] = await Promise.all([fetch("data/deals.json").then((r) => r.json()), fetch("data/drive.json").then((r) => r.json())]);
      data = d; data.drive = drive;
    } catch (e) {
      $("#clock").textContent = "The deal list couldn't load. Check your connection and reload.";
      return;
    }
    dayStart = Date.parse(data.meta.day_start);
    data.tzOffsetMin = data.meta.tz_offset_min;
    data.offers.forEach((o) => { o.start = o.start ? Date.parse(o.start) : undefined; o.end = o.end ? Date.parse(o.end) : undefined; offersById[o.id] = o; });
    data.places.forEach((p) => { p.open = Date.parse(p.open); p.close = Date.parse(p.close); placesById[p.id] = p; });
    const built = $("#built");
    built.setAttribute("datetime", data.meta.built_at);
    built.textContent = fmt(Date.parse(data.meta.built_at)) + ", " + T.format(new Date(data.meta.built_at), { time: false, year: true });
    document.body.append(h("p", { id: "toast", class: "toast", role: "status", hidden: true }),
      h("p", { id: "announce", class: "sr", "aria-live": "polite" }), h("span", { id: "newtab", class: "sr" }, "Opens in a new tab"));
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
