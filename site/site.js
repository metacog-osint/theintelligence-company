// The Intelligence Company hub: time settings, the "Updated" date and the latest lines from the products.
// No dependencies. Text from the feeds is inserted as text, never as HTML. A feed that fails leaves the static line.
(function () {
  "use strict";
  var T = window.TicTime;
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var NOISEFLOOR = "https://noisefloor.theintelligence.company/data/board.json";
  var WATCHFLOOR = "https://mc-api-odg3xhcd4a-uc.a.run.app/summary"; // Watchfloor's public API; newest built day
  var VIGIL = "https://vigil.theintelligence.company/api/summary"; // Vigil's public daily summary; 503 when unsure
  var COP_HEALTH = "https://cop.theintelligence.company/data/health.json"; // COP's check of every program's feed
  var ELEMENTS_FEED = "https://elements.theintelligence.company/data/feed.geojson"; // read by HEAD only (Last-Modified)
  var CORDON_FEED = "https://cordon.theintelligence.company/data/feed.geojson";
  var VIS_FEED = "https://vis.theintelligence.company/data/feed.geojson"; // about 8 KB compressed; read for generated_at
  var BLACKOUT_FEED = "https://blackout.theintelligence.company/data/feed.geojson"; // also Cloudflare Pages; read whole
  var HEADWIND_FEED = "https://headwind.theintelligence.company/data/feed.geojson"; // Cloudflare Pages too; read whole
  var ORBIT_FEED = "https://orbit.theintelligence.company/data/feed.geojson"; // Cloudflare Pages too; read whole
  var LAUNCH_FEED = "https://launch.theintelligence.company/data/feed.geojson"; // Cloudflare Pages too; read whole
  var UNDERTOW_FEED = "https://undertow.theintelligence.company/data/feed.geojson"; // Cloudflare Pages too; read whole
  var WAKE_FEED = "https://wake.theintelligence.company/data/feed.geojson"; // Cloudflare Pages too; read whole

  // Time: the Time button (it names the viewer's zone) and every <time data-tic>.
  var holder = document.getElementById("time-settings");
  if (T) {
    if (holder) T.mountSettings(holder);
    T.renderAll(document);
    T.onChange(function () { T.renderAll(document); });
  }

  // "2026-10-27" -> "27 Oct 2026" (a UTC data day, shown as a plain date)
  function plainDay(iso) {
    var p = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
    return p ? Number(p[3]) + " " + MONTHS[Number(p[2]) - 1] + " " + p[1] : "";
  }
  function getJSON(url) {
    var ctl = "AbortController" in window ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, 8000) : null;
    return fetch(url, ctl ? { signal: ctl.signal } : {}).then(function (r) {
      if (timer) clearTimeout(timer);
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }
  // The latest-modified time of a file, read with HEAD so a large feed isn't downloaded. Last-Modified is one of the
  // headers a browser always lets another site read.
  function getModified(url) {
    var ctl = "AbortController" in window ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, 8000) : null;
    return fetch(url, ctl ? { method: "HEAD", signal: ctl.signal } : { method: "HEAD" }).then(function (r) {
      if (timer) clearTimeout(timer);
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.headers.get("last-modified");
    });
  }

  // "Updated 2 h ago" under each live program in the list, from the most direct time each one publishes (see the
  // calls below). The full time, in the viewer's zone and named, is in the tooltip. When that time is older than the
  // program's usual cycle (COP health's fresh_hours), the line adds "running late". It judges the same time the line
  // shows: COP's own state judges the newest data instead, and mixing the two read "Updated 2 min ago, running late".
  // Programs without a feed (PropertyCast, Title 10, Listening Post) show nothing.
  var fresh = {}, cycle = {};
  function isLate(k) { return cycle[k] > 0 && fresh[k] && (Date.now() - fresh[k].t) / 3600000 > cycle[k]; }
  function ago(t) {
    var mins = Math.round((Date.now() - t) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return mins + " min ago";
    var h = Math.round(mins / 60);
    return h < 48 ? h + " h ago" : Math.round(h / 24) + " days ago";
  }
  function paintFresh() {
    Object.keys(fresh).forEach(function (k) {
      var f = fresh[k];
      var l = isLate(k);
      f.el.textContent = "Updated " + ago(f.t) + (l ? " · running late" : "");
      f.el.classList.toggle("late", l);
      if (T) f.el.title = T.format(f.iso, { year: true }) +
        (l ? " (it usually updates at least every " + cycle[k] + " h)" : "");
    });
  }
  function setFresh(product, when) {
    var t = Date.parse(when || "");
    var what = document.querySelector('.plist [data-product="' + product + '"] .p-what');
    if (!what || isNaN(t)) return;
    var f = fresh[product];
    if (!f) {
      f = fresh[product] = { el: document.createElement("time") };
      f.el.className = "p-fresh";
      what.appendChild(f.el);
    }
    f.t = t;
    f.iso = new Date(t).toISOString();
    f.el.setAttribute("datetime", f.iso);
    paintFresh();
  }
  setInterval(paintFresh, 60000);
  if (T) T.onChange(paintFresh);

  function setItem(id, meta, text) {
    var el = document.getElementById(id);
    if (!el || !text) return;
    el.querySelector(".latest-meta").textContent = meta;
    el.querySelector(".latest-body").textContent = text; // the topic lead-in ("GPS interference:") stays
  }

  // COP: its own build time, Context's (COP reads Context's feed; Context has no small file of its own), and any
  // program's usual cycle (fresh_hours). Shared with oe/oe.js through window.ticCopHealth.
  window.ticCopHealth = getJSON(COP_HEALTH);
  window.ticCopHealth.then(function (h) {
    setFresh("cop", h.generated_at);
    var progs = h.programs || [];
    var current = progs.filter(function (p) { return p.state === "fresh"; }).length;
    var placed = progs.reduce(function (acc, p) { return acc + (Number(p.placed) || 0); }, 0);
    var day = plainDay(h.generated_at);
    if (progs.length) {
      setItem("latest-cop", "COP" + (day ? " · " + day : ""),
        current + " of " + progs.length + " program feeds up to date, with " + placed.toLocaleString("en-US") +
        " findings placed on the map.");
    }
    progs.forEach(function (p) {
      if (p.id === "context") setFresh("context", p.data_as_of);
      if (Number(p.fresh_hours) > 0) cycle[p.id] = Number(p.fresh_hours);
    });
    paintFresh();
  }).catch(function () { /* no line for these */ });
  // Elements and Cordon: when their feed was last published.
  getModified(ELEMENTS_FEED).then(function (m) { setFresh("elements", m); }).catch(function () {});
  getModified(CORDON_FEED).then(function (m) { setFresh("cordon", m); }).catch(function () {});
  // Vis: its feed's generated_at. Cloudflare Pages sends no Last-Modified, so the feed itself is read (168 KB,
  // about 8 KB as served compressed).
  getJSON(VIS_FEED).then(function (f) { setFresh("vis", f.generated_at); }).catch(function () {});
  // Blackout: the same, for the same reason (about 40 KB, about 5 KB as served compressed).
  getJSON(BLACKOUT_FEED).then(function (f) { setFresh("blackout", f.generated_at); }).catch(function () {});
  // Headwind: the same (about 150 KB, about 8 KB as served compressed).
  getJSON(HEADWIND_FEED).then(function (f) { setFresh("headwind", f.generated_at); }).catch(function () {});
  // Orbit: the same (about 50 KB, about 5 KB as served compressed).
  getJSON(ORBIT_FEED).then(function (f) { setFresh("orbit", f.generated_at); }).catch(function () {});
  // Launch: the same (about 10 KB).
  getJSON(LAUNCH_FEED).then(function (f) { setFresh("launch", f.generated_at); }).catch(function () {});
  // Undertow: the same (about 1.9 MB, about 65 KB as served compressed).
  getJSON(UNDERTOW_FEED).then(function (f) { setFresh("undertow", f.generated_at); }).catch(function () {});
  // Wake: the same (about 100 KB; built by hand once a week).
  getJSON(WAKE_FEED).then(function (f) { setFresh("wake", f.generated_at); }).catch(function () {});

  // Noisefloor: the briefing's bottom line for the newest aircraft day. Shared with oe/oe.js.
  window.ticNoisefloor = getJSON(NOISEFLOOR);
  window.ticNoisefloor.then(function (b) {
    var day = plainDay(b.freshness && b.freshness.aircraft_day);
    setItem("latest-noisefloor", "Noisefloor" + (day ? " · " + day : ""), b.brief);
    setFresh("noisefloor", b.built_utc || (b.freshness && b.freshness.board_built));
  }).catch(function () { /* keep the static line */ });

  // Vigil: new victim claims on ransomware leak sites for the latest complete day. `brief` comes with group names
  // taken from criminal leak sites, so it is inserted as text only (setItem). `day` is RansomLook's calendar day,
  // which runs one to two hours ahead of UTC, so it is shown as a plain date and never labelled UTC. "Updated … ago"
  // is `data_as_of`, Vigil's last successful RansomLook run; `built_at` is only when the summary was assembled, so it
  // always read "just now", and is the fallback for a response without `data_as_of`.
  window.ticVigil = getJSON(VIGIL);
  window.ticVigil.then(function (v) {
    var day = plainDay(v.day);
    setItem("latest-vigil", "Vigil" + (day ? " · " + day : ""), v.brief);
    setFresh("vigil", v.data_as_of || v.built_at);
  }).catch(function () {
    // Keep the static line, but say how old Vigil's newest data is, from COP's health check.
    window.ticCopHealth.then(function (h) {
      (h.programs || []).forEach(function (p) { if (p.id === "vigil") setFresh("vigil", p.data_as_of); });
    }).catch(function () {});
  });

  // Watchfloor: the conflict zone furthest above its usual coverage, if Watchfloor raised an alarm for it.
  // The same request also feeds the live counts in the layers drawing (oe/oe.js).
  window.ticWatchfloor = getJSON(WATCHFLOOR);
  window.ticWatchfloor.then(function (s) {
    setFresh("watchfloor", s.built_at);
    var zones = [];
    Object.keys(s.entities || {}).forEach(function (k) {
      var v = s.entities[k];
      if (/^T\d/.test(k) || !v || !v.attention || typeof v.attention.z !== "number") return; // topics start with T
      zones.push(v);
    });
    if (!zones.length) return;
    zones.sort(function (a, b) { return b.attention.z - a.attention.z; });
    var top = zones[0];
    var text = top.alarms && top.alarms.length
      ? top.name + " drew " + top.attention.ratio.toFixed(2) + " times its usual news coverage, the furthest above normal of any zone."
      : "No conflict zone's news coverage stood out from its usual level.";
    var day = plainDay(s.day);
    setItem("latest-watchfloor", "Watchfloor" + (day ? " · " + day + (s.partial ? ", so far" : "") : ""), text);
  }).catch(function () { /* keep the static line */ });
})();
