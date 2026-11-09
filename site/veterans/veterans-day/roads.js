/*! Veterans Day route lines v1.0 · The Intelligence Company · the road shapes for the Map's route line.
 *  Browser: window.VDRoads. Node (tests): require("./roads.js").
 *
 *  Privacy: this file only ever sees stores, which are public places, never where you are. The app draws the leg
 *  from you to your first stop itself, straight, on the phone. The legs between stores come from OSRM's public
 *  server (run by FOSSGIS), which asks for at most one request a second. So one request covers every leg the route
 *  is missing, each leg is kept for the visit (marking a stop or a re-plan that reuses legs sends nothing), a request
 *  gives up after 8 seconds, and a leg that failed waits a minute before it is asked for again. Until a leg's road
 *  shape arrives, or if it never does, the leg is drawn straight.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.VDRoads = factory();
}(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var ROUTER = "https://router.project-osrm.org";
  var GAP = 1000, TIMEOUT = 8000, RETRY = 60000, MAX_STOPS = 40;

  function legKey(a, b) { return a.id + ">" + b.id; }
  function pt(s) { return [s.lat, s.lng]; }
  function num(v) { return typeof v === "number" && isFinite(v); }

  // The request for a run of stops: store coordinates only, in route order.
  function url(stops) {
    return ROUTER + "/route/v1/driving/" + stops.map(function (s) { return s.lng + "," + s.lat; }).join(";") +
      "?overview=full&geometries=geojson&annotations=distance&steps=false";
  }

  // The stretch of the route one request should cover: from the first leg with no road shape to the last, leaving
  // out legs that failed in the last minute. null when nothing is missing.
  function span(stops, have, failedAt, t) {
    var a = -1, b = -1;
    for (var i = 0; i + 1 < stops.length; i++) {
      var k = legKey(stops[i], stops[i + 1]);
      if (have.has(k) || (failedAt.has(k) && t - failedAt.get(k) < RETRY)) continue;
      if (a < 0) a = i;
      b = i;
    }
    return a < 0 ? null : stops.slice(a, Math.min(b + 2, a + MAX_STOPS));
  }

  // OSRM answers with one line for the whole run. Leg i has as many segments as its annotation has distances, and
  // neighbouring legs share the point where they join (checked against the live server, 9 Nov 2026). Each leg's line
  // starts and ends at the stores themselves, not where OSRM met the road, so it touches the pins. Throws when the
  // answer doesn't fit the request.
  function splitLegs(stops, j) {
    var r = j && j.code === "Ok" && j.routes && j.routes[0];
    var c = r && r.geometry && r.geometry.coordinates;
    if (!c || !r.legs || r.legs.length !== stops.length - 1) throw new Error("unexpected answer from the router");
    var out = [], at = 0;
    r.legs.forEach(function (leg, i) {
      var n = leg.annotation && leg.annotation.distance ? leg.annotation.distance.length : -1;
      if (n < 0 || at + n >= c.length) throw new Error("leg " + i + " doesn't fit the line");
      var line = [pt(stops[i])];
      for (var k = at; k <= at + n; k++) {
        if (!c[k] || !num(c[k][0]) || !num(c[k][1])) throw new Error("bad point in leg " + i);
        line.push([c[k][1], c[k][0]]);
      }
      line.push(pt(stops[i + 1]));
      out.push([legKey(stops[i], stops[i + 1]), line]);
      at += n;
    });
    if (at !== c.length - 1) throw new Error("the line is longer than its legs");
    return out;
  }

  // What to draw: runs of consecutive legs, each by road (its shape is in) or straight (it isn't).
  function lines(stops, have) {
    var out = [];
    for (var i = 0; i + 1 < stops.length; i++) {
      var shape = have.get(legKey(stops[i], stops[i + 1]));
      var road = !!shape, pts = shape || [pt(stops[i]), pt(stops[i + 1])];
      var last = out[out.length - 1];
      if (last && last.road === road) last.pts = last.pts.concat(pts.slice(1));
      else out.push({ road: road, pts: pts.slice() });
    }
    return out;
  }

  // One per page. opts: fetch, onUpdate (called when road shapes arrive); for tests also now, setTimeout and
  // clearTimeout.
  function create(opts) {
    var o = opts || {};
    var get = o.fetch, onUpdate = o.onUpdate || function () {};
    var clock = o.now || (typeof performance !== "undefined" && performance.now ? function () { return performance.now(); } : Date.now);
    var later = o.setTimeout || setTimeout, cancel = o.clearTimeout || clearTimeout;
    var have = new Map(), failedAt = new Map();
    var wanted = [], busy = false, lastAt = -Infinity, timer = null, requests = 0;

    // The route the Map shows now, or [] when the Map is hidden, so nothing more is asked for. Only each stop's id
    // and coordinates are kept.
    function want(stops) {
      wanted = (stops || []).map(function (s) { return { id: s.id, lat: s.lat, lng: s.lng }; });
      pump();
    }
    function pump() {
      if (busy || timer !== null || !get) return;
      var run = span(wanted, have, failedAt, clock());
      if (!run) return;
      var left = lastAt + GAP - clock();
      if (left > 0) { timer = later(function () { timer = null; pump(); }, left); return; }
      busy = true; lastAt = clock(); requests++;
      var ctl = typeof AbortController === "function" ? new AbortController() : null, stop = null;
      var timeout = new Promise(function (resolve, reject) {
        stop = later(function () { if (ctl) ctl.abort(); reject(new Error("the router took too long")); }, TIMEOUT);
      });
      var answer = Promise.resolve()
        .then(function () { return get(url(run), { signal: ctl ? ctl.signal : undefined, credentials: "omit" }); })
        .then(function (r) { if (!r.ok) throw new Error("router " + r.status); return r.json(); });
      Promise.race([answer, timeout])
        .then(function (j) {
          splitLegs(run, j).forEach(function (x) { have.set(x[0], x[1]); failedAt.delete(x[0]); });
          return true;
        })
        .catch(function () {
          var t = clock();
          for (var i = 0; i + 1 < run.length; i++) failedAt.set(legKey(run[i], run[i + 1]), t);
          return false;
        })
        .then(function (ok) {
          cancel(stop);
          busy = false;
          if (ok) onUpdate();
          pump();
        });
    }
    return {
      want: want,
      lines: function (stops) { return lines(stops, have); },
      stats: function () { return { requests: requests, legs: have.size, busy: busy, waiting: timer !== null }; }
    };
  }

  return { version: "1.0", ROUTER: ROUTER, GAP: GAP, TIMEOUT: TIMEOUT, RETRY: RETRY, MAX_STOPS: MAX_STOPS,
    legKey: legKey, url: url, span: span, splitLegs: splitLegs, lines: lines, create: create };
}));
