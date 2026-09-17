import { useState } from "react";
import PageShell from "../components/PageShell";
import PageHeader from "../components/PageHeader";
import DominoCascadeSimulator from "../components/DominoCascadeSimulator";
import { NETWORK_NODES, NETWORK_EDGES, BOTTLENECK_RANKINGS } from "../lib/infrastructureData";
import { MAP_TILES } from "../siteConfig";
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const RESILIENCE_TABS = [
  { id: "domino", label: "Domino Cascade Engine", icon: "fa-arrow-down-wide-short" },
  { id: "topology", label: "Network Topology & Dependencies", icon: "fa-diagram-project" },
  { id: "bottlenecks", label: "Disproportionate Bottlenecks", icon: "fa-bullseye" },
  { id: "scenarios", label: "Scenario Comparison Sandbox", icon: "fa-scale-balanced" },
  { id: "interventions", label: "Planner Capital Allocator", icon: "fa-coins" },
];

export default function InfrastructureResilience() {
  const [activeTab, setActiveTab] = useState("domino");
  const [mapMode, setMapMode] = useState("graph"); // "graph" | "map"
  const [selectedNodeId, setSelectedNodeId] = useState("B7");
  const [activeScenario, setActiveScenario] = useState("unmitigated"); // "baseline" | "unmitigated" | "hardened"

  // Active node for inspector
  const selectedNode = NETWORK_NODES.find((n) => n.id === selectedNodeId) || NETWORK_NODES[0];
  const upstreamDependencies = NETWORK_EDGES.filter((e) => e.to === selectedNodeId);
  const downstreamDependents = NETWORK_EDGES.filter((e) => e.from === selectedNodeId);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Systemic Infrastructure Resilience"
        title="Interconnected Infrastructure & Cascading Disruption Engine"
        subhead="Infrastructure is monitored asset by asset, even though power, roads, bridges, water, and hospitals depend on one another. Explore how disruptions propagate across lifelines, pinpoint single points of failure, and discover high-leverage interventions."
      />

      {/* Main Tab Navigation */}
      <div className="flex flex-wrap gap-2 mb-8 p-1.5 rounded-2xl bg-black/50 border border-white/10 backdrop-blur-md">
        {RESILIENCE_TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-white text-black shadow-lg shadow-white/20 font-semibold"
                  : "text-white/70 hover:text-white hover:bg-white/5"
              }`}
            >
              <i className={`fa-solid ${tab.icon} ${active ? "text-black" : "text-white/40"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: DOMINO CASCADE SIMULATOR (The exact user-requested experience) */}
      {activeTab === "domino" && (
        <div className="space-y-6 animate-reveal">
          <DominoCascadeSimulator defaultScenarioId="bridge_b7" />
        </div>
      )}

      {/* TAB 2: INTERCONNECTED TOPOLOGY & RELATIONSHIPS */}
      {activeTab === "topology" && (
        <div className="space-y-6 animate-reveal">
          {/* Top Bar: View Mode Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
            <div>
              <h3 className="text-lg font-display font-semibold text-white">Cross-Sector Infrastructure Lifelines</h3>
              <p className="text-xs text-white/60">
                Visualizing multi-layer dependencies: Power Grid $\to$ Water Treatment $\to$ Bridges/Roads $\to$ Trauma Centers.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setMapMode("graph")}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                  mapMode === "graph"
                    ? "bg-white text-black font-semibold"
                    : "bg-white/10 text-white/70 hover:bg-white/15"
                }`}
              >
                <i className="fa-solid fa-circle-nodes mr-1.5" />
                Network Topology Graph
              </button>
              <button
                onClick={() => setMapMode("map")}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                  mapMode === "map"
                    ? "bg-white text-black font-semibold"
                    : "bg-white/10 text-white/70 hover:bg-white/15"
                }`}
              >
                <i className="fa-solid fa-map-location-dot mr-1.5" />
                Geospatial Leaflet Map
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Main Network Viewport */}
            <div className="lg:col-span-8 rounded-3xl bg-black/60 border border-white/10 p-5 overflow-hidden relative min-h-[500px]">
              {mapMode === "graph" ? (
                <div className="w-full h-full flex flex-col items-center justify-center relative">
                  <div className="absolute top-3 left-3 z-10 text-[11px] font-mono text-white/40 bg-black/40 px-2.5 py-1 rounded border border-white/10">
                    Interactive Dependency Graph — Click any node to inspect relationships
                  </div>

                  {/* SVG Dependency Network */}
                  <svg viewBox="80 100 560 400" className="w-full h-[460px]">
                    <defs>
                      <marker
                        id="arrow"
                        viewBox="0 0 10 10"
                        refX="22"
                        refY="5"
                        markerWidth="6"
                        markerHeight="6"
                        orient="auto-start-reverse"
                      >
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" opacity="0.7" />
                      </marker>
                    </defs>

                    {/* Render Edges */}
                    {NETWORK_EDGES.map((edge, idx) => {
                      const fromNode = NETWORK_NODES.find((n) => n.id === edge.from);
                      const toNode = NETWORK_NODES.find((n) => n.id === edge.to);
                      if (!fromNode || !toNode) return null;

                      const isSelected = selectedNodeId === edge.from || selectedNodeId === edge.to;

                      return (
                        <g key={idx}>
                          <line
                            x1={fromNode.x}
                            y1={fromNode.y}
                            x2={toNode.x}
                            y2={toNode.y}
                            stroke={isSelected ? "#38bdf8" : "rgba(255,255,255,0.2)"}
                            strokeWidth={isSelected ? "2.5" : "1.2"}
                            strokeDasharray={edge.type === "comm" ? "4,4" : undefined}
                            markerEnd="url(#arrow)"
                          />
                        </g>
                      );
                    })}

                    {/* Render Nodes */}
                    {NETWORK_NODES.map((node) => {
                      const isSelected = selectedNodeId === node.id;
                      const isBridge = node.id === "B7";
                      const isSubstation = node.id === "S-ALPHA";

                      return (
                        <g
                          key={node.id}
                          transform={`translate(${node.x}, ${node.y})`}
                          className="cursor-pointer group"
                          onClick={() => setSelectedNodeId(node.id)}
                        >
                          {/* Pulsing selection aura */}
                          {isSelected && (
                            <circle r="26" fill="none" stroke="#38bdf8" strokeWidth="2" opacity="0.6" className="animate-ping" />
                          )}

                          <circle
                            r="18"
                            fill={
                              isBridge
                                ? "#ef4444"
                                : isSubstation
                                ? "#f59e0b"
                                : node.category === "healthcare"
                                ? "#ec4899"
                                : node.category === "water"
                                ? "#06b6d4"
                                : "#3b82f6"
                            }
                            stroke={isSelected ? "#ffffff" : "rgba(255,255,255,0.5)"}
                            strokeWidth={isSelected ? "3" : "1.5"}
                            className="transition-transform group-hover:scale-125"
                          />

                          <text
                            y="4"
                            textAnchor="middle"
                            fill="#ffffff"
                            fontSize="9"
                            fontWeight="bold"
                            fontFamily="monospace"
                          >
                            {node.id}
                          </text>

                          <text
                            y="30"
                            textAnchor="middle"
                            fill={isSelected ? "#ffffff" : "rgba(255,255,255,0.7)"}
                            fontSize="10"
                            fontWeight={isSelected ? "bold" : "normal"}
                          >
                            {node.label.split("(")[0]}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              ) : (
                <div className="w-full h-[460px] rounded-2xl overflow-hidden">
                  <MapContainer
                    center={[18.965, 72.845]}
                    zoom={12}
                    scrollWheelZoom={false}
                    className="w-full h-full"
                  >
                    <TileLayer url={MAP_TILES.street.url} attribution={MAP_TILES.street.attribution} />

                    {NETWORK_NODES.map((node) => (
                      <CircleMarker
                        key={node.id}
                        center={[node.lat, node.lng]}
                        radius={node.id === selectedNodeId ? 14 : 9}
                        pathOptions={{
                          color: node.id === selectedNodeId ? "#ffffff" : "#38bdf8",
                          fillColor:
                            node.id === "B7"
                              ? "#ef4444"
                              : node.id === "S-ALPHA"
                              ? "#f59e0b"
                              : "#0284c7",
                          fillOpacity: 0.85,
                          weight: 2,
                        }}
                        eventHandlers={{
                          click: () => setSelectedNodeId(node.id),
                        }}
                      >
                        <Popup>
                          <div className="text-xs">
                            <strong className="block text-sm font-bold text-white">{node.label}</strong>
                            <span className="text-sky-300 block">Sector: {node.category}</span>
                            <span className="text-white/70 block">Capacity: {node.capacity}</span>
                            <span className="text-amber-300 block font-mono">Betweenness: {node.betweenness}</span>
                          </div>
                        </Popup>
                      </CircleMarker>
                    ))}

                    {/* Connecting polylines */}
                    {NETWORK_EDGES.map((edge, idx) => {
                      const fromNode = NETWORK_NODES.find((n) => n.id === edge.from);
                      const toNode = NETWORK_NODES.find((n) => n.id === edge.to);
                      if (!fromNode || !toNode) return null;

                      return (
                        <Polyline
                          key={idx}
                          positions={[
                            [fromNode.lat, fromNode.lng],
                            [toNode.lat, toNode.lng],
                          ]}
                          pathOptions={{
                            color: selectedNodeId === edge.from || selectedNodeId === edge.to ? "#38bdf8" : "#94a3b8",
                            weight: selectedNodeId === edge.from || selectedNodeId === edge.to ? 3 : 1.5,
                            opacity: 0.6,
                            dashArray: edge.type === "comm" ? "5, 5" : undefined,
                          }}
                        />
                      );
                    })}
                  </MapContainer>
                </div>
              )}
            </div>

            {/* Node Relationship Inspector */}
            <div className="lg:col-span-4 rounded-3xl bg-black/60 border border-white/10 p-5 space-y-4">
              <div className="pb-3 border-b border-white/10">
                <span className="text-xs font-mono uppercase text-sky-400 font-bold">Node Relationship Inspector</span>
                <h4 className="text-xl font-display font-bold text-white mt-1">{selectedNode.label}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/10 text-white/80">
                    Sector: {selectedNode.category}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Nominal
                  </span>
                </div>
              </div>

              {/* Upstream Inflow Dependencies */}
              <div>
                <span className="text-xs uppercase font-mono text-white/50 block mb-2">
                  Incoming Dependencies (What it needs):
                </span>
                {upstreamDependencies.length === 0 ? (
                  <div className="p-3 rounded-xl bg-white/5 text-xs text-white/40 italic">
                    Primary infeed node — no upstream dependencies within this sector cluster.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {upstreamDependencies.map((dep, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-400/20 text-xs flex items-center justify-between">
                        <div>
                          <span className="font-bold text-white">{dep.from}</span>
                          <span className="text-white/50 block text-[11px]">{dep.label}</span>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-400/20 text-sky-200">
                          {dep.type}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Downstream Dependents */}
              <div>
                <span className="text-xs uppercase font-mono text-red-400/80 block mb-2">
                  Outgoing Dependents (Who fails if this trips):
                </span>
                {downstreamDependents.length === 0 ? (
                  <div className="p-3 rounded-xl bg-white/5 text-xs text-white/40 italic">
                    End-of-line sink node.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {downstreamDependents.map((dep, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-red-500/10 border border-red-400/20 text-xs flex items-center justify-between">
                        <div>
                          <span className="font-bold text-white">{dep.to}</span>
                          <span className="text-white/50 block text-[11px]">{dep.label}</span>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-400/20 text-red-200">
                          {dep.type}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Centrality Dial */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                <div>
                  <span className="text-white/50 block">Betweenness Centrality:</span>
                  <span className="font-mono text-white font-bold text-sm">{selectedNode.betweenness}</span>
                </div>
                <div className="text-right">
                  <span className="text-white/50 block">Fragility Multiplier:</span>
                  <span className="font-mono text-amber-400 font-bold text-sm">{selectedNode.fragility}x</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DISPROPORTIONATE BOTTLENECK ANALYSIS */}
      {activeTab === "bottlenecks" && (
        <div className="space-y-6 animate-reveal">
          <div className="rounded-2xl border border-amber-400/20 bg-amber-500/5 p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
                <i className="fa-solid fa-bullseye text-lg" />
              </div>
              <div>
                <h3 className="text-xl font-display text-white">Identify Disproportionately Important Assets</h3>
                <p className="text-sm text-white/60">
                  Network centrality analytics reveal single assets whose failure inflicts catastrophic systemic damage far beyond their local footprint.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-black/60 border border-white/10 overflow-hidden">
            <div className="p-5 border-b border-white/10">
              <h4 className="font-display text-lg font-bold text-white">Systemic Fragility & Centrality Leaderboard</h4>
              <p className="text-xs text-white/50">
                Sorted by betweenness centrality and cascading consequence score.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-white/50 font-mono text-[11px] uppercase bg-white/[0.02]">
                    <th className="p-4">Rank</th>
                    <th className="p-4">Critical Asset</th>
                    <th className="p-4">Lifeline Sector</th>
                    <th className="p-4">Betweenness Centrality ($C_B$)</th>
                    <th className="p-4">Fragility Multiplier</th>
                    <th className="p-4">Cascading Domino Impact</th>
                    <th className="p-4">High-Leverage Recommendation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {BOTTLENECK_RANKINGS.map((item) => (
                    <tr key={item.code} className="hover:bg-white/[0.03] transition-colors">
                      <td className="p-4 font-mono font-bold text-white">#{item.rank}</td>
                      <td className="p-4">
                        <div className="font-bold text-white">{item.asset}</div>
                        <div className="text-[10px] font-mono text-white/50">{item.code}</div>
                        {item.spof && (
                          <span className="inline-block mt-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40">
                            CRITICAL SPOF
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-white/70">{item.sector}</td>
                      <td className="p-4 font-mono text-cyan-300 font-bold">{item.betweenness}</td>
                      <td className="p-4 font-mono text-amber-400 font-bold">{item.fragility}</td>
                      <td className="p-4 text-red-300 font-medium">{item.downstreamLoss}</td>
                      <td className="p-4 text-xs text-white/80">{item.recommendation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SCENARIO COMPARISON SANDBOX */}
      {activeTab === "scenarios" && (
        <div className="space-y-6 animate-reveal">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
            <div>
              <h3 className="text-lg font-display font-semibold text-white">Compare Alternative Resilience Scenarios</h3>
              <p className="text-xs text-white/60">
                Evaluate system behaviour under unmitigated disruption vs. proactive capital reinforcement.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveScenario("unmitigated")}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                  activeScenario === "unmitigated"
                    ? "bg-red-500 text-white shadow-lg shadow-red-500/30"
                    : "bg-white/10 text-white/70 hover:bg-white/15"
                }`}
              >
                Unmitigated Disaster
              </button>
              <button
                onClick={() => setActiveScenario("hardened")}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                  activeScenario === "hardened"
                    ? "bg-emerald-400 text-black shadow-lg shadow-emerald-400/30"
                    : "bg-white/10 text-white/70 hover:bg-white/15"
                }`}
              >
                Hardened Intervention Active
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="rounded-3xl bg-black/60 border border-white/10 p-6 space-y-4">
              <div className="text-xs font-mono uppercase tracking-wider text-white/50">Minimum Resilience Valley</div>
              <div className="text-4xl font-display font-bold text-white">
                {activeScenario === "unmitigated" ? (
                  <span className="text-red-400">24% Operability</span>
                ) : (
                  <span className="text-emerald-400">82% Operability</span>
                )}
              </div>
              <p className="text-xs text-white/60 leading-relaxed">
                {activeScenario === "unmitigated"
                  ? "Unchecked cascade topples 4 secondary corridors, plunging the metropolitan area into multi-sector paralysis."
                  : "Targeted bypass deployment halts cascade at first ring; healthcare and water remain 100% online."}
              </p>
            </div>

            <div className="rounded-3xl bg-black/60 border border-white/10 p-6 space-y-4">
              <div className="text-xs font-mono uppercase tracking-wider text-white/50">At-Risk Population Protected</div>
              <div className="text-4xl font-display font-bold text-white">
                {activeScenario === "unmitigated" ? (
                  <span className="text-red-400">0 Protected</span>
                ) : (
                  <span className="text-cyan-300">185,000 Citizens</span>
                )}
              </div>
              <p className="text-xs text-white/60 leading-relaxed">
                {activeScenario === "unmitigated"
                  ? "185,000 citizens experience acute water, power, or emergency transport delays."
                  : "185,000 citizens retain continuous access to trauma centers and emergency services."}
              </p>
            </div>

            <div className="rounded-3xl bg-black/60 border border-white/10 p-6 space-y-4">
              <div className="text-xs font-mono uppercase tracking-wider text-white/50">Ambulance Response Transit</div>
              <div className="text-4xl font-display font-bold text-white">
                {activeScenario === "unmitigated" ? (
                  <span className="text-red-400">58 min latency (+50m)</span>
                ) : (
                  <span className="text-emerald-400">9 min nominal (+1m)</span>
                )}
              </div>
              <p className="text-xs text-white/60 leading-relaxed">
                {activeScenario === "unmitigated"
                  ? "Critical medical golden hour breached; acute trauma transfers paralyzed across the river."
                  : "Emergency priority bypass routing keeps trauma corridor open for all regional ambulances."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: PLANNER CAPITAL INVESTMENT ALLOCATOR */}
      {activeTab === "interventions" && (
        <div className="space-y-6 animate-reveal">
          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
                <i className="fa-solid fa-coins text-lg" />
              </div>
              <div>
                <h3 className="text-xl font-display text-white">Where Intervention Could Have the Greatest Effect</h3>
                <p className="text-sm text-white/60">
                  Targeted resilience investment matrix for disaster commissioners, municipal corporations, and infrastructure planners.
                </p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-3xl bg-black/60 border border-cyan-400/30 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-widest text-cyan-300 font-bold">
                  Top Priority Intervention #1
                </span>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-cyan-400/20 text-cyan-200 border border-cyan-400/30">
                  ROI: 5.5x
                </span>
              </div>
              <h4 className="text-xl font-display font-bold text-white">
                Reinforce Road R12 with Quick-Deploy Modular Steel Bailey Bypass
              </h4>
              <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
                When Bridge B7 experiences structural closure, Road R12 absorbs 45,000 veh/day. Pre-staging modular bypass ramps prevents road collapse and preserves hospital trauma access.
              </p>
              <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                <div>
                  <span className="text-white/40 block font-mono">Estimated Cost:</span>
                  <span className="text-lg font-bold text-white font-mono">₹14.8 Crore</span>
                </div>
                <div className="text-right">
                  <span className="text-white/40 block font-mono">Cascade Impact Reduction:</span>
                  <span className="text-lg font-bold text-emerald-400 font-mono">68%</span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-black/60 border border-emerald-400/30 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-widest text-emerald-300 font-bold">
                  Top Priority Intervention #2
                </span>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                  ROI: 7.6x
                </span>
              </div>
              <h4 className="text-xl font-display font-bold text-white">
                Substation Alpha Automated Flood Barriers & 20MW Microgrid
              </h4>
              <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
                Substation Alpha is the highest betweenness node ($C_B = 0.95$). Installing pneumatic floodwalls and 20MW storage prevents water treatment and 112 telecom cascade failure.
              </p>
              <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                <div>
                  <span className="text-white/40 block font-mono">Estimated Cost:</span>
                  <span className="text-lg font-bold text-white font-mono">₹18.5 Crore</span>
                </div>
                <div className="text-right">
                  <span className="text-white/40 block font-mono">Cascade Impact Reduction:</span>
                  <span className="text-lg font-bold text-emerald-400 font-mono">79%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
