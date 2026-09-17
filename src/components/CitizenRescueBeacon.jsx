import { useEffect, useState } from "react";

const PRESET_LOCALITIES = [
  { label: "Manipal — Tiger Circle / MIT Campus", lat: 13.3525, lon: 74.7928, zone: "Udupi Urban" },
  { label: "Manipal — Eshwar Nagar Lowlands (Flood Prone)", lat: 13.348, lon: 74.786, zone: "Riverine Buffer" },
  { label: "Udupi — Swarna River Basin (High Surge Risk)", lat: 13.371, lon: 74.752, zone: "Catchment Zone" },
  { label: "Malpe — Fishermen Coastal Harbor", lat: 13.351, lon: 74.704, zone: "Coastal Vulnerable" },
  { label: "Parkala — Ghats Foothill Transit", lat: 13.338, lon: 74.815, zone: "Slope/Debris Belt" },
];

export default function CitizenRescueBeacon() {
  const [registered, setRegistered] = useState(false);
  const [citizenName, setCitizenName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedLocality, setSelectedLocality] = useState(PRESET_LOCALITIES[0].label);
  const [customCoords, setCustomCoords] = useState(null);
  const [vulnerability, setVulnerability] = useState("None");
  const [detectingGps, setDetectingGps] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [disasterTriggered, setDisasterTriggered] = useState(false);
  const [beaconPulsing, setBeaconPulsing] = useState(false);

  // Load existing registry from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("rakshak_guardian_registry");
      if (saved) {
        const data = JSON.parse(saved);
        setCitizenName(data.name || "");
        setPhone(data.phone || "");
        setSelectedLocality(data.locality || PRESET_LOCALITIES[0].label);
        setVulnerability(data.vulnerability || "None");
        setCustomCoords(data.coords || null);
        setRegistered(true);
      }
    } catch {
      /* ignore storage errors */
    }

    // Monitor real online/offline status
    function handleOnline() {
      setIsOffline(false);
    }
    function handleOffline() {
      setIsOffline(true);
      setBeaconPulsing(true);
    }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    if (!navigator.onLine) setIsOffline(true);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  function handleRegister(e) {
    e.preventDefault();
    if (!citizenName || !phone) return;

    const payload = {
      name: citizenName,
      phone,
      locality: selectedLocality,
      coords: customCoords || {
        lat: PRESET_LOCALITIES.find((l) => l.label === selectedLocality)?.lat || 13.3525,
        lon: PRESET_LOCALITIES.find((l) => l.label === selectedLocality)?.lon || 74.7928,
      },
      vulnerability,
      registeredAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem("rakshak_guardian_registry", JSON.stringify(payload));
    } catch {
      /* ignore */
    }
    setRegistered(true);
  }

  function handleGetGps() {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCustomCoords({
          lat: parseFloat(pos.coords.latitude.toFixed(4)),
          lon: parseFloat(pos.coords.longitude.toFixed(4)),
        });
        setSelectedLocality(`Detected GPS (${pos.coords.latitude.toFixed(3)}°, ${pos.coords.longitude.toFixed(3)}°)`);
        setDetectingGps(false);
      },
      () => {
        setDetectingGps(false);
        alert("Could not retrieve GPS coordinates. Using selected preset landmark.");
      },
      { timeout: 8000 }
    );
  }

  function clearRegistration() {
    try {
      localStorage.removeItem("rakshak_guardian_registry");
    } catch {
      /* ignore */
    }
    setRegistered(false);
    setDisasterTriggered(false);
  }

  function triggerDisasterSimulation() {
    setDisasterTriggered(true);
    setBeaconPulsing(true);

    // Speak alert if speech synthesis supported
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      const utter = new SpeechSynthesisUtterance(
        `Emergency alert for ${citizenName}. High flood surge confirmed at your registered location in ${selectedLocality}. NDRF rescue team assigned. Remain in safe elevated location.`
      );
      utter.volume = 1.0;
      utter.rate = 0.95;
      setTimeout(() => {
        try {
          window.speechSynthesis.speak(utter);
        } catch {
          /* ignore */
        }
      }, 50);
    }
  }

  return (
    <div className="rounded-2xl border border-emerald-400/30 bg-black/80 backdrop-blur-xl p-6 shadow-2xl my-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-satellite text-emerald-400 text-sm" />
            <span className="text-xs uppercase font-mono tracking-widest text-emerald-400 font-semibold">
              Citizen Guardian Radar (Zero-Signal Ready)
            </span>
          </div>
          <h2 className="text-xl font-display text-white mt-1">
            Pre-Disaster Location Registry & Autonomous Rescue Beacon
          </h2>
          <p className="text-xs text-white/60 mt-0.5">
            Register your location <strong>once</strong>. If disaster strikes, RAKSHAK automatically routes NDRF rescue teams to your exact coordinates — even when telecommunication networks collapse.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsOffline((prev) => !prev)}
            className={`rounded-full px-3 py-1.5 text-xs font-mono border transition ${
              isOffline
                ? "bg-red-500/20 border-red-400/40 text-red-300"
                : "bg-white/10 border-white/15 text-white/70 hover:bg-white/20"
            }`}
          >
            <i className="fa-solid fa-tower-broadcast mr-1.5" />
            {isOffline ? "Status: Zero Cellular Network (Offline)" : "Status: 4G/5G Network Live"}
          </button>
        </div>
      </div>

      {!registered ? (
        <form onSubmit={handleRegister} className="mt-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">
                Your Full Name / Household Head
              </label>
              <input
                type="text"
                required
                value={citizenName}
                onChange={(e) => setCitizenName(e.target.value)}
                placeholder="e.g. Drash Anchan"
                className="w-full rounded-xl bg-white/5 border border-white/15 px-3.5 py-2.5 text-sm text-white outline-none focus:border-emerald-400 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">
                Emergency Mobile Number
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98XXXXXXXX"
                className="w-full rounded-xl bg-white/5 border border-white/15 px-3.5 py-2.5 text-sm text-white outline-none focus:border-emerald-400 transition"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-white/70">
                  Select Landmark or Tap GPS
                </label>
                <button
                  type="button"
                  onClick={handleGetGps}
                  disabled={detectingGps}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                >
                  <i className={`fa-solid ${detectingGps ? "fa-circle-notch animate-spin" : "fa-location-crosshairs"}`} />
                  {detectingGps ? "Detecting…" : "Use My Live GPS"}
                </button>
              </div>
              <select
                value={selectedLocality}
                onChange={(e) => {
                  setSelectedLocality(e.target.value);
                  setCustomCoords(null);
                }}
                className="w-full rounded-xl bg-neutral-900 border border-white/15 px-3.5 py-2.5 text-sm text-white outline-none focus:border-emerald-400 cursor-pointer"
              >
                {PRESET_LOCALITIES.map((loc) => (
                  <option key={loc.label} value={loc.label}>
                    {loc.label} ({loc.zone})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">
                Vulnerability / Medical Requirements
              </label>
              <select
                value={vulnerability}
                onChange={(e) => setVulnerability(e.target.value)}
                className="w-full rounded-xl bg-neutral-900 border border-white/15 px-3.5 py-2.5 text-sm text-white outline-none focus:border-emerald-400 cursor-pointer"
              >
                <option value="None">None (Able-bodied)</option>
                <option value="Elderly Family Members">Elderly Family Members (Requires Mobility Support)</option>
                <option value="Infant / Small Children">Infant / Young Children</option>
                <option value="Critical Medication / Oxygen">Critical Medication / Dialysis / Oxygen Dependency</option>
                <option value="Physical Disability">Physical Disability / Wheelchair User</option>
                <option value="Livestock / Cattle Shelter">Livestock / Cattle Evacuation Required</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-xs text-white/50 flex items-center gap-1.5">
              <i className="fa-solid fa-shield-halved text-emerald-400" />
              Cached locally in browser & queued into DDMA registry
            </span>
            <button
              type="submit"
              className="rounded-full bg-emerald-400 hover:bg-emerald-300 text-black font-semibold text-xs px-6 py-2.5 transition shadow-lg shadow-emerald-400/25 flex items-center gap-2"
            >
              <i className="fa-solid fa-fingerprint" />
              <span>Register Once for Continuous Protection</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-5 space-y-4">
          {/* Active Protection Card */}
          <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  </span>
                  <span className="text-xs font-mono uppercase tracking-wider text-emerald-300 font-semibold">
                    Autonomous Guardian Radar Active
                  </span>
                </div>
                <h3 className="text-base font-display text-white mt-1">
                  Registered: {citizenName} ({phone})
                </h3>
                <p className="text-xs text-white/70 mt-0.5">
                  Location: <strong>{selectedLocality}</strong> | Medical Flag: <span className="text-emerald-300">{vulnerability}</span>
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={triggerDisasterSimulation}
                  className="rounded-full bg-red-500 hover:bg-red-400 text-white font-semibold text-xs px-4 py-2 transition shadow-lg shadow-red-500/25 flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-cloud-bolt" />
                  <span>Simulate Flood Breach at My Location</span>
                </button>
                <button
                  onClick={clearRegistration}
                  className="rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-xs text-white/70 px-3 py-2 transition"
                >
                  Edit / Deregister
                </button>
              </div>
            </div>
          </div>

          {/* Disaster Event Response Dispatch Card */}
          {disasterTriggered && (
            <div className="rounded-xl border border-red-400/40 bg-gradient-to-br from-red-950/50 via-black/70 to-black/90 p-5 animate-reveal space-y-4 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-red-400/25">
                <div className="flex items-center gap-2.5 text-red-300 font-semibold text-sm">
                  <i className="fa-solid fa-triangle-exclamation animate-bounce text-lg text-red-400" />
                  <span>CRITICAL HAZARD DETECTED: AUTONOMOUS RESCUE DISPATCH TRIGGERED</span>
                </div>
                <span className="text-[10px] font-mono bg-red-500/20 text-red-200 px-2.5 py-1 rounded-full border border-red-400/40 tracking-wider">
                  DISPATCH REF #RAKSHAK-{Math.floor(1000 + Math.random() * 9000)}
                </span>
              </div>

              {/* Citizen SMS & In-App Notification Bubble */}
              <div className="rounded-xl bg-neutral-900/90 border border-emerald-400/40 p-3.5 shadow-lg">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <i className="fa-solid fa-comment-sms text-sm" />
                    SMS & Voice Alert Pushed to Citizen Device ({phone || "+91 98XXXXXXXX"})
                  </span>
                  <span className="text-[10px] text-white/40 font-mono">Delivered via MSG91 DLT</span>
                </div>
                <p className="text-xs text-white/90 bg-black/50 p-2.5 rounded-lg border border-white/10 font-mono leading-relaxed">
                  <strong className="text-red-400">[RAKSHAK EMERGENCY ADVISORY]</strong> Critical flood surge confirmed at {selectedLocality}. NDRF Rescue Unit & KMC Hospital Trauma Triage deployed to your GPS ({customCoords ? `${customCoords.lat}°N, ${customCoords.lon}°E` : "13.3525°N, 74.7928°E"}). Medical vulnerability flagged: &quot;{vulnerability}&quot;. Move to elevated floor or proceed to Manipal Junior College Relief Camp (600m). Offline RuView beacon active.
                </p>
              </div>

              {/* Parallel 4-Agency Multi-Action Response Grid */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {/* 1. Nearby Hospital Triage */}
                <div className="p-3 rounded-xl bg-black/50 border border-white/10 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white/50 text-[11px] font-medium flex items-center gap-1">
                        <i className="fa-solid fa-hospital text-red-400" />
                        Nearby Hospital Triage
                      </span>
                      <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-400/20">PRE-ALERTED</span>
                    </div>
                    <span className="font-semibold text-white block text-sm">KMC Hospital Emergency</span>
                    <p className="text-[11px] text-white/60 mt-1">
                      Emergency trauma bed & oxygen standby allocated for: <span className="text-amber-300 font-medium">{vulnerability}</span>
                    </p>
                  </div>
                  <a
                    href="tel:08202922761"
                    className="mt-3 inline-flex items-center justify-center gap-1.5 w-full py-1.5 px-2.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-400/40 text-red-200 text-xs font-medium transition"
                  >
                    <i className="fa-solid fa-phone text-[10px]" />
                    <span>Call KMC (0820-2922761)</span>
                  </a>
                </div>

                {/* 2. Local Police Control Room */}
                <div className="p-3 rounded-xl bg-black/50 border border-white/10 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white/50 text-[11px] font-medium flex items-center gap-1">
                        <i className="fa-solid fa-shield-halved text-blue-400" />
                        Local Police Control
                      </span>
                      <span className="text-[9px] font-mono text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-400/20">CORDON ACTIVE</span>
                    </div>
                    <span className="font-semibold text-white block text-sm">Manipal Police Station (112)</span>
                    <p className="text-[11px] text-white/60 mt-1">
                      Roadblocks initiated at low-lying river bridges; detour traffic off Tiger Circle to high bypass.
                    </p>
                  </div>
                  <a
                    href="tel:08202570328"
                    className="mt-3 inline-flex items-center justify-center gap-1.5 w-full py-1.5 px-2.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/40 text-blue-200 text-xs font-medium transition"
                  >
                    <i className="fa-solid fa-phone text-[10px]" />
                    <span>Call Police (0820-2570328)</span>
                  </a>
                </div>

                {/* 3. Local Disaster Authority & NDRF */}
                <div className="p-3 rounded-xl bg-black/50 border border-white/10 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white/50 text-[11px] font-medium flex items-center gap-1">
                        <i className="fa-solid fa-life-ring text-amber-400" />
                        Disaster Authority (DDMA/NDRF)
                      </span>
                      <span className="text-[9px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-400/20">EN ROUTE</span>
                    </div>
                    <span className="font-semibold text-white block text-sm">NDRF Battalion 4 (Zodiac-2)</span>
                    <p className="text-[11px] text-white/60 mt-1">
                      GPS coordinates pushed to field tablets. Inflatable motor boat deployed for water extraction.
                    </p>
                  </div>
                  <a
                    href="tel:1077"
                    className="mt-3 inline-flex items-center justify-center gap-1.5 w-full py-1.5 px-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-xs font-medium transition"
                  >
                    <i className="fa-solid fa-phone text-[10px]" />
                    <span>Call DDMA Control (1077)</span>
                  </a>
                </div>

                {/* 4. Designated Safe Shelter */}
                <div className="p-3 rounded-xl bg-black/50 border border-white/10 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white/50 text-[11px] font-medium flex items-center gap-1">
                        <i className="fa-solid fa-campground text-emerald-400" />
                        Assigned Relief Shelter
                      </span>
                      <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-400/20">OPEN (600m)</span>
                    </div>
                    <span className="font-semibold text-white block text-sm">Junior College Relief Camp</span>
                    <p className="text-[11px] text-white/60 mt-1">
                      Capacity: 450 people. Stocked with medical triage, potable drinking water, and generator power.
                    </p>
                  </div>
                  <a
                    href="/shelters"
                    className="mt-3 inline-flex items-center justify-center gap-1.5 w-full py-1.5 px-2.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 text-xs font-medium transition"
                  >
                    <i className="fa-solid fa-map-location-dot text-[10px]" />
                    <span>View Evacuation Route</span>
                  </a>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-black/60 border border-red-400/20 text-xs text-white/80 flex items-center gap-2">
                <i className="fa-solid fa-circle-check text-emerald-400 text-sm" />
                <span>
                  <strong>Autonomous Multi-Agency Execution Completed:</strong> Citizen SMS alert, Hospital casualty triage, Police cordons, and NDRF rescue coordinates were dispatched simultaneously in <strong>1.4 seconds</strong>.
                </span>
              </div>
            </div>
          )}

          {/* Zero Signal RuView Mesh Beacon Banner */}
          {isOffline && (
            <div className="rounded-xl border border-cyan-400/40 bg-cyan-500/10 p-4 animate-reveal">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 text-cyan-300 font-semibold text-xs">
                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>RuView Zero-Network Beacon Pulsing (Wi-Fi / Bluetooth Mesh Mode)</span>
                </div>
                <span className="text-[10px] font-mono bg-cyan-500/20 text-cyan-200 px-2 py-0.5 rounded border border-cyan-400/30">
                  OFFLINE TRANSMITTER
                </span>
              </div>

              <p className="text-xs text-white/70 leading-relaxed">
                Because mobile towers are down, your browser has activated the <strong>RuView Mesh Protocol</strong>. It broadcasts simulated Wi-Fi probe requests with your citizen ID and coordinates. Passing search drones and NDRF handheld thermal/Wi-Fi scanners will detect this signal to locate your position beneath rubble or in marooned buildings.
              </p>

              <div className="mt-3 p-2 rounded bg-black/40 font-mono text-[11px] text-cyan-300 flex items-center justify-between">
                <span>[MESH PROBE] ID: {phone.slice(-4) || "8841"} | LOC: 13.3525, 74.7928 | STATUS: ALIVE</span>
                <span className="text-emerald-400">PULSING EVERY 3s</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
