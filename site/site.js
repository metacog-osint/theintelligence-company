// The Intelligence Company hub: time settings, the "Updated" date and the latest lines from the products.
// No dependencies. Text from the feeds is inserted as text, never as HTML. A feed that fails leaves the static line.
(function () {
  "use strict";
  var T = window.TicTime;
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var NOISEFLOOR = "https://noisefloor.theintelligence.company/data/board.json";
  var WATCHFLOOR = "https://mc-api-odg3xhcd4a-uc.a.run.app/summary"; // Watchfloor's public API; newest built day
  var VIGIL = "https://vigil.theintelligence.company/api/summary"; // Vigil's public daily summary; 503 when unsure

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
  // "Updated 2 h ago" under a product in the list, from the build time its feed reports. The full time, in the
  // viewer's zone and named, is in the tooltip. Products without a feed show nothing.
  var fresh = [];
  function ago(t) {
    var mins = Math.round((Date.now() - t) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return mins + " min ago";
    var h = Math.round(mins / 60);
    return h < 48 ? h + " h ago" : Math.round(h / 24) + " days ago";
  }
  function paintFresh() {
    fresh.forEach(function (f) {
      f.el.textContent = "Updated " + ago(f.t);
      if (T) f.el.title = T.format(f.iso, { year: true });
    });
  }
  function setFresh(product, iso) {
    var t = Date.parse(iso || "");
    var what = document.querySelector('.plist [data-product="' + product + '"] .p-what');
    if (!what || isNaN(t)) return;
    var el = document.createElement("time");
    el.className = "p-fresh";
    el.setAttribute("datetime", iso);
    what.appendChild(el);
    fresh.push({ el: el, t: t, iso: iso });
    paintFresh();
  }
  setInterval(paintFresh, 60000);
  if (T) T.onChange(paintFresh);

  function setItem(id, meta, text) {
    var el = document.getElementById(id);
    if (!el || !text) return;
    el.querySelector(".latest-meta").textContent = meta;
    el.querySelector(".latest-text").textContent = text;
  }

  // Noisefloor: the briefing's bottom line for the newest aircraft day.
  getJSON(NOISEFLOOR).then(function (b) {
    var day = plainDay(b.freshness && b.freshness.aircraft_day);
    setItem("latest-noisefloor", "Noisefloor" + (day ? " · " + day : ""), b.brief);
    setFresh("noisefloor", b.built_utc || (b.freshness && b.freshness.board_built));
  }).catch(function () { /* keep the static line */ });

  // Vigil: new victim claims on ransomware leak sites for the latest complete day. `brief` comes with group names
  // taken from criminal leak sites, so it is inserted as text only (setItem). `day` is RansomLook's calendar day,
  // which runs one to two hours ahead of UTC, so it is shown as a plain date and never labelled UTC.
  getJSON(VIGIL).then(function (v) {
    var day = plainDay(v.day);
    setItem("latest-vigil", "Vigil" + (day ? " · " + day : ""), v.brief);
    setFresh("vigil", v.built_at);
  }).catch(function () { /* keep the static line */ });

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
