import { useState, useMemo, useEffect } from "react";
import PageShell from "../components/PageShell";
import PageHeader from "../components/PageHeader";
import {
  DEPARTMENTS,
  SUBSECTORS,
} from "../lib/cascadingDepartmentsData.js";
import {
  PRESET_SCENARIOS,
  simulateCascadingFailure,
  SUBSECTOR_MAP,
  DEPARTMENT_MAP,
} from "../lib/cascadingSimulationEngine.js";

const CATEGORIES = [
  "All",
  "Critical Lifeline",
  "Lifeline & Logistics",
  "Ecological & Agri",
  "Economy & Supplies",
  "Urban & Municipal",
  "Governance & Security",
  "Industry & Safety",
];

export default function CascadingFailureEngine() {
  const [selectedTriggerId, setSelectedTriggerId] = useState("power_substations");
  const [simulationActive, setSimulationActive] = useState(false);
  const [visibleWaveCount, setVisibleWaveCount] = useState(1);
  const [activeAnalysisTab, setActiveAnalysisTab] = useState("citizens"); // "citizens" | "authorities"
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [speaking, setSpeaking] = useState(false);

  // Run the mathematical simulation for the current trigger node
  const simulation = useMemo(() => {
    return simulateCascadingFailure(selectedTriggerId);
  }, [selectedTriggerId]);

  // Handle Preset Selection
  const handleSelectPreset = (scenario) => {
    setSelectedTriggerId(scenario.triggerNodeId);
    setSimulationActive(false);
    setVisibleWaveCount(1);
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  // Trigger Domino Cascade
  const handleTriggerCascade = () => {
    if (!simulation) return;
    setSimulationActive(true);
    setVisibleWaveCount(1);

    const totalWaves = simulation.waves.length;
    for (let i = 2; i <= totalWaves; i++) {
      setTimeout(() => {
        setVisibleWaveCount(i);
      }, (i - 1) * 750);
    }
  };

  const handleReset = () => {
    setSimulationActive(false);
    setVisibleWaveCount(1);
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  // Audio Voice Debrief using Web Speech API
  const handleAudioDebrief = () => {
    if (!window.speechSynthesis || !simulation) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const trigger = simulation.triggerNode;
    const topImminent = simulation.nextFailurePredictions[0];
    const debriefText = `Cascading Failure Debrief. Ground zero trigger point: ${trigger.name} in ${trigger.dept?.name}. Resulting chain reaction has breached ${simulation.totalFailedSubsectors} sub-sectors across ${simulation.totalAffectedDepartments} Indian ministries. Top imminent risk: ${topImminent ? topImminent.name : "None"}, with ${topImminent ? topImminent.waitingPeriodFormatted : "stable state"}. Primary authority recommendation: ${simulation.situationalAnalysis.highLeverageIntervention?.action || "Maintain critical alert readiness."}`;

    const utterance = new SpeechSynthesisUtterance(debriefText);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    return () => {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  // Filtered Departments for Explorer
  const filteredDepartments = useMemo(() => {
    return DEPARTMENTS.filter((dept) => {
      const matchesCategory =
        selectedCategory === "All" || dept.category === selectedCategory;
      const matchesSearch =
        searchQuery.trim() === "" ||
        dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dept.ministry.toLowerCase().includes(searchQuery.toLowerCase()) ||
        SUBSECTORS.some(
          (s) =>
            s.deptId === dept.id &&
            s.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  if (!simulation) return null;

  return (
    <PageShell>
      <PageHeader
        eyebrow="Pan-India Multi-Department Resilience"
        title="Inter-Departmental Cascading Failure & Domino Prediction Engine"
        subhead="A single localized disruption in power, transport, or agriculture cascades across 30+ Indian Ministries. Simulate shocks, forecast the Next Likely Failure with exact waiting countdowns, and formulate high-leverage mitigation interventions."
      />

      {/* Preset Real-World National Crisis Scenarios */}
      <div className="mb-8 p-6 rounded-3xl bg-black/60 border border-white/15 backdrop-blur-xl relative overflow-hidden shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-3 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-400 animate-ping" />
              <span className="text-xs font-mono uppercase tracking-widest text-red-300 font-semibold">
                Multi-Hazard Preset Scenarios
              </span>
            </div>
            <h3 className="text-lg font-display text-white mt-1">
              Select a National Crisis Scenario or Pick Any Ministry Sub-sector Below
            </h3>
          </div>

          {/* Quick Actions: Audio Debrief & Reset */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleAudioDebrief}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-2 ${
                speaking
                  ? "bg-red-500 border-red-400 text-white animate-pulse"
                  : "bg-white/10 border-white/20 text-white hover:bg-white/15"
              }`}
            >
              <i className={`fa-solid ${speaking ? "fa-volume-xmark" : "fa-volume-high"}`} />
              <span>{speaking ? "Stop Audio" : "Voice Debrief"}</span>
            </button>

            <button
              onClick={handleReset}
              className="px-4 py-2 rounded-xl text-xs font-medium bg-white/10 border border-white/20 text-white hover:bg-white/15 transition flex items-center gap-2"
            >
              <i className="fa-solid fa-rotate-left" />
              <span>Reset Engine</span>
            </button>
          </div>
        </div>

        {/* Preset Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {PRESET_SCENARIOS.map((scenario) => {
            const isSelected = selectedTriggerId === scenario.triggerNodeId;
            return (
              <button
                key={scenario.id}
                onClick={() => handleSelectPreset(scenario)}
                className={`text-left p-3.5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                  isSelected
                    ? "bg-red-500/20 border-red-400/80 shadow-lg shadow-red-500/20 ring-1 ring-red-400"
                    : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white/80"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                      {scenario.badge}
                    </span>
                    <i className={`fa-solid ${scenario.icon} ${isSelected ? "text-red-300" : "text-white/40"}`} />
                  </div>
                  <div className="font-display font-semibold text-xs sm:text-sm text-white line-clamp-2">
                    {scenario.name}
                  </div>
                </div>
                <div className="mt-3 text-[11px] text-white/50 line-clamp-2">
                  {scenario.triggerEvent}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary Trigger Ground Zero & Action Banner */}
      <div className="mb-8 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-red-950/40 via-black/80 to-purple-950/40 border border-red-500/30 backdrop-blur-xl relative overflow-hidden shadow-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-400/30 text-red-300 text-xs font-mono uppercase tracking-wider mb-3">
              <i className="fa-solid fa-crosshairs text-xs" />
              <span>Ground Zero Primary Disruption Node</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-display font-bold text-white flex items-center gap-3">
              <span>{simulation.triggerNode.name}</span>
              <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-white/10 border border-white/15 text-white/60">
                {simulation.triggerNode.code}
              </span>
            </h2>

            <p className="text-xs sm:text-sm text-white/70 mt-2 max-w-3xl leading-relaxed">
              <strong className="text-white">Ministry:</strong> {simulation.triggerNode.dept?.ministry} &bull;{" "}
              <strong className="text-white">Baseline Buffer:</strong> {simulation.triggerNode.reserveHours} hours reserve &bull;{" "}
              <strong className="text-white">Criticality Index:</strong> {Math.round(simulation.triggerNode.criticality * 100)}%
            </p>

            <div className="mt-3 text-xs text-red-200/90 p-3 rounded-xl bg-red-500/10 border border-red-400/20">
              <i className="fa-solid fa-triangle-exclamation mr-2 text-red-400" />
              {simulation.triggerNode.description}
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col items-center justify-center p-4 rounded-2xl bg-black/40 border border-white/10 text-center">
            <div className="text-xs font-mono uppercase text-white/50 mb-2">Simulate Domino Cascade</div>
            {!simulationActive ? (
              <button
                onClick={handleTriggerCascade}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold font-display text-sm tracking-wide shadow-xl shadow-red-600/30 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-burst text-base animate-pulse" />
                <span>Trigger Cascading Failure</span>
              </button>
            ) : (
              <div className="w-full space-y-2">
                <div className="flex items-center justify-center gap-2 text-emerald-400 font-mono text-xs font-semibold py-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>Cascade Active (Wave {visibleWaveCount} of {simulation.waves.length})</span>
                </div>
                <button
                  onClick={handleReset}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-medium transition"
                >
                  Reset / Re-simulate
                </button>
              </div>
            )}
            <div className="mt-2 text-[11px] text-white/40">
              Propagates multi-order dependencies across 30 Ministries
            </div>
          </div>
        </div>
      </div>

      {/* Impact Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
          <div className="text-[11px] uppercase tracking-wider text-white/50 font-mono mb-1">Domino Waves</div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-white">
            {simulationActive ? visibleWaveCount : 1} <span className="text-xs font-normal text-white/40">/ {simulation.waves.length}</span>
          </div>
          <div className="text-[11px] text-red-300/80 mt-1">Chronological propagation</div>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
          <div className="text-[11px] uppercase tracking-wider text-white/50 font-mono mb-1">Sub-Sectors Collapsed</div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-red-400">
            {simulationActive
              ? simulation.waves.slice(0, visibleWaveCount).reduce((acc, w) => acc + w.nodes.length, 0)
              : 1}
          </div>
          <div className="text-[11px] text-white/40 mt-1">Lifeline nodes breached</div>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
          <div className="text-[11px] uppercase tracking-wider text-white/50 font-mono mb-1">Ministries Impacted</div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-amber-400">
            {simulationActive ? simulation.totalAffectedDepartments : 1} <span className="text-xs font-normal text-white/40">/ 30</span>
          </div>
          <div className="text-[11px] text-white/40 mt-1">Cross-sector infection</div>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
          <div className="text-[11px] uppercase tracking-wider text-white/50 font-mono mb-1">Systemic Resilience</div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-rose-400">
            {simulationActive ? Math.max(14, 100 - simulation.totalFailedSubsectors * 3) : 92}%
          </div>
          <div className="text-[11px] text-rose-300/80 mt-1">Severe functional degradation</div>
        </div>
      </div>

      {/* Main Grid: Domino Waves on Left + Next Likely Failure Radar on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10">
        
        {/* Left 7 Columns: Domino Cascade Step-by-Step Propagation */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-arrow-down-wide-short text-red-400" />
              <h3 className="font-display text-lg text-white font-semibold">
                Domino Wave Propagation Timeline
              </h3>
            </div>
            <span className="text-xs font-mono text-white/50">
              {simulation.waves.length} Discrete Impact Waves
            </span>
          </div>

          <div className="space-y-6">
            {simulation.waves.map((wave, idx) => {
              const isWaveVisible = !simulationActive || idx < visibleWaveCount;
              if (!isWaveVisible) return null;

              return (
                <div
                  key={wave.waveIndex}
                  className="rounded-2xl bg-black/40 border border-white/10 p-5 relative overflow-hidden transition-all duration-300 animate-reveal"
                >
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
                    <div className="flex items-center gap-2.5">
                      <span className="h-6 px-2.5 rounded-full bg-red-500/20 border border-red-400/30 text-red-300 text-xs font-mono font-bold flex items-center">
                        Wave {wave.waveIndex}
                      </span>
                      <span className="text-xs font-mono text-white/60">
                        {wave.elapsedLabel}
                      </span>
                    </div>
                    <span className="text-[11px] text-white/40">
                      {wave.nodes.length} {wave.nodes.length === 1 ? "Sector" : "Sectors"} Collapsed
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {wave.nodes.map((node) => (
                      <div
                        key={node.id}
                        className="p-3.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white/10 text-white/70 truncate max-w-[180px]">
                              {node.dept?.name}
                            </span>
                            <span className="text-xs">
                              {node.status === "critical" ? "🔴" : "🟠"}
                            </span>
                          </div>

                          <div className="font-display font-semibold text-sm text-white">
                            {node.name}
                          </div>

                          <div className="text-[11px] text-white/60 mt-1 leading-snug">
                            {node.failureCause}
                          </div>
                        </div>

                        <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-white/40">
                          <span>Code: {node.code}</span>
                          <span>Buffer: {node.reserveHours}h</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 5 Columns: NEXT LIKELY FAILURE PREDICTOR & RADAR (USER'S CRUCIAL FEATURE) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-3xl bg-black/60 border border-amber-500/30 backdrop-blur-xl relative overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-ping" />
                <h3 className="font-display text-lg text-amber-300 font-bold">
                  Next Likely Failure Radar
                </h3>
              </div>
              <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Predictive AI
              </span>
            </div>

            <p className="text-xs text-white/70 mb-4 leading-relaxed">
              Real-time graph vulnerability analysis forecasting which Indian sectors will collapse next, their failure probability, and remaining <strong>Probable Waiting Period</strong> before total systemic failure.
            </p>

            {simulation.nextFailurePredictions.length === 0 ? (
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center text-xs text-white/50">
                No immediate secondary failures detected; system stabilized.
              </div>
            ) : (
              <div className="space-y-3.5">
                {simulation.nextFailurePredictions.map((pred, i) => (
                  <div
                    key={pred.id}
                    className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-400/40 transition-all duration-200 relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="h-5 w-5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-xs font-bold flex items-center justify-center">
                          #{i + 1}
                        </span>
                        <span className="text-xs font-display font-bold text-white">
                          {pred.name}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-full ${
                          pred.riskLevel === "Critical"
                            ? "bg-red-500/20 text-red-300 border border-red-500/30"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        }`}
                      >
                        {pred.riskLevel} ({pred.failureProbability}%)
                      </span>
                    </div>

                    <div className="text-[11px] text-white/60 mb-2.5">
                      <strong className="text-white/80">Ministry:</strong> {pred.dept?.name}
                    </div>

                    {/* Waiting Period Meter (User's Exact Requirement) */}
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-xs text-white/70">
                        <i className="fa-regular fa-clock text-amber-400 animate-spin text-xs" />
                        <span className="text-[11px]">Probable Waiting Period:</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-amber-300">
                        {pred.waitingPeriodFormatted}
                      </span>
                    </div>

                    {/* Threat Source */}
                    {pred.threatSource && (
                      <div className="text-[11px] text-white/50 flex items-center gap-1.5">
                        <i className="fa-solid fa-arrow-turn-down text-red-400 text-xs" />
                        <span>Threat Origin: <strong className="text-white/70">{pred.threatSource.name}</strong></span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* High-Leverage Strategic Intervention Box */}
          {simulation.situationalAnalysis.highLeverageIntervention && (
            <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-400/30 backdrop-blur-md">
              <div className="flex items-center gap-2 mb-2 text-emerald-400 font-display font-semibold text-sm">
                <i className="fa-solid fa-hand-holding-medical text-base" />
                <span>Highest-Leverage Preemptive Action</span>
              </div>
              <h4 className="font-display font-bold text-white text-base mb-1">
                {simulation.situationalAnalysis.highLeverageIntervention.title}
              </h4>
              <p className="text-xs text-emerald-200/90 leading-relaxed mb-3">
                {simulation.situationalAnalysis.highLeverageIntervention.impactPrevention}
              </p>
              <div className="p-3 rounded-xl bg-black/30 border border-emerald-400/20 text-xs text-white/80 font-mono">
                <strong>Directive:</strong> {simulation.situationalAnalysis.highLeverageIntervention.action}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Situational Analysis for People & Responders (USER'S CRUCIAL FEATURE) */}
      <div className="mb-12 p-6 sm:p-8 rounded-3xl bg-black/60 border border-white/15 backdrop-blur-xl shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 text-xs font-mono uppercase tracking-wider mb-1">
              <i className="fa-solid fa-bullhorn text-xs" />
              <span>Real-Time Situational Analysis</span>
            </div>
            <h3 className="text-xl font-display font-bold text-white">
              Actionable Guidance & Multi-Agency Directives
            </h3>
          </div>

          {/* Tab Switcher: Citizens vs Authorities */}
          <div className="flex items-center p-1 rounded-xl bg-white/10 border border-white/10">
            <button
              onClick={() => setActiveAnalysisTab("citizens")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                activeAnalysisTab === "citizens"
                  ? "bg-white text-black shadow"
                  : "text-white/70 hover:text-white"
              }`}
            >
              <i className="fa-solid fa-users" />
              <span>For Citizens / Public</span>
            </button>
            <button
              onClick={() => setActiveAnalysisTab("authorities")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                activeAnalysisTab === "authorities"
                  ? "bg-white text-black shadow"
                  : "text-white/70 hover:text-white"
              }`}
            >
              <i className="fa-solid fa-shield-halved" />
              <span>For District Magistrates & NDRF</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Citizens / Public Advisory */}
        {activeAnalysisTab === "citizens" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-reveal">
            {simulation.situationalAnalysis.citizenAdvisories.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white/10 text-white/70">
                      {item.deptName}
                    </span>
                    <i className={`fa-solid ${item.icon} text-amber-400 text-xs`} />
                  </div>
                  <h4 className="font-display font-semibold text-white text-sm mb-1.5">
                    {item.sector}
                  </h4>
                  <p className="text-xs text-white/80 leading-relaxed">
                    {item.advisory}
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-white/5 text-[10px] font-mono text-cyan-300/70 flex items-center gap-1.5">
                  <i className="fa-solid fa-circle-check text-cyan-400" />
                  <span>Public Safety Protocol Active</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Authorities / NDRF Directives */}
        {activeAnalysisTab === "authorities" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-reveal">
            {simulation.situationalAnalysis.authorityInterventions.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white/10 text-white/70">
                      {item.deptName}
                    </span>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-bold">
                      {item.priority}
                    </span>
                  </div>
                  <h4 className="font-display font-semibold text-white text-sm mb-1.5">
                    {item.sector}
                  </h4>
                  <p className="text-xs text-white/80 leading-relaxed font-mono">
                    {item.action}
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-white/5 text-[10px] font-mono text-emerald-300/70 flex items-center gap-1.5">
                  <i className="fa-solid fa-truck-fast text-emerald-400" />
                  <span>Dispatch Authorization Ready</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 30-Department Interactive Explorer: Click ANY sub-sector to trigger */}
      <div className="p-6 sm:p-8 rounded-3xl bg-black/60 border border-white/15 backdrop-blur-xl shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-semibold">
                National Ecosystem Directory
              </span>
            </div>
            <h3 className="text-xl font-display font-bold text-white mt-1">
              Explore All 30 Indian Ministries & Trigger Custom Disruption
            </h3>
            <p className="text-xs text-white/60 mt-1">
              Click &quot;Trigger Failure&quot; on any sub-sector below to model a localized shock from that specific asset.
            </p>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 text-xs" />
            <input
              type="text"
              placeholder="Search ministry or sector..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/40 text-xs focus:outline-none focus:border-white/30"
            />
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                  active
                    ? "bg-white text-black font-semibold shadow"
                    : "bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Department Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDepartments.map((dept) => {
            const deptSubsectors = SUBSECTORS.filter((s) => s.deptId === dept.id);
            return (
              <div
                key={dept.id}
                className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-9 w-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-white/80 shrink-0">
                      <i className={`fa-solid ${dept.icon}`} />
                    </div>
                    <div>
                      <h4 className="font-display font-semibold text-white text-sm">
                        {dept.name}
                      </h4>
                      <p className="text-[10px] text-white/50 truncate max-w-[220px]">
                        {dept.ministry}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-white/65 leading-relaxed mb-4">
                    {dept.description}
                  </p>

                  {/* Subsector Chips with Failure Trigger */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-mono uppercase text-white/40 tracking-wider">
                      Sub-sectors ({deptSubsectors.length})
                    </div>
                    {deptSubsectors.map((sub) => {
                      const isTrigger = selectedTriggerId === sub.id;
                      return (
                        <div
                          key={sub.id}
                          className={`p-2 rounded-xl border transition flex items-center justify-between gap-2 ${
                            isTrigger
                              ? "bg-red-500/20 border-red-400 text-white"
                              : "bg-black/30 border-white/10 text-white/80 hover:border-white/20"
                          }`}
                        >
                          <div className="truncate">
                            <div className="text-xs font-medium truncate">
                              {sub.name}
                            </div>
                            <div className="text-[10px] text-white/40">
                              Buffer: {sub.reserveHours}h &bull; Criticality: {Math.round(sub.criticality * 100)}%
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              setSelectedTriggerId(sub.id);
                              setSimulationActive(false);
                              setVisibleWaveCount(1);
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 transition ${
                              isTrigger
                                ? "bg-red-500 text-white"
                                : "bg-white/10 hover:bg-white/20 text-white/80"
                            }`}
                          >
                            {isTrigger ? "Active Trigger" : "Trigger Failure"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PageShell>
  );
}
