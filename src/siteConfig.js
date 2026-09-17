// Central config — nav, background video, map providers, feature flags,
// India-specific data sources, and emergency helplines.
// Anything here that points at a "real" free service is genuinely free/no-key.
// Anything that needs a paid key is left as an env var placeholder — never a fake key.

// `labelKey` is looked up via t() in Header/MobileMenu so nav labels
// follow the selected language (see src/lib/i18n).
export const NAV_LINKS = [
  { labelKey: "nav.home", to: "/" },
  { labelKey: "nav.cascadingEngine", to: "/cascading-failure-engine" },
  { labelKey: "nav.resilienceNetwork", to: "/resilience-network" },
  { labelKey: "nav.aiEarlyWarning", to: "/early-warning" },
  { labelKey: "nav.liveAlerts", to: "/live-alerts" },
  { labelKey: "nav.responseTeams", to: "/response-teams" },
  { labelKey: "nav.shelters", to: "/shelters" },
  { labelKey: "nav.donate", to: "/donate" },
  { labelKey: "nav.alertSetup", to: "/alert-setup" },
  { labelKey: "nav.strategy", to: "/strategy" },
  { labelKey: "nav.resources", to: "/resources" },
];

// ---- Background Earth video ----
// Shipped as .mp4 (H.264 — plays in every browser) and .webm (smaller,
// used when supported) so it never silently fails the way the old
// single .mov file did in Chrome/Firefox. Cached offline by the
// service worker after first load.
export const BG_VIDEO_SOURCES = [
  { src: "/videos/earth-bg.webm", type: "video/webm" },
  { src: "/videos/earth-bg.mp4", type: "video/mp4" },
];
export const BG_VIDEO_POSTER = "/videos/earth-bg-poster.jpg";

// ---- Map providers: real, free, no API key required ----
export const MAP_TILES = {
  street: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  satellite: {
    // Esri World Imagery — free tier, no API key, usage-policy limits apply
    // at very high traffic (see: https://www.esri.com/en-us/legal/terms/full-master-agreement)
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
  },
};

// ---- India bounding box — used to scope every map/feed default to India ----
// Mainland + islands: south of Kanyakumari to north of Kashmir,
// west of Gujarat/Lakshadweep to east of Arunachal Pradesh/Andaman.
export const INDIA_BOUNDS = {
  north: 37.6,
  south: 6.5,
  east: 97.4,
  west: 68.1,
};
export const INDIA_CENTER = { lat: 22.9734, lng: 78.6569 }; // geographic center of India
export const INDIA_DEFAULT_ZOOM = 5;

// Leaflet-style [[south, west], [north, east]] for maxBounds, so a map can
// never be panned off India in the first place.
export const INDIA_MAX_BOUNDS = [
  [INDIA_BOUNDS.south, INDIA_BOUNDS.west],
  [INDIA_BOUNDS.north, INDIA_BOUNDS.east],
];

/**
 * True when a coordinate falls inside the India bounding box above.
 * Used to gate geolocation recentring and any ad-hoc coordinate the user
 * supplies, so no part of the app ends up showing a non-Indian location.
 * Mirrors `within_india()` in backend/main.py — keep the two in step.
 */
export function isWithinIndiaBounds(lat, lng) {
  const y = Number(lat);
  const x = Number(lng);
  if (!Number.isFinite(y) || !Number.isFinite(x)) return false;
  return (
    y >= INDIA_BOUNDS.south &&
    y <= INDIA_BOUNDS.north &&
    x >= INDIA_BOUNDS.west &&
    x <= INDIA_BOUNDS.east
  );
}

// ---- Live, free, no-key data sources, scoped to India ----
// Why USGS/GDACS and not an India-only feed: NDMA's SACHET portal
// (sachet.ndma.gov.in) is the official pan-India CAP alert source, but
// it does not publish a documented, key-free public JSON/REST API for
// third-party sites to poll (it drives its own site + the SACHET app
// + SMS). Rather than fabricate a private endpoint, this app links out
// to SACHET/IMD directly (see Resources page + banner below) for the
// authoritative feed, and pulls the two hazard feeds that genuinely
// are open, live, and geographically filterable to India today.
export const DATA_SOURCES = {
  // USGS earthquake feed, geographically filtered to the India bounding
  // box server-side via query params — real-time, no key, no proxy needed.
  usgsEarthquakeApi:
    `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime={start}&minmagnitude=2.5&limit=50` +
    `&minlatitude=${INDIA_BOUNDS.south}&maxlatitude=${INDIA_BOUNDS.north}` +
    `&minlongitude=${INDIA_BOUNDS.west}&maxlongitude=${INDIA_BOUNDS.east}`,
  usgsAttribution: "USGS Earthquake Hazards Program",
  usgsAttributionUrl: "https://earthquake.usgs.gov/earthquakes/map/",

  // GDACS — Global Disaster Alert & Coordination System (run by the EU
  // Joint Research Centre + UN OCHA). Free JSON/GeoJSON API, no key.
  // Covers cyclones, floods, and volcanoes that USGS doesn't. Filtered
  // client-side to entries whose country field includes India, since
  // the public SEARCH endpoint doesn't take a country parameter.
  gdacsEventListApi:
    "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=TC;FL;EQ;VO&fromdate={start}&todate={end}",
  gdacsAttribution: "GDACS (EU JRC / UN OCHA)",
  gdacsAttributionUrl: "https://www.gdacs.org/",

  // Official India government sources — authoritative, but no public
  // read API for this frontend to poll directly, so they're linked
  // out to rather than faked. Cited on Live Alerts + Resources pages.
  ndmaSachet: "https://sachet.ndma.gov.in/",
  imdWebsite: "https://mausam.imd.gov.in/",
  imdCycloneWarnings: "https://mausam.imd.gov.in/imd_latest/contents/cyclone.php",
  cwcFloodForecast: "https://ffs.india-water.gov.in/",
};

// ---- Real, sourced Indian emergency helplines ----
// Sources: National Portal of India helpline directory
// (india.gov.in/directory/helpline), Ministry of Home Affairs ERSS
// ("112") documentation, and NDMA. Numbers are toll-free/short-code
// and dialable from any Indian phone without an STD code.
export const EMERGENCY_HELPLINES = [
  {
    id: "112",
    number: "112",
    name: "112 — National Emergency Number (ERSS)",
    desc: "Single number for police, fire and medical emergencies under the Emergency Response Support System. Works across India.",
    category: "general",
  },
  {
    id: "100",
    number: "100",
    name: "Police",
    desc: "Direct police helpline (also reachable via 112).",
    category: "police",
  },
  {
    id: "101",
    number: "101",
    name: "Fire & Rescue",
    desc: "Fire brigade emergency line.",
    category: "fire",
  },
  {
    id: "108",
    number: "108",
    name: "Ambulance / Emergency Medical",
    desc: "Free emergency ambulance service in most states.",
    category: "medical",
  },
  {
    id: "1070",
    number: "1070",
    name: "NDMA — Disaster Management Helpline",
    desc: "Relief Commissioner's control room for floods, earthquakes and other natural disasters.",
    category: "disaster",
  },
  {
    id: "1078",
    number: "1078",
    name: "NDMA Control Room",
    desc: "National Disaster Management Authority 24x7 control room.",
    category: "disaster",
  },
  {
    id: "1091",
    number: "1091",
    name: "Women's Helpline (Police)",
    desc: "Women in distress — police response.",
    category: "safety",
  },
  {
    id: "181",
    number: "181",
    name: "Women Helpline (National)",
    desc: "24x7 support and counselling for women facing violence or distress.",
    category: "safety",
  },
  {
    id: "1098",
    number: "1098",
    name: "Child Helpline",
    desc: "Report child abuse or a child in distress.",
    category: "safety",
  },
  {
    id: "1930",
    number: "1930",
    name: "Cyber Crime Helpline",
    desc: "Report online fraud, scams, or digital threats.",
    category: "other",
  },
];
export const EMERGENCY_HELPLINES_SOURCE_URL = "https://www.india.gov.in/directory/helpline";

// Offline pre-cache: bounding box + zoom range downloaded on demand.
// Defaults to a smaller India west-coast slice (kept small so it
// doesn't hammer the tile server or eat storage without asking) —
// edit for your target region.
export const OFFLINE_REGION = {
  name: "Kerala & western coast (edit in siteConfig.js)",
  bounds: { north: 20.2, south: 8.0, east: 80.5, west: 72.5 },
  zoomRange: [5, 11],
};

export const FEATURE_FLAGS = {
  // Flip these off entirely if you don't want to show the "not yet wired"
  // sections at all, instead of showing them greyed-out with an explanation.
  showAiVerificationStub: true,
  showTelecomAlertStub: true,
};

// ---- Alerts backend (SMS + AI voice calling) ----
// Actually dispatching an SMS/call to a phone number requires a paid
// telecom API (Twilio/MSG91/Exotel) and a server holding the secret
// key — that cannot live in browser code. The `/server` folder in this
// project is a real, working Express backend for this; point the
// frontend at it here once it's running (see server/README.md).
export const ALERTS_BACKEND_URL =
  import.meta.env.VITE_ALERTS_BACKEND_URL ||
  (import.meta.env.VITE_BACKEND_API_URL
    ? import.meta.env.VITE_BACKEND_API_URL
    : import.meta.env.VITE_EARLY_WARNING_API_URL
    ? import.meta.env.VITE_EARLY_WARNING_API_URL.replace("/api/early-warning", "")
    : "http://localhost:8000");

// Python ML/early-warning backend. Keep this separate from the telecom
// backend so the ML stack can use Python/scikit-learn reliably.
export const EARLY_WARNING_API_URL =
  import.meta.env.VITE_EARLY_WARNING_API_URL || "http://localhost:8000/api/early-warning";

// ---- How fast the early-warning UI updates ----
// The Python backend keeps a pre-built snapshot per location warm on a
// background thread, so /api/early-warning answers from memory in single-digit
// milliseconds. That is what makes a 2-second poll sane: the browser is only
// ever reading a cached payload, never triggering the ML pipeline. Raise this
// if you point the frontend at a slow remote backend.
export const EARLY_WARNING_POLL_MS = Number(
  import.meta.env.VITE_EARLY_WARNING_POLL_MS || 2000
);

// The header status pill is a summary, not the main view, so it polls a little
// more slowly than the dedicated Early Warning page.
export const HEADER_STATUS_POLL_MS = Number(
  import.meta.env.VITE_HEADER_STATUS_POLL_MS || 5000
);

// Live Alerts (USGS + GDACS) hit third-party public APIs directly from the
// browser, so this stays a courteous interval rather than 2s.
export const LIVE_ALERTS_POLL_MS = Number(
  import.meta.env.VITE_LIVE_ALERTS_POLL_MS || 60000
);

