// The pages sitecheck opens: the hub and every program in the house bar (site/shared/tic-nav.js PROGRAMS; a test
// keeps the two in step). `expect` is a selector the page must show once it has drawn, read from a headless Edge run
// of every site on 17 Nov 2026: the map's container where the page has one. Every page must also mount the house
// bar (.tic-house), which proves its scripts ran.
export const SITES = [
  { id: "hub", url: "https://theintelligence.company/" },
  { id: "cop", url: "https://cop.theintelligence.company/", expect: ".maplibregl-map" },
  { id: "watchfloor", url: "https://watchfloor.theintelligence.company/" },
  { id: "headwind", url: "https://headwind.theintelligence.company/" },
  { id: "context", url: "https://context.theintelligence.company/" },
  { id: "undertow", url: "https://undertow.theintelligence.company/" },
  { id: "relief", url: "https://relief.theintelligence.company/" },
  { id: "vigil", url: "https://vigil.theintelligence.company/" },
  { id: "blackout", url: "https://blackout.theintelligence.company/", expect: ".maplibregl-map" },
  { id: "noisefloor", url: "https://noisefloor.theintelligence.company/" },
  { id: "orbit", url: "https://orbit.theintelligence.company/", expect: ".maplibregl-map" },
  { id: "launch", url: "https://launch.theintelligence.company/", expect: ".maplibregl-map" },
  { id: "cordon", url: "https://cordon.theintelligence.company/", expect: ".leaflet-container" },
  { id: "vis", url: "https://vis.theintelligence.company/" },
  { id: "elements", url: "https://elements.theintelligence.company/", expect: ".leaflet-container" },
  { id: "wake", url: "https://wake.theintelligence.company/" },
  { id: "propertycast", url: "https://propertycast.theintelligence.company/", expect: "canvas" },
  { id: "activation", url: "https://activation.theintelligence.company/" },
  { id: "listeningpost", url: "https://listeningpost.theintelligence.company/" },
];
