/*! Veterans Day route engine v1.0 · The Intelligence Company · pure functions: no DOM, no network, no storage.
 *  Browser: window.VDEngine. Node (tests): require("./engine.js").
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
  var FULL_MS = 2.5 * HOUR, DECAY_MIN = 120, LINE_FRESH_MS = 40 * MIN, OUT_FRESH_MS = 6 * HOUR;
  var PACE = { relaxed: 0.5, balanced: 0.25, max: 0.1 }; // dollars of value a minute of your day is worth

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
    var ok = el.indexOf(st) >= 0 || (st === "retired" && el.indexOf("veteran") >= 0);
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
  var PROOF = { military_id: "military ID", dd214: "DD-214", va_card: "VA ID card", dl_veteran: "veteran driver's licence",
    photo_in_uniform: "photo in uniform", idme_online: "ID.me" };
  function proofLabel(p) { return PROOF[p] || p.replace(/_/g, " "); }

  // ---------------------------------------------------------------- preparing a run
  // data: {offers: [...], places: [...], drive: {...}, tzOffsetMin}
  // profile: {status, spouse, kids, proof: {}, ready: {}, pace, dayEnd(ms), mealsMax, roads, blocks: [{start,end}]}
  // state: {done: {offerId: {r: "worked"|"away", t, place}}, away: {placeId: t}, strikes: {offerId: {n, until}},
  //         vetoed: {offerId: true}, pinned: {offerId: true}, prefs: {category: weight}}
  // reports: {place: {placeId: [events]}, offer: {offerId: [events]}}
  // overrides: {id: {status: "dead"|"caution", note}} for an offer or a place (set by the operators on the day)
  function prepare(data, profile, state, reports, now, pos, overrides) {
    overrides = overrides || {};
    reports = reports || { place: {}, offer: {} };
    var offersById = {}, cands = [], excluded = {};
    data.offers.forEach(function (o) { offersById[o.id] = o; });
    var meals = 0, fullUntil = 0, snacks = 0;
    Object.keys(state.done || {}).forEach(function (id) {
      var d = state.done[id], o = offersById[id];
      if (o && d.r === "worked" && o.meal && o.dineIn) { meals++; fullUntil = Math.max(fullUntil, d.t + FULL_MS); }
      if (o && d.r === "worked" && o.snack && now - d.t < 3 * HOUR) snacks++;
    });
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
      // The deal's own hours inside the store's; if they don't overlap (Texas Roadhouse hands out vouchers at lunch
      // though the dining room opens at 4), the deal's own hours win.
      var open = Math.max(o.start || 0, pl.open), close = Math.min(o.end || Infinity, pl.close);
      if (close <= open && o.start && o.end) { open = o.start; close = o.end; }
      if (!why && close - ARRIVE_BY_MS <= now) why = "over for today";
      if (why) { excluded[pl.id] = why; return; }
      var conf = confidence(o, pl.id, reports, now);
      var pref = state.prefs && state.prefs[o.category] !== undefined ? state.prefs[o.category] : 1;
      if (pref <= 0) { excluded[pl.id] = "category off"; return; }
      var flags = el.flags.slice();
      if (state.done && state.done[o.id] && state.done[o.id].r === "away") flags.push("Turned away at another location");
      if (o.caution) flags.push(o.caution);
      if (overrides[o.id] && overrides[o.id].status === "caution") flags.push(overrides[o.id].note);
      if (overrides[pl.id] && overrides[pl.id].status === "caution") flags.push(overrides[pl.id].note);
      if (conf.ranOut) flags.push("Reported run out");
      var retry = state.done && state.done[o.id] && state.done[o.id].r === "away" ? 0.6 : 1;
      cands.push({
        i: i, place: pl, offer: o, open: open, close: close, conf: conf, flags: flags,
        // worth: what a stop is worth to the planner when it has no dollar value (a ceremony)
        base: (o.worth !== undefined ? o.worth : o.value) * el.mult * el.f * conf.p * pref * retry * (o.caution ? 0.7 : 1),
        pinned: !!(state.pinned && state.pinned[o.id])
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
      meals: meals, fullUntil: fullUntil, snacks: snacks
    };
  }

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

  // One stop from a search state; null if you can't make it.
  function evalStop(ctx, st, c) {
    var leave = afterBlocks(ctx, st.t), d = driveMs(ctx, st, c);
    if (!isFinite(d)) return null;
    var o = c.offer, arrive, start, depart, queue = 0;
    for (var tries = 0; tries < 4; tries++) {
      arrive = leave + d;
      start = Math.max(arrive, c.open);
      if (start > c.close - ARRIVE_BY_MS) return null;
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
    if (start - arrive > MAX_WAIT_MS) return null;
    if (depart > ctx.dayEnd) return null;
    var full = 1;
    if (o.meal && o.dineIn) {
      if (st.meals >= ctx.mealsMax) full = 0.05;
      else if (start < st.fullUntil) full = 0.25;
    } else if (o.meal && start < st.fullUntil) full = 0.8; // to go: save it for later
    if (o.snack) full *= Math.pow(0.85, st.snacks); // each quick bite already eaten makes the next one worth less
    var ev = c.base * full;
    // Driving and lines cost the full rate; time at the stop itself (eating, a haircut) a third of it, since that is
    // the point of going. Waiting for a window to open costs the full rate for 20 minutes, then counts as free time
    // (the plan says "free until …" and you leave later).
    var waitMin = (start - arrive) / MIN;
    var cost = (d / MIN + queue + Math.min(waitMin, 20) + 0.1 * Math.max(0, waitMin - 20) + 0.3 * o.minutes) * ctx.lambda;
    var gain = ev - cost + (c.pinned ? 40 : 0);
    return {
      c: c, leave: leave, arrive: arrive, start: start, depart: depart,
      driveMin: d / MIN, waitMin: (start - arrive) / MIN, queueMin: queue,
      slackMin: (c.close - ARRIVE_BY_MS - arrive) / MIN, arriveBy: c.close - ARRIVE_BY_MS,
      ev: ev, full: full, gain: gain
    };
  }

  function startState(ctx, t, at) {
    return { t: t, at: at === undefined ? -1 : at, used: {}, meals: ctx.meals, fullUntil: ctx.fullUntil, snacks: ctx.snacks, steps: [], score: 0, key: "" };
  }
  function extend(st, step) {
    var o = step.c.offer, used = {};
    for (var k in st.used) used[k] = 1;
    used[o.id] = 1;
    if (o.group) used["g:" + o.group] = 1; // one of a kind a day (a haircut)
    var meal = o.meal && o.dineIn;
    return {
      t: step.depart, at: step.c.i, used: used,
      meals: st.meals + (meal ? 1 : 0), fullUntil: meal ? step.depart + FULL_MS : st.fullUntil, snacks: st.snacks + (o.snack ? 1 : 0),
      steps: st.steps.concat([step]), score: st.score + step.gain,
      key: Object.keys(used).sort().join(",") + "@" + step.c.i
    };
  }

  function beam(ctx, start, width, depth) {
    var states = [start], best = start;
    for (var dpt = 0; dpt < depth && states.length; dpt++) {
      var next = [];
      for (var s = 0; s < states.length; s++) {
        var st = states[s];
        for (var j = 0; j < ctx.cands.length; j++) {
          var c = ctx.cands[j];
          if (st.used[c.offer.id] || (c.offer.group && st.used["g:" + c.offer.group])) continue;
          var step = evalStop(ctx, st, c);
          if (!step || step.gain <= 0) continue;
          next.push(extend(st, step));
        }
      }
      next.sort(function (a, b) { return b.score - a.score; });
      var seen = {}, kept = [];
      for (var n = 0; n < next.length && kept.length < width; n++) {
        if (seen[next[n].key]) continue;
        seen[next[n].key] = 1; kept.push(next[n]);
      }
      states = kept;
      if (kept.length && kept[0].score > best.score) best = kept[0];
    }
    return best;
  }

  // Ranked choices for where to go next: each first stop scored with the best few stops that could follow it.
  // One entry per offer (its best location).
  function nextOptions(ctx, opts) {
    opts = opts || {};
    var start = startState(ctx, opts.t || ctx.now, opts.at), byOffer = {};
    // First stops: the two best locations of each offer, then the most promising few get the look-ahead.
    var firsts = [], perOffer = {};
    ctx.cands.forEach(function (c) {
      var step = evalStop(ctx, start, c);
      if (step && step.gain > 0) firsts.push(step);
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

  // A whole day from a start time and place (position or place index).
  function planDay(ctx, opts) {
    opts = opts || {};
    var best = beam(ctx, startState(ctx, opts.t || ctx.now, opts.at), opts.width || 10, opts.depth || 24);
    var value = best.steps.reduce(function (s, x) { return s + x.c.offer.value * (x.full < 1 ? 1 : 1); }, 0);
    return { steps: best.steps, score: best.score, value: value };
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
    version: "1.0", km: km, fromPosition: fromPosition, stats: stats, confidence: confidence, eligibility: eligibility,
    proofLabel: proofLabel, prepare: prepare, evalStop: evalStop, nextOptions: nextOptions, planDay: planDay,
    learn: learn, strike: strike, localMinutes: localMinutes, PACE: PACE, GRADE_P: GRADE_P,
    _internal: { startState: startState, extend: extend, beam: beam, afterBlocks: afterBlocks }
  };
});
