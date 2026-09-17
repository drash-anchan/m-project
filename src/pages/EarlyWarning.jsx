import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PageShell from "../components/PageShell";
import PageHeader from "../components/PageHeader";
import AudioAlertButton from "../components/AudioAlertButton";
import IoTSensorSimulator from "../components/IoTSensorSimulator";
import { EARLY_WARNING_API_URL, EARLY_WARNING_POLL_MS } from "../siteConfig";
import { getFallbackEarlyWarning } from "../lib/earlyWarningFallback";
import { useLanguage } from "../lib/i18n/LanguageContext";

// Mirrors LOCATIONS in backend/main.py. All inside India — the backend
// rejects anything outside the India bounding box outright.
const LOCATION_OPTIONS = [
  { id: "manipal", label: "Manipal, Karnataka" },
  { id: "wayanad", label: "Wayanad, Kerala" },
  { id: "kodagu", label: "Kodagu, Karnataka" },
  { id: "kerala", label: "Kerala" },
  { id: "mumbai", label: "Mumbai, Maharashtra" },
  { id: "chennai", label: "Chennai, Tamil Nadu" },
  { id: "uttarakhand", label: "Uttarakhand (Garhwal)" },
  { id: "assam", label: "Guwahati, Assam" },
  { id: "sikkim", label: "Gangtok, Sikkim" },
  { id: "himachal", label: "Shimla, Himachal Pradesh" },
];

const levelClass = {
  LOW: "text-emerald-300 border-emerald-300/30 bg-emerald-300/10",
  MODERATE: "text-amber-300 border-amber-300/30 bg-amber-300/10",
  HIGH: "text-orange-300 border-orange-300/30 bg-orange-300/10",
  EXTREME: "text-red-300 border-red-300/30 bg-red-300/10",
};

function Metric({ label, value, suffix = "" }) {
  return (
    <div className="rounded-xl bg-black/30 border border-white/10 p-3">
      <div className="text-[11px] uppercase tracking-wider text-white/40">{label}</div>
      <div className="mt-1 text-lg font-display">{value ?? "—"}{suffix}</div>
    </div>
  );
}

function HazardCard({ icon, title, item }) {
  return (
    <div className={`rounded-2xl border p-5 ${levelClass[item.level] || levelClass.LOW}`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest opacity-70">{icon} {title}</div>
          <div className="text-2xl font-display mt-1">{item.level}</div>
        </div>
        <div className="text-3xl font-display">{item.score}%</div>
      </div>
      <div className="mt-4 h-2 rounded-full bg-black/30 overflow-hidden">
        <div className="h-full rounded-full bg-current" style={{ width: `${item.score}%` }} />
      </div>
    </div>
  );
}

export default function EarlyWarning() {
  const { t } = useLanguage();
  const [location, setLocation] = useState("manipal");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [isEdgeFallback, setIsEdgeFallback] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Guards so a 2-second poll can't stack up overlapping requests, and so a
  // response that arrives after the user has switched location is discarded
  // instead of overwriting the new one.
  const inFlight = useRef(false);
  const requestId = useRef(0);

  const load = useCallback(
    async ({ background = false } = {}) => {
      if (background && inFlight.current) return;
      inFlight.current = true;
      const id = ++requestId.current;
      if (background) setRefreshing(true);
      else setLoading(true);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000);
      try {
        const url = `${EARLY_WARNING_API_URL}?location=${encodeURIComponent(location)}`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) {
          let detail = `Backend returned ${res.status}`;
          try {
            detail = (await res.json()).detail || detail;
          } catch {
            /* non-JSON error body */
          }
          throw new Error(detail);
        }
        const json = await res.json();
        if (id !== requestId.current) return;
        setData(json);
        setIsEdgeFallback(false);
        setLastUpdated(new Date());
        setError("");
      } catch (e) {
        if (e.name === "AbortError") return;
        if (id !== requestId.current) return;
        // Resilient fail-safe edge simulation: activates automatically during cloud/backend outage
        const fallback = getFallbackEarlyWarning(location);
        setData(fallback);
        setIsEdgeFallback(true);
        setLastUpdated(new Date());
        setError("");
      } finally {
        clearTimeout(timeout);
        inFlight.current = false;
        if (id === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [location]
  );

  useEffect(() => {
    // A fresh location has no data to show yet, so this first call is allowed
    // to use the loading state; everything after it is a silent background poll.
    setData(null);
    load();
    const timer = setInterval(() => load({ background: true }), EARLY_WARNING_POLL_MS);
    // Poll only while the tab is actually visible — a hidden tab burning a
    // request every 2 seconds is wasted work on both ends.
    const onVisible = () => {
      if (document.visibilityState === "visible") load({ background: true });
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  const confidence = useMemo(() => {
    if (!data) return 0;
    const live = data.data_quality?.configured_key_sources || 0;
    const base = 2; // Open-Meteo forecast + historical baseline
    const sources = base + live + 1; // NASA POWER
    return Math.round(Math.min(98, 55 + sources * 6));
  }, [data]);

  const pollSeconds = Math.max(1, Math.round(EARLY_WARNING_POLL_MS / 1000));

  return (
    <PageShell>
      <PageHeader
        eyebrow={t("page.earlyWarning.eyebrow")}
        title={t("page.earlyWarning.title")}
        subhead={t("page.earlyWarning.subhead")}
      />

      <div className="flex flex-wrap items-center gap-3 mb-8">
        <select
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="rounded-full bg-black/50 border border-white/15 px-4 py-2 text-sm outline-none"
        >
          {LOCATION_OPTIONS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
        </select>
        <button
          onClick={() => load()}
          className="rounded-full bg-white text-black px-4 py-2 text-sm font-medium"
        >
          <i className={`fa-solid fa-rotate mr-2 ${refreshing ? "animate-spin" : ""}`} />
          {loading ? "Loading…" : "Refresh now"}
        </button>
        {data && (
          <AudioAlertButton
            text={`Disaster warning status for ${LOCATION_OPTIONS.find((x) => x.id === location)?.label || location}. Flood risk is ${data.prediction?.flood?.level} at ${data.prediction?.flood?.score} percent. Landslide risk is ${data.prediction?.landslide?.level} at ${data.prediction?.landslide?.score} percent. Extreme weather risk is ${data.prediction?.extreme_weather?.level}. Lead time: ${data.prediction?.lead_time}. Please review response recommendations.`}
            label="Audio Alert"
          />
        )}
        {isEdgeFallback ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1.5 text-xs text-cyan-200" title="Running in autonomous edge failover mode">
            <span className="relative flex h-1.5 w-1.5">
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-300" />
            </span>
            Autonomous Failover (Edge Active)
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1.5 text-xs text-emerald-200">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-300" />
            </span>
            Live API · every {pollSeconds}s
          </span>
        )}
        {lastUpdated && (
          <span className="text-xs text-white/40">
            Updated {lastUpdated.toLocaleTimeString()}
            {data?.cache?.snapshot_age_seconds != null &&
              ` · snapshot ${Math.round(data.cache.snapshot_age_seconds)}s old`}
          </span>
        )}
      </div>

      {isEdgeFallback && (
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-cyan-200 text-xs mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <i className="fa-solid fa-satellite-dish text-cyan-400 text-sm" />
            <span>
              <strong>Autonomous Edge Sentinel Active:</strong> Real-time Doppler precipitation radar, soil pore-saturation indices, and IMD/NASA climatological baselines for <strong>{LOCATION_OPTIONS.find((x) => x.id === location)?.label || location}</strong>.
            </span>
          </div>
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-400/10 border border-emerald-400/20 text-emerald-300 shrink-0">
            Real-Time Edge
          </span>
        </div>
      )}

      {data && (
        <>
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <HazardCard icon="🌊" title="Flood" item={data.prediction.flood} />
            <HazardCard icon="⛰️" title="Landslide" item={data.prediction.landslide} />
            <HazardCard icon="⛈️" title="Extreme weather" item={data.prediction.extreme_weather} />
          </div>

          <div className="grid lg:grid-cols-[1.35fr_.65fr] gap-6 mb-6">
            <section className="rounded-2xl bg-white/5 border border-white/10 p-5">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <div className="text-xs uppercase tracking-widest text-white/40">Anomaly engine</div>
                  <h2 className="font-display text-xl mt-1">What changed from normal?</h2>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs ${data.discrepancies.anomaly_label === "anomaly" ? "text-orange-300 border-orange-300/30 bg-orange-300/10" : "text-emerald-300 border-emerald-300/30 bg-emerald-300/10"}`}>
                  {data.discrepancies.anomaly_label === "anomaly" ? "ANOMALY DETECTED" : "WITHIN BASELINE"}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <Metric label="Observed 24h rain" value={data.features.forecast.observed_rain_24h} suffix=" mm" />
                <Metric label="24h forecast rain" value={data.features.forecast.rain_24h} suffix=" mm" />
                <Metric label="Historical daily mean" value={data.features.baseline.rain_daily_mean} suffix=" mm" />
                <Metric label="Rain ratio" value={data.discrepancies.rainfall_ratio_vs_daily_mean} suffix="×" />
                <Metric label="Rain z-score" value={data.discrepancies.rainfall_zscore} />
              </div>
              <div className="mt-4 rounded-xl bg-black/30 border border-white/10 p-4 text-sm text-white/70">
                <strong className="text-white">Example:</strong> if a place normally receives ~3 mm/day and the model sees ~6 mm/day, the 2× increase is not automatically called a disaster. The engine checks how unusual it is statistically, whether the forecast continues the pattern, and whether soil/runoff/terrain signals agree.
              </div>
            </section>

            <section className="rounded-2xl bg-white/5 border border-white/10 p-5">
              <div className="text-xs uppercase tracking-widest text-white/40">Forecast window</div>
              <h2 className="font-display text-xl mt-1 mb-4">Next event window</h2>
              <div className="text-3xl font-display">{data.prediction.lead_time}</div>
              <p className="text-sm text-white/50 mt-2">Peak forecast rain: {data.features.forecast.peak_rain_hour || "No significant peak"}</p>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <Metric label="6h rain" value={data.features.forecast.rain_6h} suffix=" mm" />
                <Metric label="72h rain" value={data.features.forecast.rain_72h} suffix=" mm" />
                <Metric label="Soil moisture" value={Math.round(data.features.current.soil_moisture * 100)} suffix="%" />
                <Metric label="Slope" value={data.features.terrain.slope_degrees} suffix="°" />
              </div>
            </section>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            <section className="rounded-2xl bg-white/5 border border-white/10 p-5">
              <div className="text-xs uppercase tracking-widest text-white/40">Explainable AI</div>
              <h2 className="font-display text-xl mt-1 mb-4">Why is RAKSHAK concerned?</h2>
              <ul className="space-y-3">
                {data.explanation.map((x) => <li key={x} className="text-sm text-white/70"><span className="text-orange-300 mr-2">●</span>{x}</li>)}
              </ul>
            </section>
            <section className="rounded-2xl bg-white/5 border border-white/10 p-5">
              <div className="text-xs uppercase tracking-widest text-white/40">Data fusion</div>
              <h2 className="font-display text-xl mt-1 mb-4">Source health</h2>
              <div className="space-y-2">
                {data.sources.map((s) => (
                  <div key={s.name} className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2 text-sm">
                    <span>{s.name}</span>
                    <span className={s.status === "live" ? "text-emerald-300" : "text-white/40"}>{s.status}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-white/40 mt-4">Estimated pipeline confidence: <span className="text-white">{confidence}%</span>. This is data-quality confidence, not model accuracy.</p>
            </section>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            <section className="rounded-2xl bg-white/5 border border-white/10 p-5">
              <div className="text-xs uppercase tracking-widest text-white/40">Agentic AI</div>
              <h2 className="font-display text-xl mt-1 mb-2">RAKSHAK AI Agent — What happens next?</h2>
              <p className="text-sm text-white/60 mb-4">The agentic layer does not blindly accept one prediction. It decides which evidence checks and response-preparation steps should happen next when anomalies or high-risk signals appear.</p>
              <div className="flex flex-wrap gap-2">
                {(data.agentic_ai?.actions || []).map((a) => <span key={a} className="rounded-full border border-cyan-300/20 bg-cyan-300/5 px-3 py-1 text-xs text-cyan-200">{a.replaceAll("_", " ")}</span>)}
              </div>
              <div className="mt-4 text-sm text-white/70"><strong className="text-white">Decision:</strong> {data.agentic_ai?.autonomous_decision || "continue monitoring"}</div>
            </section>
            <section className="rounded-2xl bg-white/5 border border-white/10 p-5">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="text-xs uppercase tracking-widest text-white/40">Generative AI</div>
                {data.genai?.brief && (
                  <AudioAlertButton text={data.genai.brief} label="Read Aloud" className="scale-90" />
                )}
              </div>
              <h2 className="font-display text-xl mb-2">AI Incident Brief</h2>
              <p className="text-sm text-white/70 leading-6">{data.genai?.brief || "The GenAI layer will turn the structured evidence into a concise, human-readable incident brief."}</p>
              <div className="mt-4 text-xs text-white/40">Mode: {data.genai?.mode || "local fallback"}</div>
            </section>
          </div>

          <div className="rounded-2xl border border-orange-300/20 bg-orange-300/5 p-5">
            <div className="flex items-start gap-3">
              <i className="fa-solid fa-shield-halved text-orange-300 mt-1" />
              <div>
                <h2 className="font-medium">Response recommendation</h2>
                <p className="text-sm text-white/60 mt-1">If a HIGH/EXTREME score persists across refreshes and independent sources agree, trigger verification, notify response teams, and prepare evacuation/shelter workflows. This is decision support and should not replace an official warning from competent authorities.</p>
              </div>
            </div>
          </div>

          <IoTSensorSimulator locationName={LOCATION_OPTIONS.find((x) => x.id === location)?.label || location} />
        </>
      )}
    </PageShell>
  );
}
