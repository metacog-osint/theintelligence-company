// What sitecheck reads inside each loaded page. probe() runs in the page (puppeteer's page.evaluate in the Worker,
// Playwright's in a local run), so it must be self-contained: no imports, no closures over this module.
//
// It reports what a visitor would notice: whether the house bar mounted (proof the page's scripts ran), whether a
// map drew, and how much text the page shows. It reads nothing private: these are public pages.
export function probe(expect) {
  const pick = (sels) => {
    for (const s of sels) {
      const el = document.querySelector(s);
      if (el) {
        const r = el.getBoundingClientRect();
        return { selector: s, width: Math.round(r.width), height: Math.round(r.height) };
      }
    }
    return null;
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
