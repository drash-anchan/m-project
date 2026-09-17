import { useState, useEffect, useRef } from "react";
import { DOMINO_SCENARIOS } from "../lib/infrastructureData";

// Massive Bridge Collapse & Earthquake Shockwave Synthesizer
function playCollapseShockwaveSound(severity = "critical", stepNum = 1) {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const t = ctx.currentTime;
    const duration = 1.4; // 1.4s of heavy seismic shockwave and rolling debris

    // Master bus
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.78, t);
    masterGain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    masterGain.connect(ctx.destination);

    // 1. INITIAL SHEAR TRANSIENT (Concrete fracture / steel snap crack)
    const crackOsc = ctx.createOscillator();
    const crackGain = ctx.createGain();
    crackOsc.type = "sawtooth";
    crackOsc.frequency.setValueAtTime(190, t);
    crackOsc.frequency.exponentialRampToValueAtTime(38, t + 0.08);
    crackGain.gain.setValueAtTime(0.65, t);
    crackGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    crackOsc.connect(crackGain);
    crackGain.connect(masterGain);
    crackOsc.start(t);
    crackOsc.stop(t + 0.1);

    // 2. SUB-BASS MASSIVE TECTONIC SHOCK (Thousands of tons hitting earth)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = "sine";
    const startPitch = severity === "critical" ? 115 : 95;
    subOsc.frequency.setValueAtTime(startPitch, t);
    subOsc.frequency.exponentialRampToValueAtTime(24, t + 0.55);

    subGain.gain.setValueAtTime(0.9, t);
    subGain.gain.exponentialRampToValueAtTime(0.01, t + 0.75);
    subOsc.connect(subGain);
    subGain.connect(masterGain);
    subOsc.start(t);
    subOsc.stop(t + 0.8);

    // 3. LOW FREQUENCY EARTHQUAKE RUMBLE (Ground tremor with vibrato LFO)
    const rumbleOsc = ctx.createOscillator();
    const rumbleGain = ctx.createGain();
    rumbleOsc.type = "triangle";
    rumbleOsc.frequency.setValueAtTime(56, t);
    rumbleOsc.frequency.linearRampToValueAtTime(28, t + duration);

    // 15 Hz tremor LFO for ground-shaking wobble
    const tremorLfo = ctx.createOscillator();
    const tremorLfoGain = ctx.createGain();
    tremorLfo.type = "sine";
    tremorLfo.frequency.setValueAtTime(15, t);
    tremorLfoGain.gain.setValueAtTime(14, t);
    tremorLfo.connect(tremorLfoGain);
    tremorLfoGain.connect(rumbleOsc.frequency);
    tremorLfo.start(t);
    tremorLfo.stop(t + duration);

    rumbleGain.gain.setValueAtTime(0.6, t);
    rumbleGain.gain.linearRampToValueAtTime(0.42, t + 0.25);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    rumbleOsc.connect(rumbleGain);
    rumbleGain.connect(masterGain);
    rumbleOsc.start(t);
    rumbleOsc.stop(t + duration);

    // 4. CRUMBLING DEBRIS & AIR-BLAST ROAR (Filtered Brown Noise)
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    // Brown noise algorithm (integrated random walk) for thunderous roar
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.045 * white)) / 1.045;
      lastOut = output[i];
      output[i] *= 4.2;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(420, t); // Initial explosive shockwave dust
    filter.frequency.exponentialRampToValueAtTime(55, t + duration); // Low rolling seismic rumble
    filter.Q.setValueAtTime(4.0, t); // Resonant boom

    // Soft-clipping distortion for acoustic power
    const waveShaper = ctx.createWaveShaper();
    const n = 256;
    const curve = new Float32Array(n);
    const deg = Math.PI / 180;
    for (let i = 0; i < n; ++i) {
      const x = (i * 2) / n - 1;
      curve[i] = (24 * x * 20 * deg) / (Math.PI + 20 * Math.abs(x));
    }
    waveShaper.curve = curve;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.8, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + duration);

    noiseSource.connect(filter);
    filter.connect(waveShaper);
    waveShaper.connect(noiseGain);
    noiseGain.connect(masterGain);

    noiseSource.start(t);
    noiseSource.stop(t + duration);
  } catch {
    // Continue if audio is restricted
  }
}

export default function DominoCascadeSimulator({ defaultScenarioId = "bridge_b7" }) {
  const [selectedScenarioId, setSelectedScenarioId] = useState(defaultScenarioId);
  const [visibleStepCount, setVisibleStepCount] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [shaking, setShaking] = useState(false);
  const [showIntervention, setShowIntervention] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const autoPlayTimerRef = useRef(null);

  const scenario = DOMINO_SCENARIOS.find((s) => s.id === selectedScenarioId) || DOMINO_SCENARIOS[0];
  const totalSteps = scenario.afterSteps.length;
  const isComplete = visibleStepCount >= totalSteps;
  const nextStep = visibleStepCount < totalSteps ? scenario.afterSteps[visibleStepCount] : null;

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  // Reset state when changing scenario
  const handleSelectScenario = (id) => {
    if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
    setIsAutoPlaying(false);
    setSelectedScenarioId(id);
    setVisibleStepCount(0);
    setShowIntervention(false);
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  // Reset entire domino chain
  const handleReset = () => {
    if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
    setIsAutoPlaying(false);
    setVisibleStepCount(0);
    setShowIntervention(false);
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  // Step-by-step trigger click: Pops the next failure in the domino chain reaction
  const handleTriggerStep = () => {
    if (isAutoPlaying) {
      if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
      setIsAutoPlaying(false);
      return;
    }

    if (visibleStepCount >= totalSteps) {
      handleReset();
      return;
    }

    const nextCount = visibleStepCount + 1;
    setVisibleStepCount(nextCount);
    setShaking(true);
    setTimeout(() => setShaking(false), 650);

    if (soundEnabled) {
      const step = scenario.afterSteps[nextCount - 1];
      playCollapseShockwaveSound(step?.severity, nextCount);
    }
  };

  // Auto-cascade toggle
  const handleToggleAutoPlay = (e) => {
    if (e) e.stopPropagation();
    if (isAutoPlaying) {
      if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
      setIsAutoPlaying(false);
    } else {
      if (visibleStepCount >= totalSteps) {
        setVisibleStepCount(0);
        setShowIntervention(false);
      }
      setIsAutoPlaying(true);
    }
  };

  // Auto-play timer effect: Staggers cascade 1-by-1 with 1.35s interval with shockwave rumble
  useEffect(() => {
    if (!isAutoPlaying) {
      if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
      return;
    }

    if (visibleStepCount >= totalSteps) {
      setIsAutoPlaying(false);
      return;
    }

    autoPlayTimerRef.current = setTimeout(() => {
      setVisibleStepCount((prev) => {
        const next = prev + 1;
        setShaking(true);
        setTimeout(() => setShaking(false), 650);
        if (soundEnabled) {
          const step = scenario.afterSteps[next - 1];
          playCollapseShockwaveSound(step?.severity, next);
        }
        if (next >= totalSteps) {
          setIsAutoPlaying(false);
        }
        return next;
      });
    }, 1350);

    return () => {
      if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
    };
  }, [isAutoPlaying, visibleStepCount, totalSteps, scenario, soundEnabled]);

  // Voice debrief using Web Speech API
  const handleSpeakBriefing = () => {
    if (!window.speechSynthesis) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const text = showIntervention
      ? `Resilience Optimization Report for ${scenario.name}. Proposed intervention: ${scenario.intervention.title}. Estimated capital expenditure: ${scenario.intervention.cost}. Cascade impact reduction is ${scenario.intervention.impactReduction}. Domino chain successfully intercepted at ${scenario.intervention.targetAsset}, preventing downstream collapse of critical healthcare and arterial corridors.`
      : `Critical Alert: ${scenario.trigger.name} has suffered ${scenario.trigger.event}. Result: ${scenario.summaryStatement}. One hundred and eighty-five thousand citizens are affected, with ambulance response times delayed by fifty minutes. Click Find Intervention to compute optimal mitigation.`;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="w-full rounded-3xl bg-black/60 border border-white/15 backdrop-blur-xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute -top-32 -right-32 w-80 h-80 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header & Scenario Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/15 border border-red-400/30 text-red-300 text-xs font-mono uppercase tracking-wider mb-2">
            <span className="h-2 w-2 rounded-full bg-red-400 animate-ping" />
            Interconnected Infrastructure Domino Engine
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-white">
            Single-Point Failure & Cascading Domino Simulator
          </h2>
          <p className="text-sm text-white/70 max-w-2xl mt-1">
            Infrastructure is monitored asset-by-asset, yet failures propagate across dependent lifelines.
            Click the disaster trigger box below to witness each failure pop one after another in sequential order.
          </p>
        </div>

        {/* Audio Debrief & Reset Buttons */}
        <div className="flex items-center gap-2">
          {visibleStepCount > 0 && (
            <button
              onClick={handleSpeakBriefing}
              className={`px-4 py-2 rounded-xl text-xs font-medium border transition-all flex items-center gap-2 cursor-pointer ${
                speaking
                  ? "bg-amber-400 text-black border-amber-300 shadow-lg shadow-amber-400/30"
                  : "bg-white/10 hover:bg-white/15 border-white/20 text-white"
              }`}
            >
              <i className={`fa-solid ${speaking ? "fa-volume-xmark" : "fa-volume-high"}`} />
              <span>{speaking ? "Stop Voice Brief" : "Audio Debrief"}</span>
            </button>
          )}

          {visibleStepCount > 0 && (
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded-xl text-xs font-medium bg-white/10 hover:bg-white/15 border border-white/20 text-white transition flex items-center gap-2 cursor-pointer"
            >
              <i className="fa-solid fa-rotate-left" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Scenario Tabs */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span className="text-xs text-white/50 font-mono uppercase tracking-wider mr-1">Select Disaster Scenario:</span>
        {DOMINO_SCENARIOS.map((sc) => {
          const isSelected = sc.id === selectedScenarioId;
          return (
            <button
              key={sc.id}
              onClick={() => handleSelectScenario(sc.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
                isSelected
                  ? "bg-white text-black font-semibold shadow-md shadow-white/20"
                  : "bg-white/5 hover:bg-white/10 text-white/70 border border-white/10"
              }`}
            >
              <i className={`fa-solid ${sc.icon}`} />
              <span>{sc.name}</span>
            </button>
          );
        })}
      </div>

      {/* 1. DISASTER TRIGGER BOX (Click pops next failure one after one) */}
      <div className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-mono text-white/50">
              Step 1: Disaster Trigger Box
            </span>
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
              Pops 1-by-1 on Click
            </span>
          </div>

          {/* Quick controls: Sound toggle, Auto-Cascade button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? "Mute audio cues" : "Enable audio cues"}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono border transition-all flex items-center gap-1.5 cursor-pointer ${
                soundEnabled
                  ? "bg-white/10 text-white border-white/20 hover:bg-white/15"
                  : "bg-white/5 text-white/40 border-white/10 hover:text-white/70"
              }`}
            >
              <i className={`fa-solid ${soundEnabled ? "fa-volume-high text-emerald-400" : "fa-volume-xmark"}`} />
              <span>{soundEnabled ? "SFX On" : "SFX Muted"}</span>
            </button>

            <button
              type="button"
              onClick={handleToggleAutoPlay}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-semibold border transition-all flex items-center gap-2 cursor-pointer ${
                isAutoPlaying
                  ? "bg-amber-500 text-black border-amber-400 shadow-lg shadow-amber-500/40 animate-pulse"
                  : "bg-white/10 hover:bg-white/15 text-white border-white/20 hover:border-white/30"
              }`}
            >
              <i className={`fa-solid ${isAutoPlaying ? "fa-pause" : "fa-play"}`} />
              <span>{isAutoPlaying ? "Pause Auto-Cascade" : "Auto-Cascade All (1-by-1)"}</span>
            </button>
          </div>
        </div>

        {/* The Clickable Trigger Box */}
        <button
          onClick={handleTriggerStep}
          className={`w-full text-left rounded-3xl p-5 sm:p-7 transition-all duration-300 relative overflow-hidden group cursor-pointer border-2 ${
            shaking ? "animate-earthquake ring-4 ring-red-500/50" : ""
          } ${
            visibleStepCount === 0
              ? "bg-gradient-to-r from-red-950/50 via-red-900/20 to-black border-red-500/50 hover:border-red-400 hover:shadow-2xl hover:shadow-red-500/20 hover:scale-[1.006]"
              : !isComplete
              ? "bg-gradient-to-r from-red-950/70 via-amber-950/40 to-black border-amber-500/70 shadow-2xl hover:border-amber-400 hover:scale-[1.006]"
              : "bg-red-950/70 border-red-500 shadow-2xl shadow-red-950/80 hover:scale-[1.004]"
          }`}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div
                className={`h-16 w-16 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 transition-transform group-hover:scale-105 border ${
                  visibleStepCount === 0
                    ? "bg-red-500/20 border-red-400/40 text-red-400"
                    : !isComplete
                    ? "bg-amber-500/20 border-amber-400/50 text-amber-300 animate-pulse"
                    : "bg-red-500/30 border-red-400 text-red-300"
                }`}
              >
                <i className={`fa-solid ${scenario.icon}`} />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono font-bold text-red-400 uppercase tracking-widest">
                    Disaster Trigger: {scenario.trigger.code}
                  </span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 font-mono">
                    {scenario.badge}
                  </span>
                  {visibleStepCount > 0 && !isComplete && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 animate-pulse">
                      ● Cascade Active: Step {visibleStepCount} of {totalSteps}
                    </span>
                  )}
                  {isComplete && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/30 text-red-200 border border-red-400 font-bold">
                      ✓ Complete Chain Toppled (5/5)
                    </span>
                  )}
                </div>

                <h3 className="text-xl sm:text-2xl font-display font-bold text-white mt-1.5 group-hover:text-red-200 transition-colors">
                  {scenario.trigger.name} — {scenario.trigger.event}
                </h3>
                <p className="text-sm text-white/70 mt-1 max-w-2xl leading-relaxed">
                  {scenario.trigger.detail}
                </p>

                {/* Micro Step Pipeline Badges */}
                <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2 border-t border-white/10">
                  <span className="text-[11px] font-mono text-white/40 uppercase mr-1">Lifeline Chain:</span>
                  {scenario.afterSteps.map((s, idx) => {
                    const isToppled = idx < visibleStepCount;
                    const isNext = idx === visibleStepCount;
                    return (
                      <span
                        key={s.id}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border flex items-center gap-1 transition-all ${
                          isToppled
                            ? "bg-red-500/20 text-red-300 border-red-500/40 line-through opacity-75"
                            : isNext
                            ? "bg-amber-400/20 text-amber-200 border-amber-400 font-bold animate-pulse shadow-sm shadow-amber-400/30 scale-105"
                            : "bg-white/5 text-white/40 border-white/10"
                        }`}
                      >
                        <span>{s.indicator}</span>
                        <span>{s.code || s.name.split(" ")[0]}</span>
                        {idx < scenario.afterSteps.length - 1 && <span className="text-white/20 ml-0.5">→</span>}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Action Button & Step Progress */}
            <div className="flex flex-col lg:items-end justify-center min-w-[280px]">
              {/* Progress bar */}
              <div className="w-full mb-2.5">
                <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                  <span className="text-white/60">Domino Wavefront</span>
                  <span className={`font-bold ${isComplete ? "text-red-400" : "text-amber-300"}`}>
                    {visibleStepCount} / {totalSteps} Failures Popped
                  </span>
                </div>
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-red-500 via-amber-400 to-red-600 transition-all duration-300"
                    style={{ width: `${(visibleStepCount / totalSteps) * 100}%` }}
                  />
                </div>
              </div>

              {/* Dynamic Action Pill */}
              <div
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl font-bold text-sm sm:text-base transition-all shadow-xl ${
                  visibleStepCount === 0
                    ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white shadow-red-500/50 group-hover:scale-105"
                    : !isComplete
                    ? "bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:brightness-110 text-black shadow-amber-400/40 group-hover:scale-105"
                    : "bg-white/15 hover:bg-white/20 text-white border border-white/25 hover:scale-105"
                }`}
              >
                <i
                  className={`fa-solid ${
                    visibleStepCount === 0
                      ? "fa-bolt-lightning text-yellow-300 animate-bounce"
                      : isAutoPlaying
                      ? "fa-spinner fa-spin text-black"
                      : !isComplete
                      ? "fa-arrow-down text-black animate-bounce"
                      : "fa-rotate-left text-white"
                  }`}
                />
                <span>
                  {visibleStepCount === 0
                    ? `Click to Collapse ${scenario.trigger.code} (1/${totalSteps})`
                    : !isComplete
                    ? `Click for Next Failure: ${nextStep?.name} (${visibleStepCount + 1}/${totalSteps}) ➔`
                    : "Cascade Complete — Click to Restart Chain ↺"}
                </span>
              </div>

              <span className="text-[11px] text-white/50 mt-1.5 font-mono text-center lg:text-right">
                {visibleStepCount === 0
                  ? "Click to collapse bridge & pop failures one by one"
                  : !isComplete
                  ? `Next click pops: ${nextStep?.role} (${nextStep?.time})`
                  : "All 5 failures triggered. Click box to replay."}
              </span>
            </div>
          </div>
        </button>
      </div>

      {/* 2. BEFORE vs AFTER STATE */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* BEFORE BOX: All Nominal */}
        <div className="lg:col-span-4 rounded-2xl bg-white/[0.03] border border-white/10 p-5">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
            <div>
              <span className="text-xs uppercase font-mono tracking-wider text-emerald-400 font-bold">
                Baseline State
              </span>
              <h4 className="text-base font-display font-semibold text-white">Before Disaster Shock</h4>
            </div>
            <div className="text-xl tracking-tight" title="All 5 systems nominal">
              🟢🟢🟢🟢🟢
            </div>
          </div>

          <div className="space-y-3">
            {scenario.beforeSteps.map((step) => (
              <div
                key={step.id}
                className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-sm"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">🟢</span>
                  <div>
                    <span className="font-semibold text-white text-xs sm:text-sm">{step.name}</span>
                    <span className="text-[11px] text-white/50 block">{step.role}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    NOMINAL
                  </span>
                  <span className="text-[10px] text-white/50 block font-mono mt-0.5">{step.metric}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 text-xs text-white/60 flex items-center justify-between">
            <span>System Resilience Score:</span>
            <span className="font-mono text-emerald-400 font-bold text-sm">100% Nominal</span>
          </div>
        </div>

        {/* AFTER BOX: THE DOMINO EFFECT CHAIN */}
        <div className="lg:col-span-8 rounded-2xl bg-white/[0.03] border border-white/10 p-5 sm:p-6 relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-6 border-b border-white/10 gap-2">
            <div>
              <span className="text-xs uppercase font-mono tracking-wider text-red-400 font-bold">
                Cascading Propagation
              </span>
              <h4 className="text-base font-display font-semibold text-white">
                After: Downstream Domino Chain Reaction
              </h4>
            </div>

            <div className="flex items-center gap-2">
              {visibleStepCount > 0 && !isComplete && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono animate-pulse">
                  <i className="fa-solid fa-fire text-amber-400" />
                  <span>Popping Step {visibleStepCount} of {totalSteps}</span>
                </div>
              )}
              {isComplete && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-mono">
                  <i className="fa-solid fa-triangle-exclamation text-red-400" />
                  <span>All 5 Failures Active</span>
                </div>
              )}
            </div>
          </div>

          {visibleStepCount === 0 ? (
            <div className="py-14 text-center">
              <div className="h-16 w-16 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30 text-2xl mb-4">
                <i className="fa-solid fa-arrow-down-wide-short" />
              </div>
              <h5 className="font-medium text-white text-base">Domino Chain Awaiting Trigger</h5>
              <p className="text-sm text-white/50 max-w-md mx-auto mt-1 leading-relaxed">
                Click the red disaster box above to witness how a single failure in <code className="text-red-300">{scenario.trigger.name}</code>{" "}
                topples 4 dependent lifelines one after another.
              </p>
              <button
                onClick={handleTriggerStep}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold text-xs shadow-lg shadow-red-500/30 transition-all cursor-pointer hover:scale-105"
              >
                <i className="fa-solid fa-bolt-lightning text-yellow-300" />
                <span>Start Domino Chain: Collapse {scenario.trigger.code}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Domino Steps Unfolding */}
              {scenario.afterSteps.slice(0, visibleStepCount).map((step, idx) => {
                const isCritical = step.severity === "critical"; // 🔴
                const isLatest = idx === visibleStepCount - 1;

                return (
                  <div key={step.id} className={`animate-domino-pop ${isLatest && shaking ? "animate-earthquake" : ""}`}>
                    {/* The Domino Card */}
                    <div
                      className={`p-4 rounded-2xl border transition-all ${
                        isLatest
                          ? isCritical
                            ? "bg-red-950/70 border-red-400 shadow-2xl shadow-red-500/40 ring-2 ring-red-500/60"
                            : "bg-amber-950/70 border-amber-400 shadow-2xl shadow-amber-500/40 ring-2 ring-amber-500/60"
                          : isCritical
                          ? "bg-red-950/30 border-red-500/40 shadow-md"
                          : "bg-amber-950/30 border-amber-500/40 shadow-md"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl leading-none mt-0.5">{step.indicator}</span>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-base sm:text-lg font-display font-bold text-white">
                                {step.name}
                              </span>
                              <span
                                className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border font-bold ${
                                  isCritical
                                    ? "bg-red-500/20 text-red-300 border-red-500/40"
                                    : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                }`}
                              >
                                {step.role}
                              </span>
                              {isLatest && (
                                <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-red-500/30 text-red-200 border border-red-400 animate-pulse font-bold flex items-center gap-1">
                                  <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-ping" />
                                  Latest Shockwave
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-white/80 font-medium mt-1">
                              <span className="text-white/50 font-mono">Cause: </span>
                              {step.cause}
                            </div>
                            <p className="text-xs text-white/70 mt-1 leading-relaxed">{step.impact}</p>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <span className="text-xs font-mono text-white/60 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 block">
                            {step.time}
                          </span>
                          <span className="text-[10px] font-mono text-white/40 block mt-1">
                            Step {idx + 1} of {totalSteps}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Downward Domino Arrow (↓) */}
                    {idx < visibleStepCount - 1 && (
                      <div className="flex items-center justify-center my-1.5 text-white/40">
                        <div className="flex flex-col items-center">
                          <div className="w-0.5 h-3 bg-gradient-to-b from-red-500/80 to-amber-500/80" />
                          <span className="text-xl font-bold text-amber-400 leading-none">↓</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Up Next Card Preview (when cascade is in progress) */}
              {!isComplete && nextStep && (
                <div className="pt-2">
                  <div className="flex items-center justify-center mb-2">
                    <span className="text-amber-400/70 text-lg animate-bounce">↓</span>
                  </div>
                  <div className="p-4 rounded-2xl border-2 border-dashed border-amber-500/40 bg-amber-500/5 backdrop-blur flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300 flex-shrink-0 text-base font-mono">
                        {visibleStepCount + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono uppercase text-amber-400 tracking-wider font-bold">
                            Next Shock in Line
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-white/50 border border-white/10">
                            {nextStep.time}
                          </span>
                        </div>
                        <div className="text-sm sm:text-base font-bold text-white mt-0.5">
                          {nextStep.indicator} {nextStep.name} ({nextStep.role})
                        </div>
                        <div className="text-xs text-white/60 mt-0.5">
                          Poised to fail due to: {nextStep.cause}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleTriggerStep}
                      className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs shadow-lg shadow-amber-400/30 hover:scale-105 transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                    >
                      <span>Pop Next Failure</span>
                      <i className="fa-solid fa-arrow-down" />
                    </button>
                  </div>
                </div>
              )}

              {/* 3. SUMMARY STATEMENT (User requested: "Then your system says: 1 bridge failure → 4 downstream disruptions") */}
              {isComplete && (
                <div className="mt-6 pt-5 border-t border-white/10 animate-domino-pop">
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-red-500/15 via-purple-500/10 to-black border border-red-400/40">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-mono text-red-400 uppercase tracking-widest font-bold">
                          Cascade Consequence Analysis
                        </div>
                        <div className="text-xl sm:text-2xl font-display font-bold text-white mt-0.5">
                          {scenario.summaryStatement}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-white/70">
                          <span className="inline-flex items-center gap-1.5">
                            <i className="fa-solid fa-users text-red-400" />
                            {scenario.summaryStats.populationAffected}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <i className="fa-solid fa-truck-medical text-amber-400" />
                            {scenario.summaryStats.transitDelay}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <i className="fa-solid fa-hospital text-red-400" />
                            {scenario.summaryStats.healthcareLoss}
                          </span>
                          <span className="inline-flex items-center gap-1.5 font-mono text-red-300 font-bold">
                            Resilience: {scenario.summaryStats.resilienceDrop}
                          </span>
                        </div>
                      </div>

                      {/* 4. "FIND INTERVENTION" BUTTON */}
                      <button
                        onClick={() => setShowIntervention(!showIntervention)}
                        className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-bold text-sm shadow-lg shadow-cyan-400/30 hover:shadow-cyan-400/50 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                      >
                        <i className="fa-solid fa-wand-magic-sparkles text-black" />
                        <span>{showIntervention ? "Hide Intervention" : "Find Intervention"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 5. SYSTEM INTERVENTION SOLUTION */}
      {showIntervention && (
        <div className="mt-8 rounded-3xl bg-gradient-to-b from-cyan-950/40 to-black border-2 border-cyan-400/40 p-6 sm:p-8 animate-domino-pop shadow-2xl shadow-cyan-500/10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-cyan-400/20">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-400/20 border border-cyan-400/40 text-cyan-200 text-xs font-mono uppercase tracking-wider mb-2">
                <i className="fa-solid fa-shield-check text-cyan-300" />
                Targeted Capital Resilience Optimization
              </div>
              <h3 className="text-2xl sm:text-3xl font-display font-bold text-white">
                Recommended Intervention: {scenario.intervention.targetAsset}
              </h3>
              <p className="text-sm text-cyan-100/70 max-w-2xl mt-1">
                {scenario.intervention.title}
              </p>
            </div>

            {/* Key KPI Badges: Cost & Cascade Impact Reduction */}
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-cyan-500/10 border border-cyan-400/30 p-4 text-center min-w-[130px]">
                <div className="text-[11px] uppercase tracking-wider text-cyan-300/80 font-mono">
                  Investment Cost
                </div>
                <div className="text-2xl sm:text-3xl font-display font-bold text-white mt-0.5">
                  {scenario.intervention.cost}
                </div>
                <div className="text-[10px] text-cyan-300/60 font-mono">({scenario.intervention.costUSD})</div>
              </div>

              <div className="rounded-2xl bg-emerald-500/15 border border-emerald-400/40 p-4 text-center min-w-[150px]">
                <div className="text-[11px] uppercase tracking-wider text-emerald-300/80 font-mono">
                  Cascade Reduction
                </div>
                <div className="text-3xl sm:text-4xl font-display font-bold text-emerald-300 mt-0.5">
                  {scenario.intervention.impactReduction}
                </div>
                <div className="text-[10px] text-emerald-400 font-mono font-bold">Domino Intercepted!</div>
              </div>
            </div>
          </div>

          {/* Detailed Engineering Mechanism & ROI */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                <div className="text-xs uppercase font-mono text-cyan-300 font-bold mb-1">
                  Engineering Mechanism
                </div>
                <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
                  {scenario.intervention.mechanism}
                </p>
              </div>

              <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                <div className="text-xs uppercase font-mono text-emerald-300 font-bold mb-1">
                  Economic & Social ROI
                </div>
                <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
                  {scenario.intervention.roi}
                </p>
                <div className="mt-2 text-[11px] text-white/50 font-mono">
                  Deployment Lead Time: {scenario.intervention.leadTime}
                </div>
              </div>
            </div>

            {/* Visual Intercepted Domino Chain */}
            <div className="lg:col-span-7 rounded-2xl bg-black/40 border border-cyan-400/30 p-5">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
                <span className="text-xs uppercase font-mono text-cyan-300 font-bold">
                  Intercepted Domino Chain With Intervention Active
                </span>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Protected System
                </span>
              </div>

              <div className="space-y-2.5">
                {scenario.intervention.afterInterventionSteps.map((s, idx) => {
                  const isFailed = s.status === "failed";
                  const isProtected = s.status === "protected";

                  return (
                    <div key={s.id}>
                      <div
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs sm:text-sm ${
                          isFailed
                            ? "bg-red-500/10 border-red-500/30 text-red-200"
                            : isProtected
                            ? "bg-cyan-500/20 border-cyan-400/60 text-cyan-100 font-semibold shadow-md shadow-cyan-500/20"
                            : "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">{s.indicator}</span>
                          <div>
                            <span className="font-bold text-white">{s.name}</span>
                            <span className="text-[11px] text-white/60 block">{s.note}</span>
                          </div>
                        </div>

                        <div>
                          {isFailed ? (
                            <span className="text-[10px] font-mono text-red-400 bg-red-500/20 px-2 py-0.5 rounded border border-red-500/30">
                              SHOCK HIT
                            </span>
                          ) : isProtected ? (
                            <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/30 px-2 py-0.5 rounded border border-cyan-400 font-bold">
                              CASCADE BLOCKED
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                              PROTECTED
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Domino Block Callout at Step 2 */}
                      {idx === 1 && (
                        <div className="my-2 py-1.5 px-3 rounded-lg bg-cyan-400/20 border border-cyan-400/40 text-cyan-200 text-center text-xs font-mono font-bold flex items-center justify-center gap-2">
                          <i className="fa-solid fa-hand text-cyan-300" />
                          <span>STOPPED HERE: R12 Absorbs Shock → Downstream Lifelines Remain 100% Online</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
