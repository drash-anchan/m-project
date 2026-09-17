import { useState } from "react";

const TARGETS = [
  {
    id: "hospital",
    icon: "fa-hospital",
    name: "Kasturba Hospital (KMC), Manipal",
    type: "Healthcare / Trauma & Casualty Triage",
    phone: "0820-2922761",
    directDial: "tel:08202922761",
    action: "Mass-casualty alert, ICU standby & emergency trauma ward reservation",
    channel: "Automated IVR Voice Call + HL7 Webhook",
    channelBadge: "Live Call & Webhook",
    latency: "340ms",
  },
  {
    id: "campus",
    icon: "fa-graduation-cap",
    name: "MAHE / MIT Campus Security & Hostels",
    type: "Educational Institution",
    phone: "0820-2922525",
    directDial: "tel:08202922525",
    action: "Campus PA activation, student hostel lockdown & academic transit suspension",
    channel: "Campus Broadcast Push API",
    channelBadge: "Push Notification",
    latency: "410ms",
  },
  {
    id: "fire",
    icon: "fa-fire-extinguisher",
    name: "Udupi District Fire & Rescue Station",
    type: "First Responders",
    phone: "0820-2520333",
    directDial: "tel:08202520333",
    action: "Deploy Rescue Unit 4 (inflatable zodiac boats & dewatering pumps) to Manipal Lake area",
    channel: "DLT Transactional SMS (Route 4)",
    channelBadge: "MSG91 SMS",
    latency: "620ms",
  },
  {
    id: "police",
    icon: "fa-shield-halved",
    name: "Manipal Police Station (Control Room)",
    type: "Law Enforcement & Traffic Redirection",
    phone: "0820-2570328",
    directDial: "tel:08202570328",
    action: "Cordon low-lying river bridges; detour traffic off Tiger Circle towards high-ground bypass",
    channel: "Police Wireless & SMS Webhook",
    channelBadge: "Police Net",
    latency: "480ms",
  },
  {
    id: "ddma",
    icon: "fa-landmark",
    name: "Udupi District Disaster Control Room (DDMA)",
    type: "District Emergency Operations Centre",
    phone: "0820-2574802",
    directDial: "tel:08202574802",
    action: "Formal escalation to Deputy Commissioner & SDRF 3rd Battalion standby",
    channel: "Priority CAP-SACHET Webhook",
    channelBadge: "DEOC Line (1077)",
    latency: "290ms",
  },
  {
    id: "citizens",
    icon: "fa-users",
    name: "Manipal Ward 3 & 4 Residents (5,200+ Citizens)",
    type: "Civilian Population",
    phone: "Toll-Free 1077",
    action: "Geo-targeted Kannada/English audio voice warning & nearest shelter directions",
    channel: "Twilio AI Voice Call + Cell SMS",
    channelBadge: "AI Voice / SMS",
    latency: "890ms",
  },
];

export default function HermesBroadcastDemo() {
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [statuses, setStatuses] = useState({});
  const [logs, setLogs] = useState([]);
  const [callingKmc, setCallingKmc] = useState(false);

  function runSimulation() {
    setRunning(true);
    setCompleted(false);
    setStatuses({});
    setLogs([]);

    const timestamp = new Date().toLocaleTimeString();
    addLog(`[${timestamp}] Hermes Autonomous Agent triggered for Manipal sector (Flash-Flood Alert Level: HIGH).`);
    addLog(`[${timestamp}] Resolving municipal stakeholders and critical infrastructure phone/API endpoints...`);

    TARGETS.forEach((target, index) => {
      setTimeout(() => {
        setStatuses((prev) => ({ ...prev, [target.id]: "in-flight" }));
        addLog(`[${new Date().toLocaleTimeString()}] Dispatching payload to ${target.name} (${target.phone}) via ${target.channel}...`);
      }, index * 250);

      setTimeout(() => {
        const token = "HERMES-" + Math.random().toString(36).substring(2, 9).toUpperCase();
        setStatuses((prev) => ({ ...prev, [target.id]: "delivered", token }));
        addLog(`[${new Date().toLocaleTimeString()}] ACK RECEIVED from ${target.name} (${target.phone}) (latency: ${target.latency}, ref: ${token})`);

        if (index === TARGETS.length - 1) {
          setTimeout(() => {
            setRunning(false);
            setCompleted(true);
            addLog(`[${new Date().toLocaleTimeString()}] ALL 6 TARGET NODES NOTIFIED IN PARALLEL. Total sequence elapsed time: 1.84s.`);
          }, 400);
        }
      }, 700 + index * 350);
    });
  }

  function addLog(msg) {
    setLogs((prev) => [...prev, msg]);
  }

  function resetSimulation() {
    setRunning(false);
    setCompleted(false);
    setStatuses({});
    setLogs([]);
  }

  function simulateKmcLiveCall() {
    if (callingKmc) {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      setCallingKmc(false);
      return;
    }

    setCallingKmc(true);
    addLog(`[${new Date().toLocaleTimeString()}] INITIATING LIVE IVR CALL TO KMC HOSPITAL CASUALTY: 0820-2922761...`);

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      const message = "Priority Emergency Dispatch. This is Project RAKSHAK Hermes Automated System calling Kasturba Medical College Hospital Emergency Desk, Manipal at 0 8 2 0, 2 9 2 2 7 6 1. Severe flash-flood surge detected in Swarna river basin. Mass-casualty triage protocol activated. Please prepare emergency trauma ward and reserve twenty I C U beds immediately.";
      const utter = new SpeechSynthesisUtterance(message);
      utter.volume = 1.0;
      utter.rate = 0.94;
      utter.pitch = 1.0;
      utter.onend = () => setCallingKmc(false);
      utter.onerror = () => setCallingKmc(false);
      setTimeout(() => {
        try {
          window.speechSynthesis.speak(utter);
        } catch {
          setCallingKmc(false);
        }
      }, 50);
    } else {
      setTimeout(() => setCallingKmc(false), 8000);
    }
  }

  return (
    <div className="rounded-2xl border border-cyan-400/30 bg-black/80 backdrop-blur-xl p-6 shadow-2xl my-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-xs uppercase font-mono tracking-widest text-cyan-400 font-semibold">
              Autonomous Response Engine
            </span>
          </div>
          <h2 className="text-xl font-display text-white mt-1">
            Hermes Multi-Agency Parallel Broadcast Protocol
          </h2>
          <p className="text-xs text-white/60 mt-0.5">
            When severe disaster anomalies are confirmed, Hermes notifies hospitals (KMC), police, fire stations, campus security, and residents in parallel.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={simulateKmcLiveCall}
            className={`rounded-full px-4 py-2 text-xs font-semibold flex items-center gap-2 transition-all ${
              callingKmc
                ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30"
                : "bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-400/30"
            }`}
            title="Place automated priority IVR call to KMC Hospital Emergency Casualty Desk"
          >
            <i className={`fa-solid ${callingKmc ? "fa-phone-slash" : "fa-phone-volume animate-bounce"}`} />
            <span>{callingKmc ? "Ending Live Call…" : "Place AI Voice Call to KMC (0820-2922761)"}</span>
          </button>

          {completed && (
            <button
              onClick={resetSimulation}
              className="rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-xs px-3.5 py-2 transition"
            >
              Reset Stream
            </button>
          )}

          <button
            onClick={runSimulation}
            disabled={running}
            className={`rounded-full px-5 py-2 text-xs font-semibold flex items-center gap-2 transition-all ${
              running
                ? "bg-cyan-500/50 text-white cursor-not-allowed"
                : "bg-cyan-400 hover:bg-cyan-300 text-black shadow-lg shadow-cyan-400/25"
            }`}
          >
            <i className={`fa-solid ${running ? "fa-circle-notch animate-spin" : "fa-tower-broadcast"}`} />
            <span>{running ? "Broadcasting in Parallel…" : "Execute Hermes Parallel Broadcast"}</span>
          </button>
        </div>
      </div>

      {/* Active KMC Emergency Call Banner */}
      {callingKmc && (
        <div className="mt-4 p-4 rounded-xl bg-red-500/15 border border-red-400/40 animate-reveal flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-red-500 text-white flex items-center justify-center text-sm shrink-0 animate-bounce">
              <i className="fa-solid fa-phone" />
            </div>
            <div>
              <div className="text-white font-semibold flex items-center gap-2">
                <span>ACTIVE EMERGENCY IVR CALL: Kasturba Medical College (KMC) Manipal</span>
                <span className="bg-red-500/30 px-2 py-0.5 rounded text-[10px] font-mono text-red-200">
                  CONNECTED
                </span>
              </div>
              <p className="text-white/70 mt-0.5">
                Target Phone: <strong className="text-white font-mono">0820-2922761</strong> (Emergency & Trauma Triage Desk)
              </p>
            </div>
          </div>
          <a
            href="tel:08202922761"
            className="rounded-full bg-red-500 hover:bg-red-400 text-white font-semibold text-xs px-4 py-2 transition text-center shrink-0 flex items-center justify-center gap-1.5"
          >
            <i className="fa-solid fa-phone" />
            <span>Dial 0820-2922761 Directly</span>
          </a>
        </div>
      )}

      {/* Target Nodes Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 my-5">
        {TARGETS.map((t) => {
          const status = statuses[t.id];
          return (
            <div
              key={t.id}
              className={`rounded-xl border p-4 transition-all duration-300 ${
                status === "delivered"
                  ? "bg-emerald-500/10 border-emerald-400/40 text-emerald-100"
                  : status === "in-flight"
                  ? "bg-cyan-500/10 border-cyan-400/40 text-cyan-100 animate-pulse"
                  : "bg-white/5 border-white/10 text-white/70"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs ${
                    status === "delivered" ? "bg-emerald-400 text-black" : "bg-white/10 text-white"
                  }`}>
                    <i className={`fa-solid ${t.icon}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white leading-tight">{t.name}</h3>
                    <span className="text-[11px] text-white/50">{t.type}</span>
                  </div>
                </div>

                <span className="shrink-0 text-[10px] font-mono px-2 py-0.5 rounded-full border border-white/15 bg-black/40">
                  {t.channelBadge}
                </span>
              </div>

              <div className="mt-2 text-xs flex items-center gap-2 text-cyan-300 font-mono">
                <i className="fa-solid fa-phone text-[10px] text-white/40" />
                <span>{t.phone}</span>
                {t.directDial && (
                  <a href={t.directDial} className="text-[10px] text-white/50 hover:text-white underline ml-auto">
                    Dial
                  </a>
                )}
              </div>

              <p className="text-xs text-white/65 mt-2 leading-relaxed">
                {t.action}
              </p>

              <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px]">
                <span className="font-mono text-white/40">{t.channel}</span>
                {status === "delivered" ? (
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <i className="fa-solid fa-circle-check text-xs" /> ACK ({t.latency})
                  </span>
                ) : status === "in-flight" ? (
                  <span className="text-cyan-300 font-medium flex items-center gap-1">
                    <i className="fa-solid fa-spinner animate-spin text-xs" /> In Flight
                  </span>
                ) : (
                  <span className="text-white/40">Standby</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Audit Log */}
      {logs.length > 0 && (
        <div className="mt-4 rounded-xl bg-black/60 border border-white/10 p-3.5 font-mono text-[11px] text-white/75 max-h-40 overflow-y-auto space-y-1">
          <div className="text-[10px] uppercase tracking-wider text-cyan-400 font-semibold mb-1">
            Hermes Execution Stream
          </div>
          {logs.map((log, i) => (
            <div key={i} className="leading-5">
              <span className="text-cyan-400 mr-1.5">›</span>
              {log}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
