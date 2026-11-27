// What sitecheck reads inside each loaded page. probe() runs in the page (puppeteer's page.evaluate in the Worker,
// Playwright's in a local run), so it must be self-contained: no imports, no closures over this module.
//
// It reports what a visitor would notice: whether the house bar mounted (proof the page's scripts ran), whether a
// map drew, and how much text the page shows. It reads nothing private: these are public pages.
export function probe(expect, minPx = 50) {
  // Selector by selector, the first element with a visible size (at least minPx wide and high); failing that, the
  // first element found at all, so the record shows what was there and how big it was.
  const pick = (sels) => {
    let first = null;
    for (const s of sels) {
      for (const el of document.querySelectorAll(s)) {
        const r = el.getBoundingClientRect();
        const found = { selector: s, width: Math.round(r.width), height: Math.round(r.height) };
        if (found.width >= minPx && found.height >= minPx) return found;
        if (!first) first = found;
      }
    }
    return first;
  };
  const nav = performance.getEntriesByType("navigation")[0];
  return {
    title: document.title || "",
    house_bar: !!document.querySelector(".tic-house"),
    // A map library's container, then any canvas: MapLibre, Leaflet, OpenLayers and Cesium all draw into one of these.
    map: pick([".maplibregl-map", ".leaflet-container", ".ol-viewport", ".cesium-widget", "canvas"]),
    expect: expect ? !!document.querySelector(expect) : null,
    text_chars: (document.body && document.body.innerText ? document.body.innerText.length : 0),
    load_ms: nav ? Math.round(nav.loadEventEnd || nav.domContentLoadedEventEnd || 0) : null,
  };
}
