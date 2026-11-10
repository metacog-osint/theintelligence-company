/*! Veterans Day route engine v1.4 · The Intelligence Company · pure functions: no DOM, no network, no storage.
 *  Browser: window.VDEngine. Node (tests): require("./engine.js").
 *
 *  Goals (profile.goal): "optimal" collects the best deal of each kind along the way, never two of the same kind
 *  within 3 hours; "best" weighs each deal's value against your time at your pace; "stops" fits in the most
 *  places before you're done; "savings" the most dollars; "both" scores each plan half on stops and half on dollars,
 *  each as a share of what the other two goals reach. Every goal keeps to deal windows, busy times, your done-by
 *  time, the meal limit, your appetite and anything you've turned off.
 *  v1.4 (10 Nov 2026): "optimal" (the Maximize routes stack "multiple free coffee grabs within a short window";
 *  most people won't want that). offer.kinds (coffee, meal, bar, haircut, ...) say what a stop is; a ticket for
 *  later has none and never counts. A stop you pinned or chose to go to first may repeat a kind; what you've marked
 *  Got it today counts. Also: an offer open to the public is open to you (it was "not eligible" before).
 *  Appetite: food eaten there fills you up (a sit-down meal 1, a quick bite 0.4) and wears off at 0.3 an hour. A
 *  ticket for later (a voucher or card) and food you take home (profile.togo) fill nothing.
 *  v1.2 (8 Nov 2026): a route doesn't open with a ticket for later unless it fits nowhere later or moving it costs
 *  more than 10 minutes, counting the drive back to where you started (deferTickets).
 *  v1.3 (10 Nov 2026): offer.arriveBy (epoch ms), for a ceremony with a start time: the latest you can arrive,
 *  instead of 5 minutes before it ends.
 *
 *  Inputs are plain objects (see prepare()). Times are epoch milliseconds; the data file already holds every window
 *  in UTC, so nothing here depends on a time zone. Drive times come from the data file's tables:
 *    drive.places[i][j]     seconds from place i to place j (OSRM, no parking)
 *    drive.anchors[k]       [lat, lng] of grid point k (about every 800 m across the metro)
 *    drive.fromAnchor[k][j] seconds from grid point k to place j
 *  A phone's position is joined to the nearest grid points with a slow straight-line first leg, so the position never
 *  has to leave the phone.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.VDEngine = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var MIN = 60000, HOUR = 3600000;
  var GRADE_P = { A: 0.9, B: 0.75, C: 0.4 };
  var LOCAL_KMH = 25, DETOUR = 1.4, PARK_MS = 2.5 * MIN, ARRIVE_BY_MS = 5 * MIN, MAX_WAIT_MS = 4 * HOUR;
  var DECAY_MIN = 120, LINE_FRESH_MS = 40 * MIN, OUT_FRESH_MS = 6 * HOUR;
  var PACE = { relaxed: 0.5, balanced: 0.25, max: 0.1 }; // dollars of value a minute of your day is worth
  var GOALS = ["optimal", "best", "stops", "savings", "both"];
  var SPACING_MS = 3 * HOUR; // "optimal": the least time between two stops of the same kind (10 Nov 2026)
  // Older data files have no kinds: guess from the category.
  var CAT_KIND = { breakfast: "meal", meal: "meal", quick: "meal", coffee: "coffee", treat: "sweet", bar: "bar",
    shopping: "shopping", event: "ceremony" };
  var DIGEST = 0.3; // share of a full meal gone each hour: a sit-down meal wears off in about 3 hours
  var MEALTIMES = [[360, 630], [630, 870], [990, 1230]]; // local minutes: 6:00–10:30, 10:30–14:30, 16:30–20:30
  var TAKEAWAY = { to_go: 1, drive_thru: 1, dine_in_or_to_go: 1, in_store: 1 };

  function km(a, b) {
    var p = Math.PI / 180, dLat = (b.lat - a.lat) * p, dLng = (b.lng - a.lng) * p;
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(a.lat * p) * Math.cos(b.lat * p) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 12742 * Math.asin(Math.sqrt(s));
  }
  function slowLegSec(kmStraight) { return kmStraight * DETOUR / LOCAL_KMH * 3600; }

  // Seconds of driving from a free position to every place (no parking): best of the four nearest grid points.
  function fromPosition(drive, places, pos) {
    var near = drive.anchors.map(function (a, k) { return { k: k, d: km(pos, { lat: a[0], lng: a[1] }) }; })
      .sort(function (x, y) { return x.d - y.d; }).slice(0, 4);
    // Only grid points about as close as the nearest one: a straight line to a far point would skip the roads.
    near = near.filter(function (n) { return n.d <= near[0].d + 0.8; });
    return places.map(function (pl, j) {
      var best = Infinity;
      for (var i = 0; i < near.length; i++) {
        var row = drive.fromAnchor[near[i].k], v = row ? row[j] : null;
        if (v === null || v === undefined) continue;
        best = Math.min(best, slowLegSec(near[i].d) + v);
      }
      var straight = km(pos, pl);
      if (straight < 0.8) best = Math.min(best, slowLegSec(straight)); // next door: just go
      return best;
    });
  }

  // ---------------------------------------------------------------- field reports
  // events: [{k: "worked"|"away"|"out"|"line", t: ms, m: minutes}]
  function stats(events, now) {
    var s = { w: 0, a: 0, out: 0, worked: 0, line: null, lineT: 0, n: 0 };
    (events || []).forEach(function (e) {
      if (e.t > now + 5 * MIN) return; // ignore clock-skewed future reports
      var age = (now - e.t) / MIN, wt = Math.exp(-age / DECAY_MIN);
      s.n++;
      if (e.k === "worked") { s.w += wt; s.worked = Math.max(s.worked, e.t); }
      else if (e.k === "away") s.a += wt;
      else if (e.k === "out") s.out = Math.max(s.out, e.t);
      else if (e.k === "line" && e.t > s.lineT) { s.line = e.m; s.lineT = e.t; }
    });
    return s;
  }

  // Chance the offer is honoured at this place, from its grade and what people reported today.
  function confidence(offer, placeId, reports, now) {
    var p0 = GRADE_P[offer.grade] || GRADE_P.C;
    if (offer.participating) p0 *= 0.9;
    var own = stats(reports.place[placeId], now), all = stats(reports.offer[offer.id], now);
    var A = p0 * 4 + own.w + 0.4 * Math.max(0, all.w - own.w);
    var B = (1 - p0) * 4 + 1.5 * own.a + 0.4 * Math.max(0, all.a - own.a);
    var p = A / (A + B);
    var ranOut = own.out && own.out > own.worked && now - own.out < OUT_FRESH_MS;
    if (ranOut) p *= 0.05;
    var line = own.line !== null && now - own.lineT < LINE_FRESH_MS ? own.line : null;
    return { p: p, own: own, all: all, ranOut: ranOut, line: line };
  }

  // ---------------------------------------------------------------- who qualifies
  function eligibility(offer, profile) {
    var st = profile.status, el = offer.eligible || [], flags = [], f = 1;
    var ok = el.indexOf(st) >= 0 || el.indexOf("public") >= 0 || (st === "retired" && el.indexOf("veteran") >= 0);
    if (st === "guard_reserve") {
      if (offer.guard_reserve === "yes") ok = true;
      else if (offer.guard_reserve === "no") ok = false;
      else if (!ok) { ok = true; f *= 0.8; flags.push("Guard/Reserve not named: ask, bring your ID"); }
    }
    if (!el.length) { ok = true; f *= 0.9; }
    var mult = 1;
    if (profile.spouse) {
      if (offer.spouse === "yes") mult = 2;
      else if (offer.spouse === "unclear") { mult = 1.15; flags.push("Spouse may be included: ask"); }
    }
    if (offer.kids && profile.kids > 0) mult += 0.25 * profile.kids;
    var proof = offer.proof || [];
    if (proof.length && !proof.some(function (p) { return profile.proof && profile.proof[p]; })) {
      f *= 0.4; flags.push("Needs: " + proof.map(proofLabel).join(" or "));
    }
    if (offer.advance && !(profile.ready && profile.ready[offer.id])) {
      f *= 0.5; flags.push("Sign up first: " + offer.advance);
    }
    return { ok: ok, f: f, mult: mult, flags: flags };
  }
  // ---------------------------------------------------------------- appetite
  // How much of a meal a deal is when eaten there: 1 a sit-down meal, 0 a coffee or a ticket for later.
  function eatWeight(o) {
    if (o.ticket) return 0;
    if (o.eat !== undefined && o.eat !== null) return o.eat;
    if (o.meal) return o.dineIn ? 1 : 0.8;
    return o.snack ? 0.4 : 0;
  }
  function takeaway(o) { return !o.dineIn && !o.ticket && (!o.mode || !!TAKEAWAY[o.mode]); }
  function eatsThere(o, togo) { return eatWeight(o) > 0 && !(togo && takeaway(o)); }
  // What kind of stop it is, for "optimal": the data's kinds, else a guess from the category. A ticket has none.
  function kindsOf(o) {
    if (o.ticket) return [];
    if (o.kinds) return o.kinds;
    if (o.category === "service") return [o.group || o.id];
    return [CAT_KIND[o.category] || o.category];
  }
  // A stop of a kind you had less than 3 hours earlier (kinds: {kind: when its last stop started}).
  function tooSoon(kinds, c, t) {
    for (var i = 0; i < c.kinds.length; i++) {
      var k = kinds[c.kinds[i]];
      if (k !== undefined && t - k < SPACING_MS) return true;
    }
    return false;
  }
  function digest(fill, from, to) { return Math.max(0, fill - DIGEST * Math.max(0, to - from) / HOUR); }
  function appetite(fill) { return Math.min(1, Math.max(0.05, 1.15 - fill)); } // empty 1, after a big meal 0.15

  var PROOF = { military_id: "military ID", dd214: "DD-214", va_card: "VA ID card", dl_veteran: "veteran driver's licence",
    photo_in_uniform: "photo in uniform", idme_online: "ID.me" };
  function proofLabel(p) { return PROOF[p] || p.replace(/_/g, " "); }

  // ---------------------------------------------------------------- preparing a run
  // data: {offers: [...], places: [...], drive: {...}, tzOffsetMin}
  // profile: {status, spouse, kids, proof: {}, ready: {}, pace, dayEnd(ms), mealsMax, roads, blocks: [{start,end}],
  //           goal: "best"|"stops"|"savings"|"both", togo: true when food that can be taken home is saved for later}
  // state: {done: {offerId: {r: "worked"|"away", t, place}}, away: {placeId: t}, strikes: {offerId: {n, until}},
  //         vetoed: {offerId: true}, pinned: {offerId: true}, prefs: {category: weight, purchase: weight}}
  //         prefs.purchase weighs deals that need a purchase (a buy-one-get-one, a percentage off); 0 leaves them out.
  // reports: {place: {placeId: [events]}, offer: {offerId: [events]}}
  // overrides: {id: {status: "dead"|"caution", note}} for an offer or a place (set by the operators on the day)
  function prepare(data, profile, state, reports, now, pos, overrides) {
    overrides = overrides || {};
    reports = reports || { place: {}, offer: {} };
    var offersById = {}, cands = [], excluded = {};
    data.offers.forEach(function (o) { offersById[o.id] = o; });
    // Sit-down meals so far, how full you are now from what you ate there, and when you last had each kind of stop.
    var meals = 0, ate = [], fill = 0, fillT = now, kindsT = {};
    Object.keys(state.done || {}).forEach(function (id) {
      var d = state.done[id], o = offersById[id];
      if (!o || d.r !== "worked") return;
      kindsOf(o).forEach(function (k) { if (kindsT[k] === undefined || d.t > kindsT[k]) kindsT[k] = d.t; });
      if (o.meal && o.dineIn) meals++;
      if (eatsThere(o, profile.togo)) ate.push({ t: d.t, w: eatWeight(o) });
    });
    ate.sort(function (a, b) { return a.t - b.t; });
    ate.forEach(function (e, k) { fill = (k ? digest(fill, fillT, e.t) : 0) + e.w; fillT = e.t; });
    if (ate.length) fill = digest(fill, fillT, now);
    data.places.forEach(function (pl, i) {
      var o = offersById[pl.offer];
      if (!o) return;
      var why = null;
      if (o.status !== "offering") why = "not offered";
      else if (overrides[o.id] && overrides[o.id].status === "dead") why = "pulled: " + (overrides[o.id].note || "reported not honoured");
      else if (overrides[pl.id] && overrides[pl.id].status === "dead") why = "pulled here: " + (overrides[pl.id].note || "");
      else if (state.vetoed && state.vetoed[o.id]) why = "you said never";
      else if (state.done && state.done[o.id] && state.done[o.id].r === "worked") why = "done";
      else if (o.group && Object.keys(state.done || {}).some(function (id) {
        var d = state.done[id], x = offersById[id];
        return d.r === "worked" && x && x.group === o.group;
      })) why = "you already have one (" + o.group + ")";
      else if (state.away && state.away[pl.id]) why = "turned away here";
      else if (state.strikes && state.strikes[o.id] && state.strikes[o.id].until > now) why = "skipped for now";
      var el = eligibility(o, profile);
      if (!why && !el.ok) why = "not eligible";
      var pinSpec = state.pinned && state.pinned[o.id];
      if (!why && o.category === "service" && o.advance && !(profile.ready && profile.ready[o.id]) && !pinSpec) {
        why = "book an appointment first (or mark Signed up ahead under Me)";
      }
      if (!why && pinSpec && typeof pinSpec === "object" && pinSpec.placeId && pinSpec.placeId !== pl.id) {
        why = "another location chosen";
      }
      // The deal's own hours inside the store's; if they don't overlap (Texas Roadhouse hands out vouchers at lunch
      // though the dining room opens at 4), the deal's own hours win.
      var open = Math.max(o.start || 0, pl.open), close = Math.min(o.end || Infinity, pl.close);
      if (close <= open && o.start && o.end) { open = o.start; close = o.end; }
      var latest = Math.min(close - ARRIVE_BY_MS, o.arriveBy || Infinity); // a ceremony: be there by its start
      if (!why && latest <= now) why = "over for today";
      if (why) { excluded[pl.id] = why; return; }
      var conf = confidence(o, pl.id, reports, now);
      var pref = state.prefs && state.prefs[o.category] !== undefined ? state.prefs[o.category] : 1;
      if (pref <= 0) { excluded[pl.id] = "category off"; return; }
      if (o.purchase) {
        var pp = state.prefs && state.prefs.purchase !== undefined ? state.prefs.purchase : 1;
        if (pp <= 0) { excluded[pl.id] = "needs a purchase (turned off)"; return; }
        pref *= pp;
      }
      var flags = el.flags.slice();
      if (state.done && state.done[o.id] && state.done[o.id].r === "away") flags.push("Turned away at another location");
      if (o.caution) flags.push(o.caution);
      if (overrides[o.id] && overrides[o.id].status === "caution") flags.push(overrides[o.id].note);
      if (overrides[pl.id] && overrides[pl.id].status === "caution") flags.push(overrides[pl.id].note);
      if (conf.ranOut) flags.push("Reported run out");
      var retry = state.done && state.done[o.id] && state.done[o.id].r === "away" ? 0.6 : 1;
      var q = el.f * conf.p * retry * (o.caution ? 0.7 : 1); // the chance it works out for you
      var pinTargetMs = (pinSpec && typeof pinSpec === "object" && pinSpec.targetMs) ? pinSpec.targetMs : null;
      cands.push({
        i: i, place: pl, offer: o, open: open, close: close, latest: latest, conf: conf, flags: flags,
        // worth: what a stop is worth to the planner when it has no dollar value (a ceremony)
        base: (o.worth !== undefined ? o.worth : o.value) * el.mult * q * pref,
        dollars: o.value * el.mult * q,  // "savings": expected dollars, likes ignored
        count: Math.min(1, q / 0.3),     // "stops": a place counts in full unless it's a long shot
        pinned: !!pinSpec, pinTargetMs: pinTargetMs, kinds: kindsOf(o)
      });
    });
    var drive = data.drive;
    var fromPos = pos ? fromPosition(drive, data.places, pos) : null;
    return {
      data: data, profile: profile, now: now, pos: pos, fromPos: fromPos, cands: cands, excluded: excluded,
      roads: profile.roads === "slick" ? 1.4 : 1, lambda: PACE[profile.pace] || PACE.balanced,
      dayEnd: profile.dayEnd, mealsMax: profile.mealsMax === undefined ? 2 : profile.mealsMax,
      blocks: (profile.blocks || []).slice().sort(function (a, b) { return a.start - b.start; }),
      tzOffsetMin: data.tzOffsetMin === undefined ? -360 : data.tzOffsetMin,
      goal: GOALS.indexOf(profile.goal) >= 0 ? profile.goal : "best", togo: !!profile.togo, ref: null,
      meals: meals, fill: fill, kindsT: kindsT
    };
  }
  function withGoal(ctx, goal) { var c = {}; for (var k in ctx) c[k] = ctx[k]; c.goal = goal; return c; }

  function localMinutes(ctx, t) { var m = Math.floor((t + ctx.tzOffsetMin * MIN) / MIN) % 1440; return m < 0 ? m + 1440 : m; }
  function isPeak(ctx, t) { var m = localMinutes(ctx, t); return (m >= 690 && m < 795) || (m >= 1020 && m < 1140); }

  function driveMs(ctx, st, c) {
    var sec = st.at < 0 ? (ctx.fromPos ? ctx.fromPos[c.i] : Infinity) : (st.at === c.i ? 0 : ctx.data.drive.places[st.at][c.i]);
    if (sec === null || sec === undefined || !isFinite(sec)) return Infinity;
    return sec * 1000 * ctx.roads + (st.at === c.i ? 0 : PARK_MS);
  }

  // When you can next leave: not inside a block you've set (a ceremony, a shift).
  function afterBlocks(ctx, t) {
    for (var i = 0; i < ctx.blocks.length; i++) { var b = ctx.blocks[i]; if (t >= b.start && t < b.end) t = b.end; }
    return t;
  }

  // One stop from a search state; null if you can't make it. force: a stop you chose to go to first, which "optimal"
  // takes even if it repeats a kind.
  function evalStop(ctx, st, c, force) {
    var leave = afterBlocks(ctx, st.t), d = driveMs(ctx, st, c);
    if (!isFinite(d)) return null;
    var o = c.offer, arrive, start, depart, queue = 0;
    for (var tries = 0; tries < 4; tries++) {
      arrive = leave + d;
      var minStart = c.open;
      if (c.pinTargetMs && c.pinTargetMs - 15 * MIN > minStart && c.pinTargetMs <= c.latest) {
        minStart = c.pinTargetMs - 15 * MIN;
      }
      start = Math.max(arrive, minStart);
      if (start > c.latest) return null;
      queue = c.conf.line !== null ? c.conf.line : (o.busy && isPeak(ctx, start) ? o.busy : (o.line || 3));
      depart = start + (queue + o.minutes) * MIN;
      var clash = null;
      for (var i = 0; i < ctx.blocks.length; i++) {
        var b = ctx.blocks[i];
        if (b.start < depart && b.end > leave) { clash = b; break; }
      }
      if (!clash) break;
      leave = clash.end;
      if (tries === 3) return null;
    }
    if (start - arrive > MAX_WAIT_MS && !c.pinTargetMs) return null;
    if (depart > ctx.dayEnd) return null;
    // "optimal": not a second coffee (bar, meal, haircut...) within 3 hours of the last; a pin says you want it anyway.
    if (ctx.goal === "optimal" && !force && !c.pinned && tooSoon(st.kinds, c, start)) return null;
    // Appetite: eating while full is worth less; a ticket for later or food taken home fills nothing.
    var w = eatWeight(o), here = eatsThere(o, ctx.togo), fill = digest(st.fill, st.fillT, start), full = 1;
    if (o.meal && o.dineIn && st.meals >= ctx.mealsMax) return null; // past your sit-down meal limit
    if (here) full = appetite(fill);
    if (full < 0.3) return null; // too full to eat it there
    if (here && o.meal && (ctx.goal === "best" || ctx.goal === "optimal") && !mealtime(ctx, start)) full *= 0.75;
    if (w > 0 && !here) full *= 0.9; // saved for later
    var ev = c.base * full, used = (depart - st.t) / MIN, eat = Math.min(1, full * 2);
    if ((ctx.goal === "optimal" || ctx.goal === "best") && localMinutes(ctx, start) < 630 && (o.category === "breakfast" || (o.end && localMinutes(ctx, c.close) <= 660))) {
      ev *= 1.35;
    }
    // Driving and lines cost the full rate; time at the stop itself (eating, a haircut) a third of it, since that is
    // the point of going. Waiting for a window to open costs the full rate for 20 minutes, then counts as free time
    // (the plan says "free until …" and you leave later).
    var waitMin = (start - arrive) / MIN;
    var cost = (d / MIN + queue + Math.min(waitMin, 20) + 0.1 * Math.max(0, waitMin - 20) + 0.3 * o.minutes) * ctx.lambda;
    var pinBonus = c.pinned ? 40 : 0;
    if (c.pinTargetMs) {
      var diffMin = Math.abs(start - c.pinTargetMs) / MIN;
      pinBonus += Math.max(0, 60 - diffMin * 1.5);
    }
    var gain;
    // The Maximize goals ignore pace and likes (Off still counts); the minutes only break ties toward quicker stops.
    // "optimal" is like Most savings, but counts what you love and what a ceremony is worth (ev, not dollars).
    if (ctx.goal === "optimal") gain = ev - 0.01 * used + pinBonus;
    else if (ctx.goal === "stops") gain = c.count * eat - 0.003 * used + (c.pinned ? 3 : 0) + (c.pinTargetMs ? Math.max(0, 4 - Math.abs(start - c.pinTargetMs) / MIN * 0.1) : 0);
    else if (ctx.goal === "savings") gain = c.dollars * full - 0.01 * used + pinBonus;
    else if (ctx.goal === "both") gain = 50 * c.count * eat / ctx.ref.n + 50 * c.dollars * full / ctx.ref.d - 0.01 * used + (c.pinned ? 20 : 0);
    else gain = ev - cost + pinBonus;
    return {
      c: c, leave: leave, arrive: arrive, start: start, depart: depart,
      driveMin: d / MIN, waitMin: (start - arrive) / MIN, queueMin: queue,
      slackMin: (c.latest - arrive) / MIN, arriveBy: c.latest,
      ev: ev, full: full, gain: gain, eats: here, fillAfter: fill + (here ? w : 0),
      dollars: c.dollars * full, counts: c.count * eat
    };
  }
  function mealtime(ctx, t) {
    var m = localMinutes(ctx, t);
    return MEALTIMES.some(function (w) { return m >= w[0] && m < w[1]; });
  }

  function startState(ctx, t, at) {
    var kinds = {};
    for (var k in ctx.kindsT) kinds[k] = ctx.kindsT[k];
    return { t: t, at: at === undefined ? -1 : at, used: {}, meals: ctx.meals, fill: ctx.fill, fillT: ctx.now, kinds: kinds, steps: [], score: 0, key: "" };
  }
  function extend(st, step) {
    var o = step.c.offer, used = {}, kinds = {};
    for (var k in st.used) used[k] = 1;
    for (var q in st.kinds) kinds[q] = st.kinds[q];
    step.c.kinds.forEach(function (x) { kinds[x] = step.start; });
    used[o.id] = 1;
    if (o.group) used["g:" + o.group] = 1; // one of a kind a day (a haircut)
    var meal = o.meal && o.dineIn;
    return {
      t: step.depart, at: step.c.i, used: used, kinds: kinds,
      meals: st.meals + (meal ? 1 : 0), fill: step.fillAfter, fillT: step.start,
      steps: st.steps.concat([step]), score: st.score + step.gain,
      key: Object.keys(used).sort().join(",") + "@" + step.c.i
    };
  }

  // A stop can score below zero on its own and still belong in the plan: a quick breakfast while you'd otherwise wait
  // for a 9:00 opening. "best" keeps such stops (down to 15 minutes of your time) and lets the whole plan's score decide.
  function floor(ctx) { return ctx.goal === "best" ? -15 * ctx.lambda : 0; }
  // In the Maximize goals time is what runs out, so the search ranks partial plans by what they've collected less
  // what their minutes could have collected elsewhere (about a stop every 20 minutes, $0.20 a minute, or the day's
  // whole score spread over the time left). "best" already prices your time at your pace. The plan kept is still
  // the one with the highest score.
  function rate(ctx, t) {
    if (ctx.goal === "stops") return 1 / 20;
    if (ctx.goal === "savings" || ctx.goal === "optimal") return 0.2;
    if (ctx.goal === "both") return 100 / Math.max(60, (ctx.dayEnd - t) / MIN);
    return 0;
  }

  function beam(ctx, start, width, depth) {
    var states = [start], best = start, fl = floor(ctx), rho = rate(ctx, start.t);
    var rank = function (s) { return s.score - rho * (s.t - start.t) / MIN; };
    for (var dpt = 0; dpt < depth && states.length; dpt++) {
      var next = [];
      for (var s = 0; s < states.length; s++) {
        var st = states[s];
        for (var j = 0; j < ctx.cands.length; j++) {
          var c = ctx.cands[j];
          if (st.used[c.offer.id] || (c.offer.group && st.used["g:" + c.offer.group])) continue;
          var step = evalStop(ctx, st, c);
          if (!step || step.gain <= fl) continue;
          next.push(extend(st, step));
        }
      }
      next.sort(function (a, b) { return rank(b) - rank(a); });
      var seen = {}, kept = [];
      for (var n = 0; n < next.length && kept.length < width; n++) {
        if (seen[next[n].key]) continue;
        seen[next[n].key] = 1; kept.push(next[n]);
      }
      states = kept;
      for (var b = 0; b < kept.length; b++) if (kept[b].score > best.score) best = kept[b];
    }
    return best;
  }

  // Ranked choices for where to go next: each first stop scored with the best few stops that could follow it.
  // One entry per offer (its best location).
  function nextOptions(ctx, opts) {
    opts = opts || {};
    needRef(ctx, opts.t || ctx.now);
    var start = startState(ctx, opts.t || ctx.now, opts.at), byOffer = {}, fl = floor(ctx);
    // First stops: the two best locations of each offer, then the most promising few get the look-ahead.
    var firsts = [], perOffer = {};
    ctx.cands.forEach(function (c) {
      var step = evalStop(ctx, start, c);
      if (step && step.gain > fl) firsts.push(step);
    });
    firsts.sort(function (a, b) { return b.gain - a.gain; });
    firsts = firsts.filter(function (s) {
      var n = perOffer[s.c.offer.id] = (perOffer[s.c.offer.id] || 0) + 1;
      return n <= 2;
    }).slice(0, opts.firstK || 30);
    firsts.forEach(function (step) {
      var c = step.c;
      var after = beam(ctx, extend(start, step), opts.width || 3, opts.depth || 3);
      var total = after.score, prev = byOffer[c.offer.id];
      if (!prev || total > prev.total) byOffer[c.offer.id] = { step: step, then: after.steps.slice(1), total: total };
    });
    return Object.keys(byOffer).map(function (k) { return byOffer[k]; })
      .sort(function (a, b) { return b.total - a.total; }).slice(0, opts.limit || 12);
  }

  // A whole day from a start time and place (position or place index). opts.first: a candidate you've chosen to go to
  // first; the rest of the day is planned after it.
  function planDay(ctx, opts) {
    opts = opts || {};
    var t = opts.t || ctx.now;
    needRef(ctx, t);
    var start = startState(ctx, t, opts.at);
    if (opts.first) {
      var lead = evalStop(ctx, start, opts.first, true);
      if (lead) start = extend(start, lead);
    }
    var best = beam(ctx, start, opts.width || 10, opts.depth || (ctx.goal === "best" ? 24 : 40));
    best = fillGaps(ctx, start, best);
    if (!opts.first) {
      var moved = deferTickets(ctx, start, best);
      if (moved !== best) best = fillGaps(ctx, start, moved);
    }
    return summarize(best.steps, best.score, ctx.ref);
  }
  // A ticket for later (a Great Clips or Freddy's card) is good all day, and the beam likes it first only because it
  // is quick. 8 Nov 2026: don't open a route with Great Clips unless it makes sense there. So when the route
  // starts with a ticket, try it at each later place and take the best of those orders, unless that costs more than
  // 10 minutes of your time or misses a window (the Texas Roadhouse voucher's 11:00-14:00). The plan never counts the
  // drive home, which makes a stop near your start look cheap only at the start; here the drive back to where you
  // started is counted, so a card near home can wait for the way home. In the Maximize goals minutes are nearly free,
  // so only a lost stop or dollar keeps a ticket first.
  function deferTickets(ctx, start, best) {
    var n0 = start.steps.length, give = ctx.goal === "best" ? 10 * ctx.lambda : ctx.goal === "stops" ? 0.05 : 0.5;
    var worth = function (st) { return st.score - (ctx.goal === "best" ? homeMin(ctx, start, st) * ctx.lambda : 0); };
    var cs = best.steps.slice(n0).map(function (s) { return s.c; }), m = 0;
    while (m < cs.length && cs[m].offer.ticket) m++;
    if (m === 0 || m === cs.length) return best; // no ticket in front, or nothing but tickets
    // Every ticket at the front goes to its best later place, one at a time; one that fits nowhere later (its
    // window is closing) stays in front.
    var seq = cs.slice(m), cur = null;
    for (var i = 0; i < m; i++) {
      var top = null, topSeq = null;
      for (var k = 1; k <= seq.length; k++) {
        var s2 = seq.slice(0, k).concat([cs[i]], seq.slice(k)), trial = replay(ctx, start, s2);
        if (trial && (!top || worth(trial) > worth(top))) { top = trial; topSeq = s2; }
      }
      if (!top) { topSeq = [cs[i]].concat(seq); top = replay(ctx, start, topSeq); }
      if (!top) return best;
      seq = topSeq; cur = top;
    }
    return worth(cur) >= worth(best) - give ? cur : best;
  }
  // Minutes from a plan's last stop back to where it started (drive times are close enough to symmetric).
  function homeMin(ctx, start, st) {
    if (!st.steps.length || st.at < 0) return 0;
    var sec = start.at < 0 ? (ctx.fromPos ? ctx.fromPos[st.at] : 0) : ctx.data.drive.places[start.at][st.at];
    return sec ? sec * ctx.roads / 60 : 0;
  }
  // Re-run a list of stops from a state; null if one of them no longer fits.
  function replay(ctx, st, cs) {
    for (var i = 0; i < cs.length; i++) {
      var step = evalStop(ctx, st, cs[i]);
      if (!step) return null;
      st = extend(st, step);
    }
    return st;
  }
  // The beam compares plans stop by stop, so a plan that grabs breakfast while waiting for a 9:00 opening looks a
  // stop behind and drops out. Afterwards, try each unused stop in front of any wait of 15 minutes or more, and keep
  // the insertion that raises the plan's score most; repeat while it helps.
  function fillGaps(ctx, start, best) {
    var n0 = start.steps.length;
    for (var round = 0; round < 6; round++) {
      var cs = best.steps.slice(n0).map(function (s) { return s.c; }), top = null;
      for (var k = 0; k < cs.length; k++) {
        if (best.steps[n0 + k].waitMin < 15) continue;
        for (var j = 0; j < ctx.cands.length; j++) {
          var c = ctx.cands[j];
          if (best.used[c.offer.id] || (c.offer.group && best.used["g:" + c.offer.group])) continue;
          var trial = replay(ctx, start, cs.slice(0, k).concat([c], cs.slice(k)));
          if (trial && trial.score > (top ? top.score : best.score) + 1e-6) top = trial;
        }
      }
      if (!top) break;
      best = top;
    }
    return best;
  }
  function summarize(steps, score, ref) {
    var sum = function (f) { return steps.reduce(function (s, x) { return s + f(x); }, 0); };
    return { steps: steps, score: score, ref: ref, value: sum(function (x) { return x.c.offer.value; }),
      dollars: sum(function (x) { return x.dollars; }), count: sum(function (x) { return x.counts; }) };
  }
  // "both" needs the best stop count and the best dollars first, to score a plan as a share of each.
  function needRef(ctx, t) {
    if (ctx.goal !== "both" || ctx.ref) return;
    var n = planDay(withGoal(ctx, "stops"), { t: t }), d = planDay(withGoal(ctx, "savings"), { t: t });
    ctx.ref = { n: Math.max(1, n.count), d: Math.max(1, d.dollars) };
  }

  // Preference learning: small nudges, shown to the user, never hidden.
  function learn(prefs, category, outcome) {
    var w = prefs[category] === undefined ? 1 : prefs[category];
    if (outcome === "worked") w = Math.min(2, w * 1.05);
    else if (outcome === "skip") w = Math.max(0.3, w * 0.92);
    var out = {};
    for (var k in prefs) out[k] = prefs[k];
    out[category] = Math.round(w * 1000) / 1000;
    return out;
  }
  // Skip = a strike: hidden for 45 minutes; the third strike is a veto.
  function strike(state, offerId, now) {
    var s = (state.strikes && state.strikes[offerId]) || { n: 0, until: 0 };
    s = { n: s.n + 1, until: now + 45 * MIN };
    return { strike: s, veto: s.n >= 3 };
  }

  return {
    version: "1.4", km: km, fromPosition: fromPosition, stats: stats, confidence: confidence, eligibility: eligibility,
    proofLabel: proofLabel, prepare: prepare, evalStop: evalStop, nextOptions: nextOptions, planDay: planDay,
    learn: learn, strike: strike, localMinutes: localMinutes, eatWeight: eatWeight, takeaway: takeaway, kindsOf: kindsOf,
    PACE: PACE, GRADE_P: GRADE_P, GOALS: GOALS, SPACING_MS: SPACING_MS,
    _internal: { startState: startState, extend: extend, beam: beam, afterBlocks: afterBlocks, withGoal: withGoal }
  };
});
