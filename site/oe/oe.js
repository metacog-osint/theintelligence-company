// "Every layer of the world, read together": the hub's guide to the programs, drawn on the operational environment.
// Data first (layers, programs, threads, the two groupings), then drawing and interaction. No dependencies.
// CSP-safe: no inline styles, colours come from classes in oe.css, and feed text is inserted as text.
// To add, move or rename a program, edit PROGRAMS below: `home` is its layer, `reach` the other layers it touches,
// `at` the tag's position on the drawing ([x, y] in SVG units; `end: true` puts the label left of x).
(function () {
  "use strict";
  var root = document.getElementById("layers");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg";
  var fig = document.getElementById("oe-fig");
  var svg = document.getElementById("oe-svg");
  var panel = document.getElementById("oe-panel");
  var guide = document.getElementById("oe-guide");
  var chipBar = document.getElementById("oe-chips");
  var phone = window.matchMedia("(max-width: 820px)");
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // ---------------------------------------------------------------- data
  // Layers, top to bottom. y is the plate's centre line in the drawing. Feed status: now, dev, planned, research.
  var LAYERS = [
    { k: "systems", name: "Systems", y: 340,
      sub: "Political, military, economic, social, information and infrastructure systems, and the links between them.",
      feeds: [["World news (GDELT)", "now", "Watchfloor, Context"], ["Saved news searches per zone", "now", "Watchfloor"],
        ["Travel advisories and embassy posture", "now", "Cordon"],
        ["Sanctions and export-control lists", "now", "Headwind"], ["Prices, currency and energy", "now", "Headwind"],
        ["US mineral import reliance (USGS)", "now", "Headwind"],
        ["Critical-mineral supply", "planned", "Critical minerals"], ["Governance and fragility indices", "planned", "Fragility baseline"],
        ["Treaty bodies, courts and the Security Council", "planned", "Proliferation and legal events"],
        ["Exercises and deployments", "planned", "Tempo"]] },
    { k: "human", name: "Human", y: 470,
      sub: "People and groups: who acts, what they say and believe, and how they decide, shaped by sociocultural factors.",
      feeds: [["Press attention and framing", "now", "Context"], ["Coverage split by source group", "now", "Watchfloor"],
        ["US embassy security and demonstration alerts", "now", "Cordon"],
        ["Official statements and votes", "planned", "Readout"], ["Unrest and displacement", "planned", "Temper"],
        ["Press freedom", "planned", "Temper"], ["Humanitarian appeals and funding (IFRC GO)", "now", "Relief"], ["Disease outbreak reports (WHO)", "now", "Relief"],
        ["Attributed influence operations and platform takedowns", "now", "Undertow"]],
      who: "Who's who: actors are named and described by their role (a party to a conflict, a third party, civilians) " +
        "as the cited sources describe them, and every claim is marked claimed, reported or assessed. Coverage is split " +
        "by source group, so each side's framing shows separately. Nothing is marked hostile." },
    { k: "cyber", name: "Cyberspace", y: 600,
      sub: "Networks, the services that run on them and the personas that use them.",
      feeds: [["Ransomware leak sites", "now", "Vigil"], ["Exploited vulnerabilities (CISA KEV, NVD)", "now", "Vigil"],
        ["CISA and ICS advisories", "now", "Vigil"], ["Internet outages and shutdowns (IODA, Cloudflare Radar)", "now", "Blackout"],
        ["Censorship and app blocks (OONI)", "now", "Blackout"], ["Cloud and satellite provider incidents", "now", "Blackout"],
        ["BGP hijacks and route leaks (Cloudflare Radar)", "now", "Blackout"]] },
    { k: "ems", name: "Electromagnetic spectrum", short: "Spectrum", y: 730,
      sub: "Navigation, communication and radar signals that run through every physical layer and carry the information above.",
      feeds: [["Aircraft navigation integrity (ADS-B)", "now", "Noisefloor"], ["Spoofed aircraft and ship positions", "now", "Noisefloor"],
        ["Interference seen by satellites (CYGNSS, NISAR)", "now", "Noisefloor"], ["GPS reference stations", "now", "Noisefloor"],
        ["Declared tests and interference notices", "now", "Noisefloor"], ["Ship AIS signal gaps", "dev", "Wake"],
        ["Satellite spectrum filings", "planned", "Orbit"], ["HF, satellite-link and radar interference", "research", ""]] },
    { k: "space", name: "Space", y: 860,
      sub: "Orbits, satellites, launches and space weather.",
      feeds: [["Satellite catalog (Space-Track)", "now", "Orbit"], ["Space weather (NOAA, ESA)", "now", "Noisefloor"],
        ["Ionospheric disturbance from GPS base stations", "dev", "FieldCast"],
        ["Launches, scheduled launches and reentries (GCAT, Launch Library 2)", "now", "Orbit"], ["Satellite catalog changes (GCAT)", "now", "Orbit"],
        ["GEO belt: drift, orbit changes and close pairs (Space-Track, CelesTrak)", "now", "Orbit"],
        ["Manoeuvres and counterspace events", "dev", "Orbit"], ["Launch and reentry closure areas (FAA TFRs, navigational warnings, closure history)", "now", "Launch"],
        ["Ground segment and cislunar activity", "research", ""]] },
    { k: "air", name: "Air", y: 990,
      sub: "Airspace, flights, notices to aviation and weather.",
      feeds: [["Flight tracks (ADS-B)", "now", "Noisefloor"], ["EASA conflict-zone bulletins", "now", "Noisefloor, Cordon"],
        ["FAA GPS interference tests", "now", "Noisefloor"], ["Storm warnings (NHC, SPC)", "now", "Elements"],
        ["Operational weather and illumination", "now", "Vis"], ["NOTAMs", "planned", "Cordon"],
        ["Military flights", "planned", "Tempo"]] },
    { k: "land", name: "Land and maritime", y: 1120,
      sub: "Terrain, settlements, infrastructure, coasts and sea lanes, down to the seabed.",
      feeds: [["Conflict events (GDELT)", "now", "Watchfloor"], ["Ship positions (Finland's open AIS)", "now", "Noisefloor, Wake"],
        ["Navigational warnings (NGA)", "now", "Noisefloor, Cordon"], ["Quakes, volcanoes, fires and floods", "now", "Elements"],
        ["Chokepoint transit volume (IMF PortWatch)", "now", "Wake"], ["Port throughput (IMF PortWatch)", "dev", "Wake"], ["Undersea cable corridors", "now", "Blackout, Wake"],
        ["Power: a nuclear plant's off-site power, US outages and grid demand", "now", "Blackout"],
        ["Night lights (NASA Black Marble)", "dev", "Blackout"]] }
  ];
  var LK = LAYERS.map(function (l) { return l.k; });
  var L = {};
  LAYERS.forEach(function (l) { L[l.k] = l; });

  // Programs. status: live, beta, dev, planned. core: reads every layer. working: a working name, not final.
  var PROGRAMS = [
    { id: "cop", name: "COP", status: "beta", core: true, at: [652, 196],
      href: "https://cop.theintelligence.company", ask: "What stands out across every program today?",
      line: "The common operational picture: every layer's findings on one map, so a place or topic that turns up in more than one layer stands out. Outages are already read against hazards, notices and press attention in the same country; convergence scoring, checked by Verdict, is in development." },
    { id: "verdict", name: "Verdict", status: "dev", core: true, at: [772, 196],
      ask: "How accurate are the forecasts?",
      line: "Logs every forecast and warning with the rule that will settle it, syncs the event calendar, and scores calibration in public." },

    { id: "watchfloor", name: "Watchfloor", status: "beta", home: "systems", reach: LK.slice(1), at: [800, 300],
      href: "https://watchfloor.theintelligence.company", ask: "Which conflicts are escalating?",
      line: "A daily warning picture for the conflict zones and strategic topics on its watch list, built from the world's news and split by source group." },
    { id: "tempo", name: "Tempo", status: "planned", home: "systems", reach: ["air", "land", "space"], at: [728, 322], end: true,
      line: "Military activity: exercises, deployments and flights." },
    { id: "headwind", name: "Headwind", status: "beta", home: "systems", reach: ["land"], at: [905, 336],
      href: "https://headwind.theintelligence.company", ask: "Which currencies, prices or sanctions lists moved?",
      line: "Economic stress as measurements. Currencies, energy prices and food prices are each compared with their own past changes and marked unusual only when far outside them. Changes to the OFAC and UN Security Council sanctions lists and twelve US screening lists are given as counts, with sanctioned vessels named. Also new BIS and OFAC rules from the Federal Register, US import reliance for minerals, and a calendar of coming decisions. Not forecasts and not investment advice." },
    { id: "minerals", name: "Critical minerals", status: "planned", working: true, home: "systems", reach: ["land"], at: [905, 378],
      line: "Critical-mineral lists, supply and import dependence. It may become part of Headwind." },
    { id: "fragility", name: "Fragility baseline", status: "planned", working: true, home: "systems", reach: ["human"], at: [596, 362], end: true,
      line: "Slow-moving context: governance, fragility tiers and organised crime." },
    { id: "prolif", name: "Proliferation and legal events", short: "Proliferation and legal", status: "planned", working: true,
      home: "systems", reach: ["land"], at: [740, 262], end: true,
      line: "Treaty-body findings, sanctions regimes, and court and Security Council actions." },

    { id: "context", name: "Context", status: "live", home: "human", reach: ["systems", "cyber", "ems", "space", "air", "land"], at: [752, 486],
      href: "https://context.theintelligence.company", ask: "How is the world's press framing each conflict?",
      line: "How the world's press covers each watched zone and topic: attention, escalation and framing, refreshed twice a day from GDELT." },
    { id: "readout", name: "Readout", status: "planned", home: "human", reach: ["systems"], at: [694, 430], end: true,
      line: "Official statements, Security Council votes and African Union communiqués, with a check of what was said against what was done." },
    { id: "undertow", name: "Undertow", status: "beta", home: "human", reach: ["cyber", "systems"], at: [780, 426],
      href: "https://undertow.theintelligence.company", ask: "Which influence operations have platforms and governments taken down?",
      line: "Covert influence operations as the platforms and governments that disrupted them report them: Meta's takedown networks, Google's influence-operations bulletins, OpenAI's threat reports, TikTok's reports under the EU Code of Conduct, and the EEAS's named operations. Each gives the origin the publisher assessed, the targets, and the DISARM techniques described, with a STIX 2.1 export. Operations only: no account handles, links or names of individuals." },
    { id: "temper", name: "Temper", status: "planned", home: "human", reach: ["systems", "land", "cyber"], at: [880, 506],
      line: "Unrest, displacement, public attention, press freedom and pressure on civil society." },
    { id: "relief", name: "Relief", status: "beta", home: "human", reach: ["systems", "land"], at: [800, 548], end: true,
      href: "https://relief.theintelligence.company", ask: "Where are the Red Cross and Red Crescent asking for help?",
      line: "Where the Red Cross and Red Crescent are asking for help, and where WHO is reporting outbreaks: IFRC GO appeals and WHO Disease Outbreak News, as they publish them. Measurements only." },

    { id: "vigil", name: "Vigil", status: "live", home: "cyber", reach: ["systems", "human"], at: [914, 610],
      href: "https://vigil.theintelligence.company", ask: "Who is ransomware hitting?",
      line: "Cyber threat intelligence: ransomware groups and their victims, exploited vulnerabilities and advisories, with the history kept." },
    { id: "blackout", name: "Blackout", status: "beta", home: "cyber", reach: ["land", "systems", "human"], at: [690, 650],
      href: "https://blackout.theintelligence.company", ask: "Where are the lights going out and the internet going dark?",
      line: "Where the lights go out and the internet goes dark: country outages from Georgia Tech IODA and Cloudflare Radar, censorship measurements from OONI, BGP hijacks and route leaks from Cloudflare Radar, the Zaporizhzhya nuclear plant's off-site power as the IAEA reports it, US power outages by county and US grid operators' demand against their own forecasts, a watch on the Starlink, Amazon, Microsoft and Google networks and on eleven providers' own status pages, and a hand-compiled register of submarine cable corridors. A drop is called a likely shutdown only when OONI shows blocking in the same country. Night lights from NASA's Black Marble are built and start once NASA's data access is in place." },

    { id: "noisefloor", name: "Noisefloor", status: "live", home: "ems", reach: ["air", "space", "land"], at: [578, 694],
      href: "https://noisefloor.theintelligence.company", ask: "Is GPS being jammed or spoofed?",
      line: "Where GPS and other satellite navigation is jammed or spoofed, mapped every day from aircraft and ship position reports, with satellite and space-weather context." },

    { id: "fieldcast", name: "FieldCast", status: "dev", home: "space", reach: ["ems", "air", "land"], at: [610, 900],
      ask: "Will space weather throw off GPS in the field?",
      line: "An outlook for GPS reliability in the field, including high-precision (RTK) positioning, from ionospheric disturbance measured at public base stations. Validated on the May and October 2024 storms." },
    { id: "orbit", name: "Orbit", status: "beta", home: "space", reach: ["ems", "land", "systems"], at: [862, 904],
      href: "https://orbit.theintelligence.company", ask: "What launched, came down or changed in the satellite catalog?",
      line: "What changed in Earth orbit, from public catalogs: orbital launches of the last 7 and 30 days, launches scheduled for the next 14 days, reentries, and changes to the satellite catalog between Orbit's own readings, with objects in orbit counted by owner. From Jonathan McDowell's GCAT (CC BY 4.0) and The Space Devs' Launch Library 2. Measurements and reports only; Orbit adds no judgment. Updated every six hours." },
    { id: "launch", name: "Launch", status: "beta", home: "space", reach: ["air", "land"], at: [736, 930],
      href: "https://launch.theintelligence.company", ask: "Where are launch and reentry closures, and which launches do they match?",
      line: "Launch and reentry closure areas from official notices: the FAA's space-operations flight restrictions in force, scheduled launches that coincide with an announced closure area in time, in time and place, or as a launch since dated, a searchable history of closures since 2023 with each notice's own text, and where each pad's closures fall. Worldwide NOTAMs wait on FAA access." },

    { id: "cordon", name: "Cordon", status: "beta", home: "air", reach: ["land", "space", "systems", "human"], at: [756, 1036], end: true,
      href: "https://cordon.theintelligence.company", ask: "Where are authorities warning people away?",
      line: "Where authorities warn people away: State Department travel advisories and embassy departure status, EASA conflict-zone bulletins for airspace, and NGA navigational warnings at sea. NOTAMs and launch hazard areas are planned." },
    { id: "vis", name: "Vis", status: "beta", home: "air", reach: ["land", "space"], at: [560, 1018],
      href: "https://vis.theintelligence.company", ask: "Will weather or darkness limit operations?",
      line: "Operational weather and illumination for Watchfloor's conflict zones: how likely wind, poor visibility, heavy rain or snow, icing, extreme heat or cold, or low cloud are to reach indicative limits at named airfields and ports over the next 7 days, from the NOAA and ECMWF ensembles, with each night's moonlight and darkness. A thunderstorm hazard and scoring against station reports are planned." },

    { id: "elements", name: "Elements", status: "beta", home: "land", reach: ["air", "systems", "human"], at: [530, 1125],
      href: "https://elements.theintelligence.company", ask: "Where are natural hazards hitting?",
      line: "Natural hazards as the authorities report them, on one map. Worldwide: earthquakes from USGS (with impact alerts) and from EMSC's independent catalogue, NASA satellite fire detections, GDACS alerts and Copernicus disaster mapping. Regional: weather warnings for the US (NOAA) and for 38 European countries and Israel (MeteoAlarm), NOAA hurricane-center storms, and tsunami messages for North America, the Pacific and the Caribbean. US only for now: wildfire incidents (NIFC), NOAA severe-storm outlooks, the US Drought Monitor and USGS volcano alert levels. Weather for more of the world and a radiation lane are planned." },
    { id: "wake", name: "Wake", status: "beta", home: "land", reach: ["ems", "systems"], at: [900, 1152],
      href: "https://wake.theintelligence.company", ask: "What is moving through maritime chokepoints?",
      line: "Vessel transits through 28 maritime chokepoints, from Hormuz and Bab el-Mandeb to Malacca and Panama: IMF PortWatch's daily counts by ship type, as weekly means compared with the 90 days before and the same weeks a year earlier. Updated by hand once a week. Measurements only. Planned: port throughput, Baltic open AIS gaps and undersea cable corridors." }
  ];
  var P = {};
  PROGRAMS.forEach(function (p) { P[p.id] = p; if (p.core) { p.home = null; p.reach = LK.slice(); } });
  // The guide: three questions, one per band of the drawing (top, middle, bottom). Each opens to the questions of the
  // programs under it. Every program with an `ask` belongs to exactly one group; sites first, then in development.
  var GROUPS = [
    { id: "g1", q: "Where is conflict or pressure building?", layers: ["systems", "human"],
      programs: ["cop", "watchfloor", "context", "undertow", "relief", "headwind", "verdict"] },
    { id: "g2", q: "What's hitting networks, signals and satellites?", layers: ["cyber", "ems", "space"],
      programs: ["vigil", "noisefloor", "blackout", "fieldcast", "orbit", "launch"] },
    { id: "g3", q: "What's happening on the ground, at sea and in the air?", layers: ["air", "land"],
      programs: ["cordon", "elements", "vis", "wake"] }
  ];
  var G = {};
  GROUPS.forEach(function (g) { G[g.id] = g; });
  var GUIDE = [];
  GROUPS.forEach(function (g) { g.programs.forEach(function (id) { GUIDE.push(P[id]); }); });

  // Cross-layer threads (.th in the SVG, in DOM order t0..t5): how tips move between layers and programs.
  var THREADS = {
    t0: {
      name: "Seabed cables to network outages",
      layers: ["land", "cyber", "systems"],
      programs: ["wake", "blackout", "watchfloor", "cop"],
      line: "An NGA cable-work warning or loitering vessel over a submarine cable corridor (Wake) pairs with a country-level BGP or probing drop (Blackout) and tips Watchfloor's infrastructure indicators."
    },
    t1: {
      name: "Contested airspace and navigation",
      layers: ["air", "ems", "human", "systems"],
      programs: ["cordon", "noisefloor", "watchfloor", "cop"],
      line: "Aircraft losing GPS in the radio spectrum (Noisefloor) and EASA conflict-zone airspace bulletins or embassy departures (Cordon) tip Watchfloor's conflict zones as independent non-news evidence."
    },
    t2: {
      name: "Maritime chokepoints and spoofing",
      layers: ["land", "ems", "human", "systems"],
      programs: ["wake", "cordon", "noisefloor", "watchfloor"],
      line: "Drops in daily chokepoint transits (Wake), NGA maritime hazard warnings (Cordon), and spoofed ship AIS positions (Noisefloor) converge on the same sea lane."
    },
    t3: {
      name: "Space weather to spectrum and networks",
      layers: ["space", "ems", "cyber", "human"],
      programs: ["fieldcast", "noisefloor", "blackout", "context"],
      line: "Geomagnetic and ionospheric storms (FieldCast) degrade HF and satellite links in the spectrum (Noisefloor) and help rule out natural causes before attributing an outage."
    },
    t4: {
      name: "Natural hazards and cyber pressure on lifelines",
      layers: ["land", "cyber", "human", "systems"],
      programs: ["elements", "vigil", "watchfloor", "cop"],
      line: "Severe natural hazards (Elements) and ransomware or exploited-vulnerability campaigns hitting critical sectors (Vigil) meet in COP, where a FEMA Community Lifelines layer is planned."
    },
    t5: {
      name: "Ionosphere to GPS receiver",
      layers: ["space", "ems"],
      programs: ["fieldcast", "noisefloor"],
      line: "Total electron content gradients in the ionosphere (FieldCast) cross directly into GPS receiver integrity in the spectrum (Noisefloor)."
    }
  };

  // The two groupings: ours on the left (by kind), doctrine's on the right.
  var ZONES = {
    info: { name: "Human and information", c: "z-info", layers: ["systems", "human", "cyber", "ems"],
      line: "Perception, decisions and the networks of power. Nothing here has a place of its own: it lives in what people say, decide and connect." },
    seam: { name: "Shared seam", c: "z-seam", layers: ["cyber", "ems"],
      line: "Cyberspace and the spectrum are layers of their own, and each belongs to both sides. Physical signals and networks carry information, and most change crosses over here." },
    phys: { name: "Physical", c: "z-phys", layers: ["cyber", "ems", "space", "air", "land"],
      line: "Where things are, from the seabed to orbit: terrain, sea lanes, airspace and orbits, plus the physical side of networks and signals." }
  };
  var DZONES = {
    sys: { name: "Systems perspective", c: "z-info", layers: ["systems"],
      line: "Doctrine reads a region as interlocking political, military, economic, social, information and infrastructure systems, mapped as nodes and the links between them. It's the top plate, and every program feeds it." },
    ie: { name: "Information environment", c: "z-ie", layers: ["human", "cyber", "ems"],
      line: "The people, organizations and systems that collect, process, share or act on information, described through human, informational and physical aspects. Doctrine puts cyberspace inside it and the spectrum carries it; the left column draws those two as a seam because they also sit in the physical world." },
    phys: { name: "Physical domains", c: "z-phys", layers: ["space", "air", "land"],
      line: "Air, land, maritime and space. Doctrine adds factors that shape them all, such as weather, terrain and time: weather is drawn on the air plate and space weather on the space plate." }
  };

  var STATUS = { live: "Live", beta: "Live, in beta", dev: "In development", planned: "Planned" };
  var SHORT = { live: "Live", beta: "Beta", dev: "In development", planned: "Planned" };
  var FEEDS = { now: "Collected now", dev: "In development", planned: "Planned", research: "Researching" };

  // ---------------------------------------------------------------- helpers
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function el(name, attrs, text) {
    var e = document.createElementNS(NS, name);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (text != null) e.textContent = text;
    return e;
  }
  function plainDay(iso) {
    var p = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
    return p ? Number(p[3]) + " " + MONTHS[Number(p[2]) - 1] + " " + p[1] : "";
  }
  function n(x) { return Number(x).toLocaleString("en-US"); }
  // A core program reads every layer; its status still decides how it is drawn. Only a planned core program gets the
  // dashed "core" mark; a core program that is out (COP, beta since 31 Oct 2026) draws like any live or beta program.
  function statusWords(p) { return (p.core ? SHORT[p.status] + ", core" : STATUS[p.status]) + (p.working ? ", working name" : ""); }
  function kind(p) {
    if (p.status === "live") return "live";
    if (p.status === "beta" || p.status === "dev") return "dev";
    return p.core ? "core" : "plan";
  }
  function layersOf(p) { return p.core ? LK.slice() : [p.home].concat(p.reach || []); }
  function scopeBar(p) {
    var on = layersOf(p);
    return '<span class="oe-scope" aria-hidden="true">' + LK.map(function (k) {
      return '<i class="' + (on.indexOf(k) < 0 ? "" : "b-" + k) + (k === p.home ? " home" : "") + '"></i>';
    }).join("") + "</span>";
  }
  function layerChip(k) { return '<button type="button" class="oe-lchip c-' + k + '" data-layer="' + k + '">' + esc(L[k].short || L[k].name) + "</button>"; }
  function progChip(p) {
    return '<button type="button" class="oe-pchip k-' + kind(p) + '" data-p="' + p.id + '"><i aria-hidden="true"></i>' + esc(p.name) + "</button>";
  }

  // ---------------------------------------------------------------- drawing: program tags and thread hit targets
  var chipG = svg.querySelector(".chips");
  var reachG = svg.querySelector(".reach");
  var thHitsG = el("g", { "class": "th-hits" });
  svg.insertBefore(thHitsG, reachG);
  svg.querySelectorAll(".th").forEach(function (thEl, idx) {
    var key = "t" + idx, meta = THREADS[key];
    if (!meta) return;
    thEl.setAttribute("data-thread", key);
    var pathEl = thEl.querySelector("path");
    if (!pathEl) return;
    thHitsG.appendChild(el("path", {
      "class": "thit",
      "data-thread": key,
      tabindex: "0",
      role: "button",
      "aria-label": "Cross-layer thread: " + meta.name,
      d: pathEl.getAttribute("d")
    }));
  });

  var chipEls = {};
  PROGRAMS.forEach(function (p) {
    var k = kind(p), x = p.at[0], y = p.at[1];
    var g = el("g", { "class": "chip chip-" + k, "data-p": p.id, tabindex: "0", role: "button", "aria-label": p.name + ", " + statusWords(p) });
    var label = p.short || p.name;
    if (k === "plan") {
      var tx = p.end ? x - 15 : x + 15;
      g.appendChild(el("rect", { "class": "chit", x: p.end ? x - 15 - label.length * 7.6 - 6 : x - 6, y: y - 13, width: label.length * 7.6 + 27, height: 26, rx: 6 }));
      g.appendChild(el("circle", { "class": "ring", cx: p.end ? x - 5 : x + 5, cy: y, r: 4.5 }));
      g.appendChild(el("text", { "class": "ctx", x: tx, y: y + 4.6, "text-anchor": p.end ? "end" : "start" }, label));
    } else {
      g.appendChild(el("rect", { "class": "pill", x: x, y: y - 14, width: 26 + label.length * 8.6 + 14, height: 28, rx: 14 }));
      g.appendChild(el("circle", { "class": "dot", cx: x + 14, cy: y, r: 4.5 }));
      g.appendChild(el("text", { "class": "ctx", x: x + 26, y: y + 5.4 }, label));
    }
    chipG.appendChild(g);
    chipEls[p.id] = g;
  });
  // Size each tag to its text once the fonts are in.
  function fit() {
    PROGRAMS.forEach(function (p) {
      var g = chipEls[p.id], t = g.querySelector("text"), w;
      try { w = t.getComputedTextLength(); } catch (e) { return; }
      if (!w) return;
      var r = g.querySelector("rect");
      if (r.getAttribute("class") === "pill") r.setAttribute("width", (26 + w + 14).toFixed(1));
      else {
        r.setAttribute("width", (w + 27).toFixed(1));
        if (p.end) r.setAttribute("x", (p.at[0] - 15 - w - 6).toFixed(1));
      }
    });
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit); else fit();

  function chipCentre(p) {
    var r = chipEls[p.id].querySelector("rect");
    var x = Number(r.getAttribute("x")), w = Number(r.getAttribute("width"));
    if (kind(p) === "plan") return { x: p.end ? p.at[0] - 5 : p.at[0] + 5, y: p.at[1] };
    return { x: x + w / 2, y: p.at[1] };
  }

  // Reach: a line from the tag through every layer the program touches, with a ring on each.
  function drawReach(p) {
    while (reachG.firstChild) reachG.removeChild(reachG.firstChild);
    if (!p) return;
    var c = chipCentre(p), ls = layersOf(p);
    var ys = ls.map(function (k) { return L[k].y; }).concat([c.y]);
    var top = Math.min.apply(null, ys), bot = Math.max.apply(null, ys);
    reachG.appendChild(el("line", { "class": "rl", x1: c.x, y1: top, x2: c.x, y2: bot }));
    ls.forEach(function (k) {
      if (k === p.home) return;
      reachG.appendChild(el("circle", { "class": "rd rd-" + k, cx: c.x, cy: L[k].y, r: 7 }));
    });
  }

  // ---------------------------------------------------------------- highlight
  function highlight(sel) {
    var on = [], near = [], chipsOn = [], chipsNear = [], zone = null, dzone = null, thread = null;
    if (sel) {
      if (sel.type === "program") {
        var p = P[sel.key];
        if (p.core) on = LK.slice(); else { on = [p.home]; near = p.reach.slice(); }
        chipsOn = [p.id];
      } else if (sel.type === "layer") {
        on = [sel.key];
        PROGRAMS.forEach(function (q) {
          if (q.home === sel.key) chipsOn.push(q.id);
          else if (layersOf(q).indexOf(sel.key) >= 0) chipsNear.push(q.id);
        });
      } else if (sel.type === "thread") {
        thread = sel.key;
        var tm = THREADS[thread];
        if (tm) {
          on = tm.layers.slice();
          chipsOn = tm.programs.slice();
        }
      } else if (sel.type === "group") {
        on = G[sel.key].layers.slice();
        chipsOn = G[sel.key].programs.slice();
      } else if (sel.type === "zone") { zone = sel.key; on = ZONES[zone].layers.slice(); }
      else if (sel.type === "dzone") { dzone = sel.key; on = DZONES[dzone].layers.slice(); }
    }
    var lit = on.concat(near);
    fig.classList.toggle("focus", !!sel);
    fig.classList.toggle("zfocus", !!(zone || dzone));
    fig.querySelectorAll(".pl,.fd,.nm").forEach(function (e) {
      var ls = e.getAttribute("data-layer").split(" ");
      e.classList.toggle("on", ls.some(function (k) { return on.indexOf(k) >= 0; }));
      e.classList.toggle("near", !ls.some(function (k) { return on.indexOf(k) >= 0; }) && ls.some(function (k) { return near.indexOf(k) >= 0; }));
    });
    fig.querySelectorAll(".th").forEach(function (e) {
      if (thread) {
        e.classList.toggle("on", e.getAttribute("data-thread") === thread);
      } else {
        var ls = e.getAttribute("data-layer").split(" ");
        e.classList.toggle("on", ls.filter(function (k) { return lit.indexOf(k) >= 0; }).length >= 2);
      }
    });
    fig.querySelectorAll(".zone").forEach(function (e) { e.classList.toggle("on", e.getAttribute("data-zone") === zone); });
    fig.querySelectorAll(".dzone").forEach(function (e) { e.classList.toggle("on", e.getAttribute("data-dzone") === dzone); });
    Object.keys(chipEls).forEach(function (id) {
      chipEls[id].classList.toggle("on", chipsOn.indexOf(id) >= 0);
      chipEls[id].classList.toggle("near", chipsNear.indexOf(id) >= 0);
    });
    drawReach(sel && sel.type === "program" ? P[sel.key] : null);
    root.querySelectorAll("[data-p]").forEach(function (b) {
      if (b.closest("svg")) return;
      b.classList.toggle("sel", !!sel && sel.type === "program" && b.getAttribute("data-p") === sel.key);
    });
  }

  // ---------------------------------------------------------------- panel
  var CLOSE = '<button type="button" class="oe-x" data-close aria-label="Close">×</button>';
  function howHTML() {
    return CLOSE + '<p class="oe-k">How it works</p><ol class="oe-how">' +
      '<li><span class="oe-n">1</span><span><b>Collect</b>One pipeline per program, on public, licence-checked feeds. Each program reaches every layer its sources touch.</span></li>' +
      '<li><span class="oe-n">2</span><span><b>Analyze</b>Each layer against its own baseline, then every layer read together in the COP.</span></li>' +
      '<li><span class="oe-n">3</span><span><b>Publish</b>Daily pictures, warnings and forecasts, with sources, methods and a public scorecard.</span></li></ol>' +
      '<p class="oe-sec">Each plate is one layer, registered to the same ground. The left column groups the layers by kind; the right column shows doctrine’s grouping of the same layers. A tag sits on a program’s home layer, and the vertical threads show how tips travel across layers: ' +
      (phone.matches ? "tap" : "select") + ' any plate, tag or thread to inspect it.</p>';
  }
  function feedList(l) {
    var groups = {};
    l.feeds.forEach(function (f) { (groups[f[1]] = groups[f[1]] || []).push(f); });
    return ["now", "dev", "planned", "research"].filter(function (s) { return groups[s]; }).map(function (s) {
      return '<div class="oe-fgroup"><p class="oe-k2">' + FEEDS[s] + '</p><div class="oe-feeds">' + groups[s].map(function (f) {
        return '<span class="f-' + s + '"' + (f[2] ? ' title="' + esc(f[2]) + '"' : "") + ">" + esc(f[0]) + "</span>";
      }).join("") + "</div></div>";
    }).join("");
  }
  function layerHTML(k) {
    var l = L[k];
    var homes = PROGRAMS.filter(function (p) { return p.home === k; });
    var reaches = PROGRAMS.filter(function (p) { return p.home !== k && layersOf(p).indexOf(k) >= 0; });
    var left = Object.keys(ZONES).filter(function (z) { return z !== "seam" && ZONES[z].layers.indexOf(k) >= 0; });
    var kindName = left.length > 1 ? ZONES.seam.name : ZONES[left[0]].name;
    var doc = Object.keys(DZONES).filter(function (z) { return DZONES[z].layers.indexOf(k) >= 0; })[0];
    return CLOSE + '<p class="oe-k">Layer · ' + esc(kindName) + " · " + esc(DZONES[doc].name) + "</p>" +
      '<h3 class="c-' + k + '">' + esc(l.name) + "</h3><p>" + esc(l.sub) + "</p>" +
      (homes.length ? '<div class="oe-sec"><p class="oe-k">Programs based here</p><div class="oe-plist">' + homes.map(progChip).join("") + "</div></div>" : "") +
      (reaches.length ? '<div class="oe-sec"><p class="oe-k">Programs that also reach here</p><div class="oe-plist">' + reaches.map(progChip).join("") + "</div></div>" : "") +
      '<div class="oe-sec"><p class="oe-k">What we collect</p>' + feedList(l) + "</div>" +
      (l.who ? '<p class="oe-who">' + esc(l.who) + "</p>" : "");
  }
  function programHTML(id) {
    var p = P[id];
    var stat = p.stat ? '<p class="oe-stat">' + esc(p.stat) + "</p>" : "";
    if (p.unusual) stat += '<p class="oe-unusual"><i class="oe-sdot k-hot" aria-hidden="true"></i>' + n(p.unusual) + " " +
      (p.unusual === 1 ? "finding" : "findings") + " unusual against its own baseline in today’s COP snapshot.</p>";
    var home = p.core ? '<p class="oe-k">Reads</p><p>Every layer.</p>'
      : '<p class="oe-k">Home layer</p><div class="oe-plist">' + layerChip(p.home) + "</div>";
    var reach = p.core || !p.reach.length ? "" : '<div class="oe-sec"><p class="oe-k">Also reaches</p><div class="oe-plist">' + p.reach.map(layerChip).join("") + "</div></div>";
    return CLOSE + '<p class="oe-k">Program · ' + esc(statusWords(p)) + "</p>" +
      '<h3><i class="oe-sdot k-' + kind(p) + '" aria-hidden="true"></i>' + esc(p.name) + "</h3><p>" + esc(p.line) + "</p>" + stat +
      '<div class="oe-sec">' + home + "</div>" + reach +
      (p.working ? '<p class="oe-note">Working name; the final name is still to be chosen.</p>' : "") +
      '<div class="oe-actions">' + (p.href ? '<a class="oe-btn" href="' + esc(p.href) + '" target="_blank" rel="noopener" aria-describedby="newtab">Open ' + esc(p.name) + ' <span aria-hidden="true">↗</span></a>' : "") +
      '<button type="button" class="oe-btn2" data-how>Back to the guide</button></div>';
  }
  function threadHTML(key) {
    var t = THREADS[key];
    return CLOSE + '<p class="oe-k">Cross-layer tip chain</p>' +
      '<h3>' + esc(t.name) + "</h3><p>" + esc(t.line) + "</p>" +
      '<div class="oe-sec"><p class="oe-k">Layers connected</p><div class="oe-plist">' + t.layers.map(layerChip).join("") + "</div></div>" +
      '<div class="oe-sec"><p class="oe-k">Programs on this thread</p><div class="oe-plist">' + t.programs.map(function (id) { return progChip(P[id]); }).join("") + "</div></div>" +
      '<div class="oe-actions"><button type="button" class="oe-btn2" data-how>Back to the guide</button></div>';
  }
  function groupHTML(id) {
    var g = G[id];
    return CLOSE + '<p class="oe-k">Find your way in · ' + g.programs.length + " programs</p><h3>" + esc(g.q) + "</h3>" +
      '<div class="oe-sec"><p class="oe-k">Programs</p><div class="oe-plist">' + g.programs.map(function (pid) { return progChip(P[pid]); }).join("") + "</div></div>" +
      '<div class="oe-sec"><p class="oe-k">Layers</p><div class="oe-plist">' + g.layers.map(layerChip).join("") + "</div></div>" +
      '<div class="oe-actions"><button type="button" class="oe-btn2" data-how>Back to the guide</button></div>';
  }
  function zoneHTML(z, isDoc) {
    var Z = isDoc ? DZONES[z] : ZONES[z];
    return CLOSE + '<p class="oe-k">' + (isDoc ? "Doctrine’s grouping" : "Grouped by kind") + '</p><h3 class="' + Z.c + '">' + esc(Z.name) + "</h3><p>" + esc(Z.line) + "</p>" +
      '<div class="oe-sec"><p class="oe-k">Layers</p><div class="oe-plist">' + Z.layers.map(layerChip).join("") + "</div></div>";
  }
  function allHTML() {
    var groups = [["Live", function (p) { return p.status === "live" || p.status === "beta"; }],
      ["In development", function (p) { return p.status === "dev"; }],
      ["Planned", function (p) { return !p.core && p.status === "planned"; }],
      ["Core, planned", function (p) { return p.core && p.status === "planned"; }]];
    return CLOSE + '<p class="oe-k">Every program</p><h3>Current and planned</h3>' + groups.map(function (g) {
      var ps = PROGRAMS.filter(g[1]);
      if (!ps.length) return "";
      ps.sort(function (a, b) { return LK.indexOf(a.home) - LK.indexOf(b.home); });
      return '<div class="oe-sec"><p class="oe-k">' + g[0] + '</p><ul class="oe-all">' + ps.map(function (p) {
        return '<li><button type="button" data-p="' + p.id + '"><i class="oe-sdot k-' + kind(p) + '" aria-hidden="true"></i><b>' + esc(p.name) + "</b>" +
          (p.working ? " <em>working name</em>" : "") + '<span class="oe-where">' + (p.core ? "Every layer" : esc(L[p.home].short || L[p.home].name)) + "</span></button></li>";
      }).join("") + "</ul></div>";
    }).join("");
  }

  // ---------------------------------------------------------------- guide (left column) and phone chips
  var openGroup = null;   // the guide question that is open, if any (one at a time)
  function questionHTML(p) {
    return '<li><button type="button" class="oe-q" data-p="' + p.id + '"><span class="oe-qt">' + esc(p.ask) + "</span>" +
      '<span class="oe-qm"><i class="oe-sdot k-' + kind(p) + '" aria-hidden="true"></i>' + esc(p.name) + " · " + esc(SHORT[p.status]) +
      (p.short_stat ? " · " + esc(p.short_stat) : "") + "</span>" + scopeBar(p) + "</button>" +
      (p.href ? '<a class="oe-open" href="' + esc(p.href) + '" target="_blank" rel="noopener" aria-describedby="newtab">Open <span aria-hidden="true">↗</span><span class="oe-sr"> ' + esc(p.name) + "</span></a>" : "") + "</li>";
  }
  function guideHTML() {
    return '<h3 class="oe-gh">Find your way in</h3><p class="oe-gsub">Open a question to see the programs that answer it, pick a layer or thread on the drawing, or browse every program.</p><ul class="oe-groups">' +
      GROUPS.map(function (g) {
        var open = g.id === openGroup;
        return '<li class="oe-grp' + (open ? " open" : "") + '"><button type="button" class="oe-gq" data-g="' + g.id + '" aria-expanded="' + open + '" aria-controls="oe-grp-' + g.id + '">' +
          '<span class="oe-qt">' + esc(g.q) + '</span><span class="oe-gm">' + g.programs.map(function (id) { return esc(P[id].name); }).join(" · ") + "</span>" +
          '<span class="oe-chev" aria-hidden="true"></span></button>' +
          '<ul class="oe-glist" id="oe-grp-' + g.id + '"' + (open ? "" : " hidden") + ">" + g.programs.map(function (id) { return questionHTML(P[id]); }).join("") + "</ul></li>";
      }).join("") + '</ul><button type="button" class="oe-all-btn" data-all>Every program, current and planned <span aria-hidden="true">→</span></button>';
  }
  // Open or close a question in place (no re-render, so keyboard focus stays on its button) and show it on the drawing.
  function toggleGroup(id) {
    openGroup = openGroup === id ? null : id;
    guide.querySelectorAll("[data-g]").forEach(function (b) {
      var gid = b.getAttribute("data-g"), on = gid === openGroup;
      b.setAttribute("aria-expanded", on ? "true" : "false");
      b.parentNode.classList.toggle("open", on);
      document.getElementById("oe-grp-" + gid).hidden = !on;
    });
    pin(openGroup ? { type: "group", key: openGroup } : null, false);
  }
  function chipsHTML() {
    return '<button type="button" class="oe-chip how" data-how>How to read</button><button type="button" class="oe-chip how" data-all>All programs</button>' +
      GUIDE.map(function (p) { return '<button type="button" class="oe-chip" data-p="' + p.id + '"><i class="oe-sdot k-' + kind(p) + '" aria-hidden="true"></i>' + esc(p.name) + "</button>"; }).join("");
  }
  function drawGuide() { if (guide) guide.innerHTML = guideHTML(); if (chipBar) chipBar.innerHTML = chipsHTML(); }

  // ---------------------------------------------------------------- state
  var pinned = null;
  function render(sel) {
    highlight(sel && sel.type !== "all" ? sel : null);
    panel.innerHTML = !sel ? howHTML() : sel.type === "all" ? allHTML() : sel.type === "layer" ? layerHTML(sel.key)
      : sel.type === "program" ? programHTML(sel.key) : sel.type === "thread" ? threadHTML(sel.key)
      : sel.type === "group" ? groupHTML(sel.key) : zoneHTML(sel.key, sel.type === "dzone");
  }
  function pin(sel, open) {
    pinned = sel;
    render(sel);
    if (phone.matches) {
      var ls = !sel || sel.type === "all" ? [] : sel.type === "layer" ? [sel.key]
        : sel.type === "thread" ? THREADS[sel.key].layers : sel.type === "group" ? G[sel.key].layers
        : sel.type === "program" ? (P[sel.key].core ? [] : [P[sel.key].home]) : [];
      root.classList.toggle("top", ls.some(function (k) { return ["ems", "space", "air", "land"].indexOf(k) >= 0; }));
      root.classList.toggle("sheet", open !== false);
    }
  }
  function same(a, b) { return a && b && a.type === b.type && a.key === b.key; }
  function selFor(e) {
    if (e.hasAttribute("data-p")) return { type: "program", key: e.getAttribute("data-p") };
    if (e.hasAttribute("data-thread")) return { type: "thread", key: e.getAttribute("data-thread") };
    if (e.hasAttribute("data-hit")) return { type: "layer", key: e.getAttribute("data-hit") };
    if (e.hasAttribute("data-zone")) return { type: "zone", key: e.getAttribute("data-zone") };
    if (e.hasAttribute("data-dzone")) return { type: "dzone", key: e.getAttribute("data-dzone") };
    return null;
  }
  var TARGETS = ".chip,.thit,.hit,.zhit,.dhit";

  // Figure: hover previews, click pins.
  fig.addEventListener("pointerover", function (ev) {
    if (pinned || ev.pointerType === "touch") return;
    var t = ev.target.closest(TARGETS);
    if (t) render(selFor(t));
  });
  fig.addEventListener("pointerleave", function () { if (!pinned) render(null); });
  fig.addEventListener("click", function (ev) {
    var t = ev.target.closest(TARGETS);
    if (!t) { if (pinned) pin(null, false); return; }
    var s = selFor(t);
    if (same(s, pinned)) pin(null, false); else pin(s);
  });
  fig.addEventListener("keydown", function (ev) {
    var t = ev.target.closest(TARGETS);
    if (t && (ev.key === "Enter" || ev.key === " ")) { ev.preventDefault(); pin(selFor(t)); }
  });
  fig.addEventListener("focusin", function (ev) { var t = ev.target.closest(TARGETS); if (t && !pinned) render(selFor(t)); });

  // Guide, chips and panel buttons.
  root.addEventListener("click", function (ev) {
    var b = ev.target.closest("button");
    if (!b || fig.contains(b)) return;
    if (b.hasAttribute("data-close")) return pin(null, false);
    if (b.hasAttribute("data-how")) return pin(null, phone.matches);
    if (b.hasAttribute("data-all")) return pin({ type: "all", key: "all" });
    if (b.hasAttribute("data-layer")) return pin({ type: "layer", key: b.getAttribute("data-layer") });
    if (b.hasAttribute("data-g")) return toggleGroup(b.getAttribute("data-g"));
    if (b.hasAttribute("data-p")) {
      var s = { type: "program", key: b.getAttribute("data-p") };
      // A second click on the pinned program steps back to its open question, if one is open.
      return same(s, pinned) && !phone.matches ? pin(openGroup ? { type: "group", key: openGroup } : null) : pin(s);
    }
  });
  if (guide) guide.addEventListener("pointerover", function (ev) {
    if (pinned || ev.pointerType === "touch") return;
    var b = ev.target.closest("button[data-p],button[data-g]");
    if (b) render(b.hasAttribute("data-g") ? { type: "group", key: b.getAttribute("data-g") } : { type: "program", key: b.getAttribute("data-p") });
  });
  if (guide) guide.addEventListener("pointerleave", function () { if (!pinned) render(null); });
  phone.addEventListener("change", function () { root.classList.remove("sheet"); fit(); render(pinned); });

  // ---------------------------------------------------------------- live counts (shared with site.js)
  var wf = window.ticWatchfloor || fetch("https://mc-api-odg3xhcd4a-uc.a.run.app/summary").then(function (r) {
    if (!r.ok) throw new Error("HTTP " + r.status); return r.json();
  });
  wf.then(function (s) {
    var keys = Object.keys(s.entities || {});
    var topics = keys.filter(function (k) { return /^T\d/.test(k); }).length, zones = keys.length - topics;
    if (!zones) return;
    var day = plainDay(s.day), p = P.watchfloor;
    p.short_stat = zones + "\u00a0zones, " + topics + "\u00a0topics";
    p.stat = (day ? day + (s.partial ? ", so far" : "") + ": " : "") + zones + " conflict zones and " + topics + " strategic topics" +
      (s.gdelt_articles ? ", from " + n(s.gdelt_articles) + " GDELT articles" + (s.rss_items ? " and " + n(s.rss_items) + " feed items" : "") : "") + ".";
    drawGuide();
    render(pinned);
  }).catch(function () { /* keep the wording without numbers */ });

  if (window.ticCopHealth) {
    window.ticCopHealth.then(function (h) {
      var progs = h.programs || [];
      if (!progs.length) return;
      var current = progs.filter(function (p) { return p.state === "fresh"; }).length;   // states: fresh, late, stale
      var placed = progs.reduce(function (acc, p) { return acc + (Number(p.placed) || 0); }, 0);
      P.cop.short_stat = current + "/" + progs.length + "\u00a0feeds up to date";
      P.cop.stat = current + " of " + progs.length + " program feeds up to date, with " + n(placed) + " findings placed on the map.";
      // Today's glow (design preview, 15 Nov 2026): a tag lights when COP's snapshot holds findings from that program
      // that are unusual against the program's own baseline. It says where to look, not that anything is wrong.
      progs.forEach(function (h) {
        var g = chipEls[h.id], a = Number(h.anomalies) || 0;
        if (!g || !a || !P[h.id]) return;
        g.classList.add("hot");
        g.setAttribute("aria-label", P[h.id].name + ", " + statusWords(P[h.id]) + ", " + a + " unusual " + (a === 1 ? "finding" : "findings") + " today");
        P[h.id].unusual = a;
      });
      drawGuide();
      render(pinned);
    }).catch(function () {});
  }

  if (window.ticNoisefloor) {
    window.ticNoisefloor.then(function (b) {
      if (!b || !b.brief) return;
      var day = plainDay(b.freshness && b.freshness.aircraft_day);
      P.noisefloor.stat = (day ? day + ": " : "") + b.brief;
      render(pinned);
    }).catch(function () {});
  }

  if (window.ticVigil) {
    window.ticVigil.then(function (v) {
      if (!v || !v.brief) return;
      var day = plainDay(v.day);
      P.vigil.stat = (day ? day + ": " : "") + v.brief;
      render(pinned);
    }).catch(function () {});
  }

  drawGuide();
  render(null);
})();
