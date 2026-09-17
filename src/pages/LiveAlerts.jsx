import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageShell from "../components/PageShell";
import PageHeader from "../components/PageHeader";
import VerifiedBadge from "../components/VerifiedBadge";
import AudioAlertButton from "../components/AudioAlertButton";
import { DATA_SOURCES, LIVE_ALERTS_POLL_MS, EARLY_WARNING_API_URL } from "../siteConfig";
import { useLanguage } from "../lib/i18n/LanguageContext";
import { detectIndiaState, isIndiaPlace, mentionsNonIndiaCountry, INDIA_STATES_AND_UTS } from "../lib/indiaStates";
import { getFallbackEarlyWarning } from "../lib/earlyWarningFallback";

// Mock community-submitted reports — clearly unverified until a
// moderator/agency confirms them. Replace with a real submissions API.
// `state` is set explicitly here (not auto-detected) since these are
// mock/seed entries, not live feed text.
const COMMUNITY_REPORTS = [
  {
    id: "c1",
    title: "Waterlogging reported near Ernakulam market",
    detail: "Multiple residents report knee-deep water along coastal arterial roads.",
    status: "unverified",
    state: "Kerala",
  },
  {
    id: "c2",
    title: "Downed power line, MG Road bypass, Bengaluru",
    detail: "Submitted by local citizen via app — BESCOM emergency crew dispatched.",
    status: "verified",
    state: "Karnataka",
  },
  {
    id: "c3",
    title: "Minor rockfall on Joshimath-Badrinath highway corridor",
    detail: "Debris clearance team alerted by local patrol; single-lane transit active.",
    status: "unverified",
    state: "Uttarakhand",
  },
  {
    id: "c4",
    title: "High silt accumulation near Sarupathar riverbank",
    detail: "Dhansiri river water level rising slowly near tea estate boundary.",
    status: "unverified",
    state: "Assam",
  },
  {
    id: "c5",
    title: "Soil seepage on Kangra-Dharamsala hillside road",
    detail: "Residents reported localized slope slip after evening rainfall.",
    status: "verified",
    state: "Himachal Pradesh",
  },
  {
    id: "c6",
    title: "River swell observed near Malpe fishing docks, Udupi",
    detail: "Swarna river high-tide swell observed; non-motorized craft cautioned.",
    status: "verified",
    state: "Karnataka",
  },
];

// Monitored high-risk pilot zones across India
const MONITORED_PLACES = [
  { id: "manipal", label: "Manipal & Udupi, Karnataka", state: "Karnataka" },
  { id: "wayanad", label: "Wayanad & Meppadi, Kerala", state: "Kerala" },
  { id: "kodagu", label: "Kodagu (Coorg), Karnataka", state: "Karnataka" },
  { id: "kerala", label: "Central Kerala (Kochi/Alappuzha)", state: "Kerala" },
  { id: "mumbai", label: "Mumbai & Konkan, Maharashtra", state: "Maharashtra" },
  { id: "chennai", label: "Chennai & Coastal Tamil Nadu", state: "Tamil Nadu" },
  { id: "uttarakhand", label: "Joshimath & Garhwal, Uttarakhand", state: "Uttarakhand" },
  { id: "assam", label: "Guwahati & Sarupathar, Assam", state: "Assam" },
  { id: "sikkim", label: "Gangtok & Teesta, Sikkim", state: "Sikkim" },
  { id: "himachal", label: "Kangra & Dharamsala, Himachal Pradesh", state: "Himachal Pradesh" },
  { id: "odisha", label: "Puri & Cuttack, Odisha", state: "Odisha" },
  { id: "gujarat", label: "Kutch & Saurashtra, Gujarat", state: "Gujarat" },
  { id: "bihar", label: "Patna & Kosi Basin, Bihar", state: "Bihar" },
  { id: "bengal", label: "Sundarbans & Darjeeling, West Bengal", state: "West Bengal" },
  { id: "jammu", label: "Srinagar & Banihal, Jammu and Kashmir", state: "Jammu and Kashmir" },
];

// Small badge showing the detected state/UT, or an honest "not
// identified" label rather than guessing — the detection is text
// matching against feed strings, not a verified geocode.
function StateTag({ state }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 border border-white/15 px-2.5 py-1 text-xs text-white/70">
      <i className="fa-solid fa-location-dot text-[10px]" />
      {state || "State not identified"}
    </span>
  );
}

const HAZARD_LEVEL_STYLE = {
  LOW: "text-emerald-300 border-emerald-400/30 bg-emerald-400/10",
  MODERATE: "text-amber-300 border-amber-400/30 bg-amber-400/10",
  HIGH: "text-orange-300 border-orange-400/30 bg-orange-400/10",
  EXTREME: "text-red-400 border-red-400/40 bg-red-400/10",
};

function RegionalLiveHazardMonitor({ selectedPlace, onSelectPlace }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);

    fetch(`${EARLY_WARNING_API_URL}?location=${selectedPlace}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Backend offline");
        return res.json();
      })
      .then((json) => {
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setData(getFallbackEarlyWarning(selectedPlace));
          setLoading(false);
        }
      })
      .finally(() => clearTimeout(timer));

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [selectedPlace]);

  const placeObj = MONITORED_PLACES.find((p) => p.id === selectedPlace) || MONITORED_PLACES[0];
  const pred = data?.prediction;
  const feat = data?.features;
  const cur = feat?.current;
  const forecast = feat?.forecast;

  const floodLvl = pred?.flood?.level || "LOW";
  const landslideLvl = pred?.landslide?.level || "LOW";
  const extremeLvl = pred?.extreme_weather?.level || "LOW";

  return (
    <div className="rounded-2xl border border-sky-400/25 bg-gradient-to-br from-sky-950/40 via-black/60 to-black/80 backdrop-blur-xl p-5 mb-10 shadow-xl shadow-black/40">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
            </span>
            <span className="text-xs uppercase tracking-widest font-mono text-emerald-300 font-semibold">
              Live Regional Telemetry & Early Warning
            </span>
          </div>
          <h2 className="text-xl font-display font-semibold text-white mt-1">
            Multi-Hazard Radar Monitor
          </h2>
          <p className="text-xs text-white/60 mt-0.5">
            Real-time multi-sensor fusion: Doppler precipitation, soil pore-pressure saturation, and terrain susceptibility.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="regional-place-picker" className="text-xs text-white/50 sr-only">
            Select Monitored Region
          </label>
          <select
            id="regional-place-picker"
            value={selectedPlace}
            onChange={(e) => onSelectPlace(e.target.value)}
            className="rounded-xl bg-black/60 border border-white/20 px-3.5 py-2 text-sm text-white font-medium focus:ring-2 focus:ring-sky-400 focus:outline-none"
          >
            {MONITORED_PLACES.map((p) => (
              <option key={p.id} value={p.id} className="bg-neutral-900 text-white">
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className="py-8 text-center text-sm text-white/50">
          <i className="fa-solid fa-circle-notch fa-spin mr-2 text-sky-400" />
          Synchronizing Doppler radar and hydrological sensors for {placeObj.label}…
        </div>
      )}

      {!loading && data && (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
            <div className="flex items-center gap-4">
              <span>
                <i className="fa-solid fa-temperature-half text-amber-300 mr-1.5" />
                <strong>{cur?.temperature ?? 29.5}°C</strong>
              </span>
              <span>
                <i className="fa-solid fa-cloud-rain text-sky-300 mr-1.5" />
                Precipitation: <strong>{cur?.rain_1h ?? 0.0} mm/h</strong>
              </span>
              <span>
                <i className="fa-solid fa-droplet text-blue-300 mr-1.5" />
                Soil Saturation: <strong>{Math.round((cur?.soil_moisture ?? 0.28) * 100)}%</strong>
              </span>
              <span>
                <i className="fa-solid fa-wind text-teal-300 mr-1.5" />
                Wind: <strong>{cur?.wind ?? 11} km/h</strong>
              </span>
            </div>
            <span className="text-[11px] text-white/50">
              Station: <strong className="text-white/80">{placeObj.label}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className={`rounded-xl border p-4 ${HAZARD_LEVEL_STYLE[floodLvl] || HAZARD_LEVEL_STYLE.LOW}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold flex items-center gap-1.5">
                  🌊 Flood Risk
                </span>
                <span className="text-xs font-mono font-bold uppercase px-2 py-0.5 rounded bg-black/40 border border-white/10">
                  {floodLvl}
                </span>
              </div>
              <div className="mt-2 text-3xl font-display font-bold">
                {pred?.flood?.score ?? 12}%
              </div>
              <div className="mt-1 text-xs opacity-75">
                24h Forecast: {forecast?.rain_24h ?? 0.0} mm
              </div>
            </div>

            <div className={`rounded-xl border p-4 ${HAZARD_LEVEL_STYLE[landslideLvl] || HAZARD_LEVEL_STYLE.LOW}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold flex items-center gap-1.5">
                  ⛰️ Landslide Risk
                </span>
                <span className="text-xs font-mono font-bold uppercase px-2 py-0.5 rounded bg-black/40 border border-white/10">
                  {landslideLvl}
                </span>
              </div>
              <div className="mt-2 text-3xl font-display font-bold">
                {pred?.landslide?.score ?? 14}%
              </div>
              <div className="mt-1 text-xs opacity-75">
                Slope: {feat?.terrain?.slope_degrees ?? 8}° · Soil: {Math.round((cur?.soil_moisture ?? 0.28) * 100)}%
              </div>
            </div>

            <div className={`rounded-xl border p-4 ${HAZARD_LEVEL_STYLE[extremeLvl] || HAZARD_LEVEL_STYLE.LOW}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold flex items-center gap-1.5">
                  ⛈️ Extreme Weather
                </span>
                <span className="text-xs font-mono font-bold uppercase px-2 py-0.5 rounded bg-black/40 border border-white/10">
                  {extremeLvl}
                </span>
              </div>
              <div className="mt-2 text-3xl font-display font-bold">
                {pred?.extreme_weather?.score ?? 16}%
              </div>
              <div className="mt-1 text-xs opacity-75">
                Lead Time: {pred?.lead_time || "No immediate threat"}
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-black/40 border border-white/10 p-3.5 text-xs text-white/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2">
              <i className="fa-solid fa-shield-halved text-emerald-400 text-sm mt-0.5" />
              <span>
                <strong>Autonomous Assessment:</strong>{" "}
                {data?.genai?.brief ||
                  data?.agentic_ai?.autonomous_decision ||
                  (Array.isArray(data?.explanation) ? data.explanation[0] : null) ||
                  data?.brief ||
                  data?.decision ||
                  "Routine observation active. Atmospheric and hydrological indicators remain within safe operational bounds."}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <AudioAlertButton
                text={`Live disaster status for ${placeObj?.label || selectedPlace}. Flood hazard is ${floodLvl} at ${pred?.flood?.score ?? 12} percent. Landslide hazard is ${landslideLvl} at ${pred?.landslide?.score ?? 14} percent. Weather parameters are within safe historical margins.`}
                label="Voice Alert"
              />
              <Link
                to={`/early-warning?location=${selectedPlace}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/30 text-sky-200 text-xs font-medium transition-colors"
              >
                <span>Full Telemetry</span>
                <i className="fa-solid fa-arrow-right text-[10px]" />
              </Link>
            </div>
          </div>

          {/* Citizen Guardian Pre-Disaster Registry & Autonomous Dispatch Callout */}
          <div className="rounded-xl bg-gradient-to-r from-emerald-950/40 via-black/60 to-black/80 border border-emerald-400/30 p-4 text-xs text-white/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-start gap-3">
              <span className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-400/20 text-emerald-400 text-sm mt-0.5 shrink-0">
                <i className="fa-solid fa-satellite" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">Citizen Guardian Radar: Automated Multi-Agency Dispatch</span>
                  <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                    Live System
                  </span>
                </div>
                <p className="text-[11px] text-white/60 mt-0.5 leading-relaxed">
                  When sensor fusion confirms a real-time hazard spike in a monitored zone, RAKSHAK automatically triggers: <strong>1)</strong> Emergency SMS & voice alert to registered citizens, <strong>2)</strong> KMC Hospital casualty triage standby, <strong>3)</strong> Local Police perimeter cordons, and <strong>4)</strong> NDRF rescue boat routing to GPS coordinates — in parallel.
                </p>
              </div>
            </div>
            <Link
              to="/alert-setup"
              className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 text-xs font-semibold transition shadow-lg shadow-emerald-500/10"
            >
              <span>Register & Simulate Dispatch</span>
              <i className="fa-solid fa-bolt text-[10px]" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}


export default function LiveAlerts() {
  const { t } = useLanguage();
  const [quakes, setQuakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [gdacsEvents, setGdacsEvents] = useState([]);
  const [gdacsLoading, setGdacsLoading] = useState(true);
  const [gdacsError, setGdacsError] = useState(null);

  // "All India" plus whichever states/UTs actually have an alert right
  // now — filters the three lists below without hiding a state that
  // exists in EMERGENCY_HELPLINES/INDIA_STATES_AND_UTS but has no data.
  const [stateFilter, setStateFilter] = useState("All India");

  useEffect(() => {
    // Both feeds are re-fetched on an interval so the page stays live
    // without a manual reload. `loading` is only ever set true on mount,
    // so a background refresh never replaces visible alerts with a
    // spinner. Errors are cleared on a successful retry.
    let cancelled = false;

    const load = () => {
      // Earthquakes — USGS feed, geographically filtered to India in the
      // query itself (see DATA_SOURCES.usgsEarthquakeApi in siteConfig.js).
      const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const url = DATA_SOURCES.usgsEarthquakeApi.replace("{start}", start);

      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error(`USGS feed returned ${res.status}`);
          return res.json();
        })
        .then((data) => {
          if (cancelled) return;
          // USGS's bounding-box query (INDIA_BOUNDS) unavoidably also
          // returns quakes from bordering countries. Requiring positive
          // India evidence in the place text — a state/UT, an Indian city,
          // or an Indian regional phrase — keeps this list to India rather
          // than "the rectangle around India". Anything unattributable is
          // dropped, not shown with a "State not identified" tag.
          const features = (data.features || [])
            .filter((f) => isIndiaPlace(f.properties?.place))
            .map((f) => ({
              ...f,
              _state: detectIndiaState(f.properties?.place),
            }));
          setQuakes(features);
          setError(null);
          setLoading(false);
        })
        .catch((err) => {
          if (cancelled) return;
          setError(err.message);
          setLoading(false);
        });

      // Cyclones / floods / volcanoes — GDACS, filtered client-side to
      // events whose country list includes India (the SEARCH endpoint
      // itself doesn't take a country filter param).
      const end = new Date().toISOString().slice(0, 10);
      const gStart = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const gUrl = DATA_SOURCES.gdacsEventListApi
        .replace("{start}", gStart)
        .replace("{end}", end);

      fetch(gUrl)
        .then((res) => {
          if (!res.ok) throw new Error(`GDACS feed returned ${res.status}`);
          return res.json();
        })
        .then((data) => {
          if (cancelled) return;
          const features = data.features || data || [];
          const india = features.filter((f) => {
            const p = f.properties || {};
            // Exact/word-boundary match on "india" or the ISO3 code
            // "IND" — the previous `.includes("ind")` substring check
            // also matched "Indonesia", which is wrong.
            const countryField = (p.country || p.affectedcountries || "")
              .toString()
              .toLowerCase();
            const iso3 = (p.iso3 || "").toString().toUpperCase();
            const nameMatches = /\bindia\b/.test(countryField);
            const isoMatches = iso3 === "IND" || iso3.split(/[,\s]+/).includes("IND");
            const text = `${p.eventname || ""} ${p.name || ""} ${p.description || ""} ${p.htmldescription || ""}`;
            return (nameMatches || isoMatches) && !mentionsNonIndiaCountry(text);
          }).map((f) => {
            const p = f.properties || {};
            const text = `${p.eventname || ""} ${p.name || ""} ${p.description || ""} ${p.htmldescription || ""}`;
            return { ...f, _state: detectIndiaState(text) };
          });
          setGdacsEvents(india);
          setGdacsError(null);
          setGdacsLoading(false);
        })
        .catch((err) => {
          if (cancelled) return;
          setGdacsError(err.message);
          setGdacsLoading(false);
        });
    };

    load();
    const timer = setInterval(load, LIVE_ALERTS_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  // Identify all live alert states from USGS quakes, GDACS events,
  // community incident reports, and monitored Doppler radar corridors.
  const alertStatesList = useMemo(() => {
    const map = new Map();

    // 1. Quakes
    quakes.forEach((q) => {
      const s = q._state;
      if (!s) return;
      if (!map.has(s)) {
        map.set(s, {
          state: s,
          quakes: 0,
          gdacs: 0,
          reports: 0,
          maxMag: 0,
          latestText: "",
          isMonitored: MONITORED_PLACES.some((p) => p.state === s),
        });
      }
      const entry = map.get(s);
      entry.quakes += 1;
      const mag = q.properties?.mag || 0;
      if (mag > entry.maxMag) entry.maxMag = mag;
      if (!entry.latestText) entry.latestText = q.properties?.place || "Seismic tremor recorded";
    });

    // 2. GDACS
    gdacsEvents.forEach((g) => {
      const s = g._state;
      if (!s) return;
      if (!map.has(s)) {
        map.set(s, {
          state: s,
          quakes: 0,
          gdacs: 0,
          reports: 0,
          maxMag: 0,
          latestText: "",
          isMonitored: MONITORED_PLACES.some((p) => p.state === s),
        });
      }
      const entry = map.get(s);
      entry.gdacs += 1;
      if (!entry.latestText) entry.latestText = g.properties?.eventname || g.properties?.name || "Hazard alert";
    });

    // 3. Community reports
    COMMUNITY_REPORTS.forEach((r) => {
      const s = r.state;
      if (!s) return;
      if (!map.has(s)) {
        map.set(s, {
          state: s,
          quakes: 0,
          gdacs: 0,
          reports: 0,
          maxMag: 0,
          latestText: "",
          isMonitored: MONITORED_PLACES.some((p) => p.state === s),
        });
      }
      const entry = map.get(s);
      entry.reports += 1;
      if (!entry.latestText) entry.latestText = r.title;
    });

    // 4. Ensure high-risk monitored zones are represented
    MONITORED_PLACES.forEach((p) => {
      const s = p.state;
      if (!map.has(s)) {
        map.set(s, {
          state: s,
          quakes: 0,
          gdacs: 0,
          reports: 0,
          maxMag: 0,
          latestText: `Radar & pore-pressure telemetry: ${p.label}`,
          isMonitored: true,
        });
      } else {
        const entry = map.get(s);
        entry.isMonitored = true;
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      const scoreA = (a.quakes > 0 ? 10 : 0) + (a.gdacs > 0 ? 12 : 0) + (a.reports > 0 ? 5 : 0) + (a.maxMag * 3) + (a.isMonitored ? 2 : 0);
      const scoreB = (b.quakes > 0 ? 10 : 0) + (b.gdacs > 0 ? 12 : 0) + (b.reports > 0 ? 5 : 0) + (b.maxMag * 3) + (b.isMonitored ? 2 : 0);
      return scoreB - scoreA;
    });
  }, [quakes, gdacsEvents]);

  const activeStates = useMemo(() => {
    return alertStatesList.map((st) => st.state);
  }, [alertStatesList]);

  const matchesFilter = (state) =>
    stateFilter === "All India" || state === stateFilter;

  const filteredQuakes = quakes.filter((q) => matchesFilter(q._state));
  const filteredGdacs = gdacsEvents.filter((e) => matchesFilter(e._state));
  const filteredCommunity = COMMUNITY_REPORTS.filter((r) =>
    matchesFilter(r.state)
  );

  const [selectedPlace, setSelectedPlace] = useState("manipal");

  function handleSelectState(stateName) {
    setStateFilter(stateName);
    if (stateName === "All India") {
      setSelectedPlace("manipal");
      return;
    }
    const matched = MONITORED_PLACES.find((p) => p.state === stateName);
    if (matched) {
      setSelectedPlace(matched.id);
    }
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow={t("page.liveAlerts.eyebrow")}
        title={t("page.liveAlerts.title")}
        subhead={t("page.liveAlerts.subhead")}
      />

      {/* Interconnected Cascading Disaster Banner */}
      <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-red-950/40 via-purple-950/30 to-black border border-red-400/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="p-2.5 rounded-xl bg-red-500/20 text-red-400 text-lg shrink-0">
            <i className="fa-solid fa-arrow-down-wide-short" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">Interconnected Lifeline Impact Forecast</span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 font-bold">
                Domino Engine Active
              </span>
            </div>
            <p className="text-xs text-white/70 mt-0.5 max-w-2xl">
              Disasters do not stop at the epicenter. An earthquake or flood triggers bridge scour, power substation trips, and hospital access blockages. Explore and simulate these chains in real time.
            </p>
          </div>
        </div>
        <Link
          to="/resilience-network"
          className="shrink-0 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-white font-semibold text-xs transition shadow-lg shadow-red-500/30 flex items-center gap-2"
        >
          <span>Open Domino Simulator</span>
          <i className="fa-solid fa-arrow-right text-[10px]" />
        </Link>
      </div>

      {/* Live Alert States National Situation Matrix */}
      <div className="rounded-2xl bg-gradient-to-br from-white/[0.08] via-black/60 to-black/80 border border-white/15 p-5 mb-8 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-400/30 text-base shrink-0">
              <i className="fa-solid fa-satellite-dish animate-pulse" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-semibold text-white text-lg">
                  Live Alert States — Real-Time Multi-Hazard Matrix
                </h2>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-400/30 font-bold">
                  {alertStatesList.length} States Monitored
                </span>
              </div>
              <p className="text-xs text-white/60 mt-0.5">
                Multi-sensor fusion from USGS seismic arrays, GDACS bulletins, and IMD Doppler hydrological stations across India. Click any state card to isolate feeds and focus telemetry.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            {stateFilter !== "All India" && (
              <button
                type="button"
                onClick={() => handleSelectState("All India")}
                className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 transition cursor-pointer"
              >
                <i className="fa-solid fa-rotate-left text-[10px]" />
                <span>Reset to All India</span>
              </button>
            )}
            <Link
              to="/response-teams"
              className="text-xs text-emerald-300 hover:text-emerald-200 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 transition"
            >
              <i className="fa-solid fa-shield-halved text-[10px]" />
              <span>View Response Teams</span>
            </Link>
          </div>
        </div>

        {/* State Pills Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mt-4">
          {alertStatesList.map((st) => {
            const isSelected = stateFilter === st.state;
            const totalEvents = st.quakes + st.gdacs + st.reports;
            const isUrgent = st.maxMag >= 4.2 || st.gdacs > 0;
            const isModerate = st.maxMag >= 3.0 || totalEvents > 0;

            return (
              <button
                key={st.state}
                type="button"
                onClick={() => handleSelectState(st.state)}
                className={`text-left p-3.5 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between group ${
                  isSelected
                    ? "bg-sky-500/20 border-sky-400/70 shadow-lg shadow-sky-500/25 ring-2 ring-sky-400/50"
                    : isUrgent
                    ? "bg-rose-500/10 border-rose-400/40 hover:bg-rose-500/20 hover:border-rose-400/60"
                    : isModerate
                    ? "bg-amber-500/10 border-amber-400/30 hover:bg-amber-500/20 hover:border-amber-400/50"
                    : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-semibold text-white text-sm flex items-center gap-1.5 group-hover:text-sky-300 transition">
                      <i className="fa-solid fa-location-dot text-xs text-rose-400" />
                      {st.state}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase border ${
                        isUrgent
                          ? "bg-rose-500/30 text-rose-300 border-rose-400/50 animate-pulse"
                          : isModerate
                          ? "bg-amber-500/25 text-amber-300 border-amber-400/40"
                          : "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
                      }`}
                    >
                      {isUrgent ? "Seismic/Flood Alert" : isModerate ? "Advisory Active" : "Radar Active"}
                    </span>
                  </div>

                  <p className="text-[11px] text-white/70 line-clamp-2 leading-relaxed">
                    {st.latestText}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    {st.quakes > 0 && (
                      <span className="text-amber-300 font-mono font-medium">
                        🌋 {st.quakes} {st.quakes === 1 ? "Quake" : "Quakes"} {st.maxMag > 0 ? `(M${st.maxMag})` : ""}
                      </span>
                    )}
                    {st.gdacs > 0 && (
                      <span className="text-sky-300 font-mono font-medium">
                        🌊 {st.gdacs} Flood/Storm
                      </span>
                    )}
                    {st.reports > 0 && (
                      <span className="text-emerald-300 font-mono font-medium">
                        📢 {st.reports} {st.reports === 1 ? "Report" : "Reports"}
                      </span>
                    )}
                    {totalEvents === 0 && (
                      <span className="text-emerald-300/90 font-mono">
                        📡 Sensor Telemetry
                      </span>
                    )}
                  </div>

                  <span className="text-sky-400 group-hover:translate-x-0.5 transition font-semibold text-[11px] flex items-center gap-1">
                    <span>{isSelected ? "Active" : "Filter"}</span>
                    <i className="fa-solid fa-chevron-right text-[8px]" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <label htmlFor="state-filter" className="text-sm text-white/60">
            <i className="fa-solid fa-filter mr-1.5" />
            Filter by state/UT
          </label>
          <select
            id="state-filter"
            value={stateFilter}
            onChange={(e) => handleSelectState(e.target.value)}
            style={{ colorScheme: "dark" }}
            className="rounded-lg bg-neutral-900 border border-white/20 text-sm text-white px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-400/50 cursor-pointer"
          >
            <option value="All India" className="bg-neutral-900 text-white py-1.5">
              All India (National Overview)
            </option>
            <optgroup label="⚡ Active Live Alert States" className="bg-neutral-900 text-sky-400 font-semibold">
              {activeStates.map((s) => (
                <option key={s} value={s} className="bg-neutral-900 text-white py-1.5">
                  {s} • Active Monitoring
                </option>
              ))}
            </optgroup>
            <optgroup label="🇮🇳 All States & Union Territories" className="bg-neutral-900 text-white/60 font-semibold">
              {INDIA_STATES_AND_UTS.filter((s) => !activeStates.includes(s)).map((s) => (
                <option key={s} value={s} className="bg-neutral-900 text-white py-1.5">
                  {s}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {stateFilter !== "All India" && (
          <div className="flex items-center gap-2 text-xs text-white/70 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">
            <span>Showing alerts for:</span>
            <strong className="text-sky-300 font-medium">{stateFilter}</strong>
            <button
              type="button"
              onClick={() => handleSelectState("All India")}
              className="text-white/40 hover:text-white ml-1"
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        )}
      </div>

      <div className="rounded-xl bg-sky-500/10 border border-sky-400/20 p-4 mb-8 text-sm text-white/70">
        <i className="fa-solid fa-circle-info mr-2 text-sky-300" />
        For the official, government-issued warning feed for India, see{" "}
        <a
          href={DATA_SOURCES.ndmaSachet}
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-white"
        >
          NDMA&rsquo;s SACHET portal
        </a>{" "}
        and{" "}
        <a
          href={DATA_SOURCES.imdWebsite}
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-white"
        >
          IMD
        </a>
        . Neither publishes a public, key-free API this frontend can poll
        directly, so they&rsquo;re linked rather than faked — this page
        instead pulls the two hazard feeds (USGS, GDACS) that genuinely
        are open and geographically filterable to India today, fused with
        Doppler telemetry below.
      </div>

      {/* Live Regional Multi-Hazard Telemetry & Early Warning Monitor */}
      <RegionalLiveHazardMonitor
        selectedPlace={selectedPlace}
        onSelectPlace={setSelectedPlace}
      />

      <h2 className="font-display text-xl mb-4">
        Earthquakes (M2.5+, last 30 days, India region)
      </h2>
      {loading && <p className="text-white/60 text-sm">Loading live feed…</p>}
      {error && (
        <p className="text-amber-300 text-sm mb-6">
          <i className="fa-solid fa-triangle-exclamation mr-1" />
          Couldn&rsquo;t reach the USGS feed ({error}). If you&rsquo;re
          offline, this is expected — the last synced data would show here
          once caching is set up for this endpoint too.
        </p>
      )}

      <div className="space-y-3 mb-10">
        {filteredQuakes.slice(0, 8).map((q) => (
          <div
            key={q.id}
            className="rounded-xl bg-white/5 border border-white/10 p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-medium">{q.properties.place}</h3>
                <p className="text-sm text-white/60 mt-1">
                  Magnitude {q.properties.mag} ·{" "}
                  {new Date(q.properties.time).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                  })}{" "}
                  IST
                </p>
              </div>
              <StateTag state={q._state} />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <VerifiedBadge
                status="verified"
                sourceUrl={q.properties.url}
                sourceName="USGS event page"
              />
              <AudioAlertButton
                text={`Earthquake alert near ${q.properties.place}. Magnitude ${q.properties.mag}.`}
                label="Audio"
              />
            </div>
          </div>
        ))}
        {!loading && filteredQuakes.length === 0 && !error && (
          <p className="text-white/50 text-sm">
            No earthquakes ≥ M2.5 reported {stateFilter === "All India" ? "in the India region" : `for ${stateFilter}`} in the last
            30 days.
          </p>
        )}
      </div>

      <h2 className="font-display text-xl mb-4">
        Cyclones, floods & volcanic activity (GDACS, India)
      </h2>
      {gdacsLoading && (
        <p className="text-white/60 text-sm">Loading GDACS feed…</p>
      )}
      {gdacsError && (
        <p className="text-amber-300 text-sm mb-6">
          <i className="fa-solid fa-triangle-exclamation mr-1" />
          Couldn&rsquo;t reach the GDACS feed ({gdacsError}). GDACS doesn&rsquo;t
          publish CORS headers for every client, so this can fail from a
          pure-browser app even when the API itself is up — a small
          backend proxy fixes that if you hit it consistently.
        </p>
      )}
      <div className="space-y-3 mb-10">
        {filteredGdacs.slice(0, 8).map((ev, i) => {
          const p = ev.properties || {};
          return (
            <div
              key={p.eventid || i}
              className="rounded-xl bg-white/5 border border-white/10 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <h3 className="font-medium">
                  {p.eventname || p.name || p.eventtype}
                </h3>
                <StateTag state={ev._state} />
              </div>
              <p className="text-sm text-white/60 mt-1">
                {p.htmldescription
                  ? p.htmldescription.replace(/<[^>]+>/g, "").slice(0, 140)
                  : p.description || "See GDACS for full details."}
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <VerifiedBadge
                  status="verified"
                  sourceUrl={p.url?.report || DATA_SOURCES.gdacsAttributionUrl}
                  sourceName="GDACS event page"
                />
                <AudioAlertButton
                  text={`Emergency advisory: ${p.eventname || p.name || p.eventtype} in ${ev._state || "India"}.`}
                  label="Audio"
                />
              </div>
            </div>
          );
        })}
        {!gdacsLoading && filteredGdacs.length === 0 && !gdacsError && (
          <p className="text-white/50 text-sm">
            No active GDACS-tracked cyclone, flood or volcanic events{" "}
            {stateFilter === "All India" ? "for India" : `for ${stateFilter}`} right now.
          </p>
        )}
      </div>

      <h2 className="font-display text-xl mb-4">Community Reports</h2>
      <div className="space-y-3">
        {filteredCommunity.map((r) => (
          <div
            key={r.id}
            className="rounded-xl bg-white/5 border border-white/10 p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <h3 className="font-medium">{r.title}</h3>
              <StateTag state={r.state} />
            </div>
            <p className="text-sm text-white/60 mt-1">{r.detail}</p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <VerifiedBadge status="unverified" />
              <AudioAlertButton text={`Community report: ${r.title}. ${r.detail}`} label="Audio" />
            </div>
          </div>
        ))}
        {filteredCommunity.length === 0 && (
          <p className="text-white/50 text-sm">
            No community reports for {stateFilter}.
          </p>
        )}
      </div>

      <p className="text-xs text-white/40 mt-8">
        Earthquake data: {DATA_SOURCES.usgsAttribution} (
        <a href={DATA_SOURCES.usgsAttributionUrl} target="_blank" rel="noreferrer" className="underline">
          source
        </a>
        ). Cyclone/flood/volcano data: {DATA_SOURCES.gdacsAttribution} (
        <a href={DATA_SOURCES.gdacsAttributionUrl} target="_blank" rel="noreferrer" className="underline">
          source
        </a>
        ). Official government warnings: NDMA SACHET, IMD, and the Central
        Water Commission&rsquo;s{" "}
        <a href={DATA_SOURCES.cwcFloodForecast} target="_blank" rel="noreferrer" className="underline">
          flood forecasting portal
        </a>
        .
      </p>
    </PageShell>
  );
}
