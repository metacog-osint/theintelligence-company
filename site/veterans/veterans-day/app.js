/*! Veterans Day 2026 planner · app v1.0 · The Intelligence Company. Load tic-time.js and engine.js first.
 *  Everything about the user (settings, history, position) stays in this browser. The only network calls: the
 *  page's own data files, the NWS forecast, the shared field-report service (API below) and, on the Map tab, map tiles.
 */
(function () {
  "use strict";
  const E = window.VDEngine, T = window.TicTime;
  const API = "https://vetday.metacog.workers.dev"; // field-report Worker (veterans-day/worker); "" keeps reports on the phone
  const KEY = "vd2026-v1", MIN = 60000, HOUR = 3600000;
  const CATS = [["breakfast", "Breakfast"], ["meal", "Sit-down meals"], ["quick", "Quick bites"], ["coffee", "Coffee"],
    ["treat", "Treats"], ["service", "Haircuts and car care"], ["shopping", "Shopping discounts"],
    ["event", "Ceremonies and veterans' posts"]];
  const CAT = Object.fromEntries(CATS);
  const GRADE = { A: "Confirmed 2026", B: "Announced 2026", C: "Not confirmed: call first" };
  const GRADE_LONG = {
    A: "The business itself announced this for 2026.",
    B: "2026 deal lists or news reports carry it. Single stores can opt out.",
    C: "We found only earlier years. Call before you go."
  };
  const MODE = { dine_in: "dine-in", to_go: "to go", drive_thru: "drive-thru", dine_in_or_to_go: "dine-in or to go",
    in_store: "in store", online: "online", voucher: "card or voucher for later", event: "event" };
  const CENTER = { lat: 46.8600, lng: -96.8100 }; // 13th Ave S and 25th St, Fargo: used until you set a start

  let data = null, offersById = {}, placesById = {}, dayStart = 0, S = null, wxSlick = false;
  const live = { pos: null, acc: null, at: 0, watch: null, last: null };
  const shared = { events: [], overrides: {}, community: null, at: 0, ok: null };
  let focus = null, picking = false, map = null, mapLayer = null, mapReady = null, lastAnnounce = "";

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
        dayEndMin: 21 * 60, mealsMax: 2, roads: "auto", blocks: [] },
      done: {}, away: {}, strikes: {}, vetoed: {}, pinned: {}, prefs: {}, learned: {},
      start: null, gps: false, sent: [], previewMin: 8 * 60, cats: {}
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

  // ---------------------------------------------------------------- inputs for the engine
  function roads() { return S.profile.roads === "auto" ? (wxSlick ? "slick" : "normal") : S.profile.roads; }
  function engineProfile() {
    const p = S.profile;
    return { status: p.status, spouse: p.spouse, kids: Number(p.kids) || 0, proof: p.proof, ready: p.ready, pace: p.pace,
      dayEnd: localMs(p.dayEndMin), mealsMax: Number(p.mealsMax), roads: roads(),
      blocks: p.blocks.map((b) => ({ start: localMs(b.from), end: localMs(b.to) })) };
  }
  function engineState() {
    const prefs = {};
    CATS.forEach(([c]) => { prefs[c] = (S.prefs[c] === undefined ? 1 : S.prefs[c]) * (S.learned[c] || 1); });
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
    return [h("span", { class: "cat" }, CAT[o.category] || o.category), h("span", { class: "grade grade-" + o.grade, title: GRADE_LONG[o.grade] }, GRADE[o.grade])];
  }

  // ---------------------------------------------------------------- Next
  function announce(text) {
    if (text === lastAnnounce) return;
    lastAnnounce = text;
    $("#announce").textContent = text;
  }
  function renderNext() {
    const card = clear($("#next-card")), where = position(), t = now();
    const ctx = context(t, where.pos);
    const opts = E.nextOptions(ctx, { limit: 8 });
    let best = null;
    if (focus) {
      const c = ctx.cands.find((x) => x.place.id === focus);
      const step = c && E.evalStop(ctx, E._internal.startState(ctx, t), c);
      if (step) best = { step, then: [] }; else focus = null;
    }
    best = best || opts[0];
    renderLoc(where);
    if (mode() === "over") { card.append(h("p", { class: "empty" }, "That's a wrap for 2026. Your day is under Me.")); hideLists(); return; }
    if (!best) {
      const soon = ctx.cands.filter((c) => c.open > t).sort((a, b) => a.open - b.open)[0];
      card.append(h("p", { class: "next-name" }, "Nothing worth the drive right now"),
        h("p", { class: "empty" }, soon ? "Next to open: " + soon.offer.brand + " at " + fmt(soon.open) + "." :
          "Everything you can still use today is done, skipped or closed. Check your settings under Me if that looks wrong."));
      hideLists(); announce("Nothing worth the drive right now"); return;
    }
    const s = best.step, c = s.c, o = c.offer, pl = c.place;
    card.append(
      h("p", { class: "next-kicker" }, focus ? "Your pick" : "Next stop", ...chips(o)),
      h("h3", { class: "next-name" }, o.brand),
      h("p", { class: "next-offer" }, o.offer),
      h("p", { class: "next-addr" }, pl.address + (pl.verified === "unverified" ? " · address from directories, not the chain's own site" : "")),
      h("p", { class: "why" }, whyBits(s).map((b) => h("span", null, b))));
    if (s.waitMin > 10) {
      card.append(h("p", { class: "leave" }, "Opens " + fmt(s.start) + ". Leave by " + fmt(s.start - s.driveMin * MIN) + "."));
    }
    const fl = fieldLine(c);
    if (fl) card.append(fl);
    const flags = c.flags.concat(o.limits ? [o.limits] : []);
    if (flags.length) card.append(h("ul", { class: "flags" }, flags.map((f) => h("li", null, f))));
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
    announce("Next stop: " + o.brand + ", " + whyBits(s)[0]);

    const then = clear($("#then"));
    best.then.forEach((x) => then.append(h("li", null,
      h("span", { class: "t-time" }, fmt(x.start) + " · " + mins(x.driveMin - 2.5) + " drive"),
      h("span", null, h("b", null, x.c.offer.brand), " · " + x.c.offer.offer))));
    $("#then-wrap").hidden = !best.then.length;
    const alts = clear($("#alts"));
    opts.filter((x) => x.step.c.place.id !== pl.id).slice(0, 6).forEach((x) => alts.append(h("li", null,
      h("span", { class: "a-name" }, x.step.c.offer.brand + " · " + x.step.c.offer.offer),
      h("span", { class: "a-why" }, whyBits(x.step).slice(0, 3).join(" · ")),
      h("button", { type: "button", class: "btn btn-quiet btn-small", onclick: () => { focus = x.step.c.place.id; renderAll(); window.scrollTo(0, 0); } }, "Go here"))));
    $("#alts-wrap").hidden = !alts.children.length;
  }
  function hideLists() { $("#then-wrap").hidden = true; $("#alts-wrap").hidden = true; }

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

  // ---------------------------------------------------------------- Plan
  function renderPlan(ev) {
    if (ev) ev.preventDefault();
    const out = clear($("#plan-out"));
    const startVal = $("#plan-start").value, from = $("#plan-from").value;
    const t = startVal === "now" ? now() : localMs(Number(startVal));
    const where = from === "start" && S.start ? { pos: S.start } : position();
    const ctx = context(t, where.pos);
    const plan = E.planDay(ctx, { t });
    if (!plan.steps.length) { out.append(h("p", { class: "empty" }, "No deals are reachable from that start. Try an earlier start time, or check Me.")); return; }
    const drive = plan.steps.reduce((s, x) => s + x.driveMin, 0);
    const value = plan.steps.reduce((s, x) => s + x.c.offer.value * (S.profile.spouse && x.c.offer.spouse === "yes" ? 2 : 1), 0);
    const last = plan.steps[plan.steps.length - 1];
    out.append(h("p", { class: "plan-sum" }, plan.steps.length + " stops · about " + money(value) + " in deals · " +
      mins(drive) + " on the road · done about " + fmt(last.depart)));
    const list = h("ol", { class: "plan-list" });
    let prev = t;
    plan.steps.forEach((x, i) => {
      const leave = x.start - x.driveMin * MIN;
      if (leave - prev > 20 * MIN) list.append(h("li", { class: "gap" }, "Free time " + fmtNZ(prev) + "–" + fmt(leave)));
      list.append(h("li", null,
        h("span", { class: "p-time" }, (i + 1) + ". Leave " + fmtNZ(leave) + " · there " + fmt(x.start) + " · about " + Math.round(x.c.offer.minutes + x.queueMin) + " min"),
        h("span", { class: "p-name" }, x.c.offer.brand + " · " + x.c.offer.offer),
        h("span", { class: "note" }, x.c.place.address + " · " + windowText(x.c) + (x.c.flags.length ? " · " + x.c.flags.join("; ") : ""))));
      prev = x.depart;
    });
    out.append(list);
    // Google Maps takes at most 9 stops between the start and the end: one link per 10 stops.
    const links = h("p", { class: "links" });
    for (let i = 0; i < plan.steps.length; i += 10) {
      const chunk = plan.steps.slice(i, i + 10), dest = chunk[chunk.length - 1].c.place;
      const origin = i === 0 ? where.pos : plan.steps[i - 1].c.place;
      let url = "https://www.google.com/maps/dir/?api=1&travelmode=driving&origin=" + origin.lat + "," + origin.lng +
        "&destination=" + dest.lat + "," + dest.lng;
      const mid = chunk.slice(0, -1).map((x) => x.c.place.lat + "," + x.c.place.lng);
      if (mid.length) url += "&waypoints=" + encodeURIComponent(mid.join("|"));
      links.append(ext(url, "Stops " + (i + 1) + "–" + (i + chunk.length) + " in Google Maps", "btn btn-quiet"));
    }
    links.append(h("button", { type: "button", class: "btn btn-quiet", onclick: () => window.print() }, "Print"));
    out.append(links);
    out.append(h("p", { class: "note" }, "The Next tab re-plans after every stop and every report, so on the day follow it rather than this list."));
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
      reason ? h("p", { class: "note" }, "Not suggested: " + reason + ".") : null,
      o.proof && o.proof.length ? h("p", { class: "note" }, "Bring: " + o.proof.map(E.proofLabel).join(" or ")) : null,
      o.advance ? h("p", { class: "note" }, "Sign up first: " + o.advance) : null,
      o.voucher_use_by ? h("p", { class: "note" }, "Use the card or voucher by " + o.voucher_use_by + ".") : null,
      o.notes ? h("p", { class: "note" }, o.notes) : null);
    const locs = h("ul", { class: "locs" }, places.map((p) => {
      const c = cands && cands.find((x) => x.place.id === p.id);
      return h("li", null, h("span", null, p.address + (p.verified === "unverified" ? " (location not verified)" : "")),
        h("span", { class: "links" },
          c ? h("button", { type: "button", class: "btn btn-quiet btn-small", onclick: () => { focus = p.id; location.hash = "#next"; renderAll(); } }, "Go here next") : null,
          ext("https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=" + p.lat + "," + p.lng, "Directions", "btn btn-quiet btn-small")));
    }));
    card.append(h("details", null, h("summary", null, places.length === 1 ? "1 location" : places.length + " locations"), locs));
    card.append(h("details", null, h("summary", null, "Sources (" + (o.sources || []).length + ")"),
      h("p", { class: "note" }, GRADE_LONG[o.grade]),
      h("ul", { class: "srcs" }, (o.sources || []).map((s) => h("li", null, ext(s.url, s.publisher || s.url),
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
    CATS.forEach(([c, label]) => {
      const cur = S.prefs[c] === undefined ? 1 : S.prefs[c], learned = S.learned[c] || 1;
      const seg = h("span", { class: "seg", role: "group", "aria-label": label });
      [[1.5, "Love"], [1, "Fine"], [0, "Skip"]].forEach(([w, t]) => seg.append(h("button", { type: "button", "aria-pressed": cur === w ? "true" : "false",
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
      mapLayer = L.layerGroup().addTo(map);
      map.on("click", (ev) => {
        if (!picking) return;
        picking = false;
        S.start = { lat: Math.round(ev.latlng.lat * 1e5) / 1e5, lng: Math.round(ev.latlng.lng * 1e5) / 1e5 };
        save(); toast("Start point set. It stays on this phone."); location.hash = "#next"; renderAll();
      });
    }
    map.invalidateSize();
    mapLayer.clearLayers();
    const t = now(), where = position(), ctx = context(t, where.pos);
    const best = E.nextOptions(ctx, { limit: 1 })[0];
    const plan = E.planDay(ctx, { t });
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
    if (best) L.circleMarker([best.step.c.place.lat, best.step.c.place.lng], { radius: 12, color: css("--ink"), weight: 3,
      fillColor: css("--mark"), fillOpacity: 1 }).bindPopup(popup(best.step.c)).addTo(mapLayer);
    if (where.kind !== "center") L.circleMarker([where.pos.lat, where.pos.lng], { radius: 6, color: ring, weight: 2,
      fillColor: css("--focus"), fillOpacity: 1 }).bindTooltip(where.kind === "gps" ? "You" : "Your start").addTo(mapLayer);
  }
  function popup(c) {
    return h("div", { class: "vd-pop" }, h("b", null, c.offer.brand), h("span", null, c.offer.offer),
      h("span", { class: "note" }, windowText(c) + " · " + GRADE[c.offer.grade]),
      h("button", { type: "button", class: "btn btn-small", onclick: () => { focus = c.place.id; location.hash = "#next"; renderAll(); } }, "Go here next"));
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
  function currentTab() { const t = (location.hash || "#next").slice(1); return ["next", "plan", "map", "deals", "me"].includes(t) ? t : "next"; }
  function renderAll() {
    renderClock();
    const tab = currentTab();
    document.querySelectorAll(".tab").forEach((a) => { if (a.dataset.tab === tab) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    document.querySelectorAll(".panel").forEach((p) => { p.hidden = p.id !== "tab-" + tab; });
    if (tab === "next") renderNext();
    else if (tab === "deals") renderDeals();
    else if (tab === "me") renderMe();
    else if (tab === "map") renderMap();
    else if (tab === "plan" && $("#plan-out").children.length) renderPlan();
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

  function wire() {
    window.addEventListener("hashchange", renderAll);
    $("#loc-gps").addEventListener("click", () => (live.watch !== null ? stopGps() : startGps()));
    $("#loc-map").addEventListener("click", () => { picking = true; location.hash = "#map"; toast("Tap the map where you'll start."); });
    timeOptions($("#preview-time"), 5 * 60, 22 * 60, 30, S.previewMin);
    $("#preview-time").addEventListener("change", (ev) => { S.previewMin = Number(ev.target.value); save(); renderAll(); });
    timeOptions($("#plan-start"), 5 * 60, 21 * 60, 30, "now", ["now", "Now"]);
    $("#plan-form").addEventListener("submit", renderPlan);
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
    if (S.gps) startGps();
    renderAll();
    weather();
    pull();
    sync();
  }
  main();
})();
