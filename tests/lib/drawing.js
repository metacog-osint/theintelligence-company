// Geometry of the "How the programs fit" drawing, for checking that its labels are readable and clean: every visible
// label and program tag as a screen polygon (its box through its own transform, so tilted labels are exact), the
// plates as polygons, and which plate each label sits on.

// Runs in the page. Returns { labels, tags, plates }.
export function readDrawing() {
  const svg = document.getElementById("oe-svg");
  const shown = (el) => {
    for (let e = el; e && e !== svg.parentNode; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) return false;
    }
    return true;
  };
  const toScreen = (el, pts) => {
    const m = el.getScreenCTM();
    return pts.map(([x, y]) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]);
  };
  const box = (el, b = el.getBBox()) => toScreen(el, [[b.x, b.y], [b.x + b.width, b.y], [b.x + b.width, b.y + b.height], [b.x, b.y + b.height]]);
  const plates = [...svg.querySelectorAll(".pl")].map((pl, order) => ({
    order, layer: pl.getAttribute("data-layer"),
    // filled shapes only: outlines (fill="none") don't hide anything
    faces: [...pl.querySelectorAll("polygon")].filter((p) => p.getAttribute("fill") && p.getAttribute("fill") !== "none")
      .map((p) => toScreen(p, p.getAttribute("points").trim().split(/[\s]+/).map((xy) => xy.split(",").map(Number)))),
  }));
  const labels = [];
  svg.querySelectorAll("text").forEach((t) => {
    if (!shown(t) || t.closest(".chip") || !t.getBBox().width) return;
    const m = t.getScreenCTM(), pl = t.closest(".pl");
    labels.push({
      name: t.textContent.trim(),
      px: parseFloat(getComputedStyle(t).fontSize) * Math.hypot(m.c, m.d), // size along the glyphs' own height
      poly: box(t),
      plate: pl ? [...svg.querySelectorAll(".pl")].indexOf(pl) : -1,
    });
  });
  const tags = [];
  svg.querySelectorAll("g.chip").forEach((g) => {
    if (!shown(g)) return;
    const id = g.getAttribute("data-p"), pill = g.querySelector("rect.pill");
    if (pill) return tags.push({ name: id, poly: box(pill) });
    const ring = g.querySelector(".ring"), t = g.querySelector("text");
    if (ring && shown(ring)) tags.push({ name: id + " ring", poly: box(ring) });
    if (t && shown(t) && t.getBBox().width) {
      const m = t.getScreenCTM();
      tags.push({ name: id, poly: box(t), px: parseFloat(getComputedStyle(t).fontSize) * Math.hypot(m.c, m.d) });
    }
  });
  const r = svg.getBoundingClientRect();
  return { labels, tags, plates, frame: [r.left, r.top, r.right, r.bottom] };
}

// ---------------------------------------------------------------- polygon helpers (node side)

function area(p) {
  let s = 0;
  for (let i = 0; i < p.length; i++) { const [a, b] = [p[i], p[(i + 1) % p.length]]; s += a[0] * b[1] - b[0] * a[1]; }
  return s / 2;
}
const ccw = (p) => (area(p) < 0 ? p.slice().reverse() : p);
// Area shared by two convex polygons (Sutherland-Hodgman clipping).
export function overlap(subject, clipper) {
  let out = ccw(subject);
  const c = ccw(clipper);
  for (let i = 0; i < c.length && out.length; i++) {
    const [a, b] = [c[i], c[(i + 1) % c.length]];
    const inside = (p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) >= 0;
    const cut = (p, q) => {
      const A1 = q[1] - p[1], B1 = p[0] - q[0], C1 = A1 * p[0] + B1 * p[1];
      const A2 = b[1] - a[1], B2 = a[0] - b[0], C2 = A2 * a[0] + B2 * a[1], d = A1 * B2 - A2 * B1;
      return [(B2 * C1 - B1 * C2) / d, (A1 * C2 - A2 * C1) / d];
    };
    const inp = out;
    out = [];
    for (let j = 0; j < inp.length; j++) {
      const p = inp[j], q = inp[(j + 1) % inp.length];
      if (inside(q)) { if (!inside(p)) out.push(cut(p, q)); out.push(q); } else if (inside(p)) out.push(cut(p, q));
    }
  }
  return out.length ? Math.abs(area(out)) : 0;
}
// Convex hull (monotone chain), for a plate's outline with its side faces.
export function hull(points) {
  const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [], upper = [];
  for (const q of p) { while (lower.length >= 2 && cross(lower.at(-2), lower.at(-1), q) <= 0) lower.pop(); lower.push(q); }
  for (const q of p.reverse()) { while (upper.length >= 2 && cross(upper.at(-2), upper.at(-1), q) <= 0) upper.pop(); upper.push(q); }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}
export const polyArea = (p) => Math.abs(area(p));

// Everything wrong with a drawing read by readDrawing(): labels or tags that overlap each other, labels that stick
// out of the plate they're drawn on or past the drawing's edge, and labels a plate drawn above them covers.
// `tolerance` is in px².
export function problems({ labels, tags, plates, frame }, tolerance = 1) {
  const out = [];
  const shapes = [...labels.map((l) => ({ ...l, kind: "label" })), ...tags.map((t) => ({ ...t, kind: "tag" }))];
  for (let i = 0; i < shapes.length; i++) {
    for (let j = i + 1; j < shapes.length; j++) {
      const a = overlap(shapes[i].poly, shapes[j].poly);
      if (a > tolerance) out.push(`"${shapes[i].name}" overlaps "${shapes[j].name}" (${a.toFixed(0)} px²)`);
    }
  }
  const [left, top, right, bottom] = frame;
  for (const s of shapes) {
    const cut = s.poly.some(([x, y]) => x < left - 0.5 || x > right + 0.5 || y < top - 0.5 || y > bottom + 0.5);
    if (cut) out.push(`"${s.name}" runs past the edge of the drawing`);
  }
  for (const l of labels) {
    if (l.plate < 0) continue;
    const own = plates[l.plate];
    const outline = hull(own.faces.flat());
    const outside = polyArea(l.poly) - overlap(l.poly, outline);
    if (outside > tolerance * 4) out.push(`"${l.name}" sticks out of its plate (${outside.toFixed(0)} px²)`);
    for (const above of plates.filter((p) => p.order > own.order)) {
      const covered = Math.max(0, ...above.faces.map((f) => overlap(l.poly, f)));
      if (covered > tolerance * 4) out.push(`"${l.name}" is covered by the ${above.layer} plate (${covered.toFixed(0)} px²)`);
    }
  }
  return out;
}
