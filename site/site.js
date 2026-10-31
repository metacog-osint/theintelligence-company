// The Intelligence Company hub: time settings, the "Updated" date and the latest lines from the products.
// No dependencies. Text from the feeds is inserted as text, never as HTML. A feed that fails leaves the static line.
(function () {
  "use strict";
  var T = window.TicTime;
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var NOISEFLOOR = "https://noisefloor.theintelligence.company/data/board.json";
  var WATCHFLOOR = "https://mc-api-odg3xhcd4a-uc.a.run.app/summary"; // Watchfloor's public API; newest built day

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
  }).catch(function () { /* keep the static line */ });

  // Watchfloor: the conflict zone furthest above its usual coverage, if Watchfloor raised an alarm for it.
  // The same request also feeds the live counts in the layers drawing (oe/oe.js).
  window.ticWatchfloor = getJSON(WATCHFLOOR);
  window.ticWatchfloor.then(function (s) {
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
