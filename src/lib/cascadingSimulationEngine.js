// Nationwide Inter-Departmental Cascading Failure & Domino Disruption Prediction Engine
// Computes multi-order domino waves, next likely failure rankings,
// probable waiting periods (time-to-cascade countdowns), and situational advisories.

import { DEPARTMENTS, SUBSECTORS } from "./cascadingDepartmentsData.js";

// Lookup index for fast O(1) resolution
export const SUBSECTOR_MAP = new Map(SUBSECTORS.map((s) => [s.id, s]));
export const DEPARTMENT_MAP = new Map(DEPARTMENTS.map((d) => [d.id, d]));

// Build reverse downstream dependents index
export const DOWNSTREAM_GRAPH = new Map();
SUBSECTORS.forEach((s) => {
  DOWNSTREAM_GRAPH.set(s.id, []);
});

SUBSECTORS.forEach((sourceNode) => {
  if (sourceNode.upstreamDependencies) {
    sourceNode.upstreamDependencies.forEach((dep) => {
      if (DOWNSTREAM_GRAPH.has(dep.targetId)) {
        DOWNSTREAM_GRAPH.get(dep.targetId).push({
          dependentId: sourceNode.id,
          weight: dep.weight,
          lagMinutes: dep.lagMinutes,
          reason: dep.reason,
        });
      }
    });
  }
});

// Preset Real-World National Crisis Scenarios
export const PRESET_SCENARIOS = [
  {
    id: "super_cyclone_landfall",
    name: "Super Cyclone Landfall (Bay of Bengal / Odisha Coast)",
    category: "Tropical Cyclone",
    badge: "Category 5 Hazard",
    icon: "fa-hurricane",
    triggerNodeId: "power_substations",
    triggerEvent: "Catastrophic 220km/h Winds Shear 400kV Coastal Transmission Towers",
    description: "Coastal grid collapse cuts electricity to water pumps, telecommunications, veterinary cold chains, and hospital ICU backups.",
    headlineLoss: "Grid blackout leaves 4.2 million people without pumped water or mobile reception within 4 hours.",
  },
  {
    id: "himalayan_flash_flood",
    name: "Himalayan Cloudburst & Glacial Outburst (Kedarnath / Wayanad)",
    category: "Fast-Onset Flood",
    badge: "Hydro-Meteorological",
    icon: "fa-water",
    triggerNodeId: "bridges_culverts",
    triggerEvent: "High-Volume Flash Flood Shears Arterial River Bridges & Roads",
    description: "Mountain road washouts isolate pilgrimage shrines, sever optical fiber cables, halt vegetable trucks, and trap ambulances.",
    headlineLoss: "45,000 pilgrims and mountain villagers cut off; emergency medical transit times jump from 15 min to over 4 hours.",
  },
  {
    id: "northern_grid_blackout",
    name: "Regional Grid Inter-Tie Failure (Northern / Western Grid Collapse)",
    category: "Infrastructure Collapse",
    badge: "Cascading Blackout",
    icon: "fa-bolt-lightning",
    triggerNodeId: "power_substations",
    triggerEvent: "Cascade Tripping of High-Voltage 765kV Inter-Regional Tie Lines",
    description: "Simultaneous collapse of traction substations halts passenger and freight trains; hospital liquid oxygen plants trip instantly.",
    headlineLoss: "1,200 electric trains halted across 6 states; banking ATM networks and city water plants shut down.",
  },
  {
    id: "apmc_market_logistics_choke",
    name: "National Highway Arterial Severance & Market Food Choke",
    category: "Supply Chain Crisis",
    badge: "Economic Shock",
    icon: "fa-truck-ramp-box",
    triggerNodeId: "highway_corridors",
    triggerEvent: "Massive Landslide & River Overflow Blocks Golden Quadrilateral Corridor",
    description: "Severance of freight arterial halts 15,000 grain and milk trucks, triggering APMC mandi shortages and urban price shocks.",
    headlineLoss: "Urban wholesale vegetable stocks drop 70%; dairy cooperatives forced to dump sour milk.",
  },
  {
    id: "dam_reservoir_spillway_breach",
    name: "Major River Reservoir Surge & Downstream Sluice Breach",
    category: "Hydro Hazard",
    badge: "Dam Inundation",
    icon: "fa-droplet",
    triggerNodeId: "dam_reservoirs",
    triggerEvent: "Uncontrolled 500,000 Cusec Dam Release Tears River Embankments",
    description: "Breached flood dykes submerge drinking water intake pumps, drown rural connecting culverts, and swamp grain silos.",
    headlineLoss: "250 riverside villages inundated; municipal water supply contaminated with high-turbidity silt.",
  },
];

/**
 * Executes a step-by-step mathematical cascade propagation across the 30-department graph.
 * @param {string} triggerId - The primary sub-sector node that fails first.
 * @returns {Object} Comprehensive simulation result.
 */
export function simulateCascadingFailure(triggerId) {
  const triggerNode = SUBSECTOR_MAP.get(triggerId);
  if (!triggerNode) return null;

  // Wave tracker
  const waves = [];
  const failedNodeIds = new Set([triggerId]);
  const nodeFailureTime = new Map([[triggerId, 0]]); // NodeId -> Minutes elapsed
  const nodeFailureOrder = new Map([[triggerId, 0]]);
  const nodeFailureCause = new Map([[triggerId, "Primary Ground Zero Disaster Shock"]]);

  // Initial Wave 0: Trigger
  waves.push({
    waveIndex: 0,
    elapsedMinutes: 0,
    elapsedLabel: "T+0 min (Ground Zero)",
    nodes: [
      {
        ...triggerNode,
        dept: DEPARTMENT_MAP.get(triggerNode.deptId),
        failureCause: "Direct Primary Incident Shock",
        status: "critical",
        order: 0,
      },
    ],
  });

  // Iteratively compute downstream waves
  let currentWaveSources = [triggerId];
  let waveCount = 1;
  let maxWaves = 5;

  while (currentWaveSources.length > 0 && waveCount <= maxWaves) {
    const nextWaveNodes = [];
    const candidates = new Set();

    // Find all immediate downstream dependents of current wave
    currentWaveSources.forEach((sourceId) => {
      const dependents = DOWNSTREAM_GRAPH.get(sourceId) || [];
      dependents.forEach((dep) => {
        if (!failedNodeIds.has(dep.dependentId)) {
          candidates.add(dep.dependentId);
        }
      });
    });

    // Evaluate each candidate to see if cumulative upstream damage triggers failure
    let waveMinLag = Infinity;

    candidates.forEach((candidateId) => {
      const candidate = SUBSECTOR_MAP.get(candidateId);
      if (!candidate) return;

      // Calculate cumulative weighted upstream failure impact
      let totalUpstreamWeight = 0;
      let failedUpstreamWeight = 0;
      let primaryReason = "";
      let minLag = Infinity;

      candidate.upstreamDependencies.forEach((dep) => {
        totalUpstreamWeight += dep.weight;
        if (failedNodeIds.has(dep.targetId)) {
          failedUpstreamWeight += dep.weight;
          const sourceTime = nodeFailureTime.get(dep.targetId) || 0;
          const arrivalTime = sourceTime + dep.lagMinutes;
          if (arrivalTime < minLag) {
            minLag = arrivalTime;
            primaryReason = dep.reason;
          }
        }
      });

      const impactFraction = totalUpstreamWeight > 0 ? failedUpstreamWeight / totalUpstreamWeight : 0;

      // Failure threshold: if > 50% of vital upstream dependencies are severed
      // or if any single high-criticality dependency (>0.85 weight) collapses
      const exceedsThreshold = impactFraction >= 0.5 || candidate.upstreamDependencies.some(
        (dep) => failedNodeIds.has(dep.targetId) && dep.weight >= 0.88
      );

      if (exceedsThreshold) {
        failedNodeIds.add(candidateId);
        const failureMinute = minLag !== Infinity ? minLag : waveCount * 45;
        nodeFailureTime.set(candidateId, failureMinute);
        nodeFailureOrder.set(candidateId, waveCount);
        nodeFailureCause.set(candidateId, primaryReason || "Critical upstream lifeline severed.");

        if (failureMinute < waveMinLag) {
          waveMinLag = failureMinute;
        }

        nextWaveNodes.push({
          ...candidate,
          dept: DEPARTMENT_MAP.get(candidate.deptId),
          failureCause: primaryReason || "Critical upstream lifeline severed.",
          failureMinute,
          status: waveCount === 1 ? "critical" : "warning",
          order: waveCount,
        });
      }
    });

    if (nextWaveNodes.length > 0) {
      // Sort nodes by failure minute within the wave
      nextWaveNodes.sort((a, b) => a.failureMinute - b.failureMinute);
      const waveLabel = formatMinutesToTime(nextWaveNodes[0].failureMinute);

      waves.push({
        waveIndex: waveCount,
        elapsedMinutes: nextWaveNodes[0].failureMinute,
        elapsedLabel: waveLabel,
        nodes: nextWaveNodes,
      });

      currentWaveSources = nextWaveNodes.map((n) => n.id);
      waveCount++;
    } else {
      break;
    }
  }

  // Next Failure Predictions: Compute unfailed nodes under extreme stress
  const nextFailurePredictions = computeNextLikelyFailures(failedNodeIds, nodeFailureTime);

  // Situational Advisories: Aggregate for citizens and authorities
  const situationalAnalysis = generateSituationalAnalysis(waves, nextFailurePredictions);

  // Affected Departments Summary
  const affectedDeptIds = new Set();
  failedNodeIds.forEach((id) => {
    const node = SUBSECTOR_MAP.get(id);
    if (node) affectedDeptIds.add(node.deptId);
  });

  return {
    triggerNode: {
      ...triggerNode,
      dept: DEPARTMENT_MAP.get(triggerNode.deptId),
    },
    waves,
    totalFailedSubsectors: failedNodeIds.size,
    totalAffectedDepartments: affectedDeptIds.size,
    affectedDepartments: Array.from(affectedDeptIds).map((id) => DEPARTMENT_MAP.get(id)),
    nextFailurePredictions,
    situationalAnalysis,
  };
}

/**
 * Algorithm to predict the next imminent sector collapses and estimate waiting periods.
 */
function computeNextLikelyFailures(failedNodeIds, nodeFailureTime) {
  const predictions = [];

  SUBSECTORS.forEach((subsector) => {
    if (failedNodeIds.has(subsector.id)) return; // Already failed

    let failedUpstreamCount = 0;
    let totalWeightScore = 0;
    let dominantLag = Infinity;
    let primaryThreatSource = null;

    subsector.upstreamDependencies.forEach((dep) => {
      if (failedNodeIds.has(dep.targetId)) {
        failedUpstreamCount++;
        totalWeightScore += dep.weight;
        const sourceTime = nodeFailureTime.get(dep.targetId) || 0;
        const projectedArrival = sourceTime + dep.lagMinutes + (subsector.reserveHours * 60);

        if (projectedArrival < dominantLag) {
          dominantLag = projectedArrival;
          primaryThreatSource = SUBSECTOR_MAP.get(dep.targetId);
        }
      }
    });

    if (failedUpstreamCount > 0) {
      // Failure Probability based on dependencies severed and subsector criticality
      const probability = Math.min(
        98,
        Math.round((totalWeightScore * 0.65 + subsector.criticality * 0.35) * 100)
      );

      // Probable Waiting Period (Time-to-Cascade / Countdown in minutes)
      const waitingMinutes = Math.max(15, dominantLag - 120);

      predictions.push({
        ...subsector,
        dept: DEPARTMENT_MAP.get(subsector.deptId),
        failureProbability: probability,
        waitingMinutes,
        waitingPeriodFormatted: formatMinutesToCountdown(waitingMinutes),
        threatSource: primaryThreatSource,
        riskLevel: probability >= 85 ? "Critical" : probability >= 65 ? "Severe" : "Moderate",
        riskColor: probability >= 85 ? "red" : probability >= 65 ? "orange" : "yellow",
      });
    }
  });

  // Sort by highest failure probability and shortest waiting period
  predictions.sort((a, b) => b.failureProbability - a.failureProbability || a.waitingMinutes - b.waitingMinutes);

  return predictions.slice(0, 5); // Return top 5 most vulnerable imminent sectors
}

/**
 * Formats minutes into human-readable timeline labels (e.g. "T+45 min" or "T+3 hrs 15 min")
 */
function formatMinutesToTime(mins) {
  if (mins < 60) return `T+${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `T+${hrs}h ${remMins}m` : `T+${hrs} hours`;
}

/**
 * Formats minutes into a remaining countdown buffer (e.g. "1 hr 45 min remaining")
 */
function formatMinutesToCountdown(mins) {
  if (mins < 60) return `${mins} minutes remaining`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hrs}h ${remMins}m remaining` : `${hrs} hours remaining`;
}

/**
 * Synthesizes actionable advisories for both citizens and disaster authorities.
 */
function generateSituationalAnalysis(waves, nextFailurePredictions) {
  const citizenAdvisories = [];
  const authorityInterventions = [];

  // Extract advisories from all failed nodes in waves
  waves.forEach((wave) => {
    wave.nodes.forEach((node) => {
      if (node.citizenAdvisory) {
        citizenAdvisories.push({
          sector: node.name,
          deptName: node.dept?.name || "General",
          advisory: node.citizenAdvisory,
          icon: node.dept?.icon || "fa-triangle-exclamation",
        });
      }
      if (node.authorityAction) {
        authorityInterventions.push({
          sector: node.name,
          deptName: node.dept?.name || "Governance",
          action: node.authorityAction,
          priority: node.criticality >= 0.95 ? "P1 Immediate" : "P2 High Priority",
          icon: node.dept?.icon || "fa-shield-halved",
        });
      }
    });
  });

  // High-leverage priority intervention (the single most impactful move)
  const topImminent = nextFailurePredictions[0];
  const highLeverageIntervention = topImminent
    ? {
        title: `Preemptive Shock Interception at ${topImminent.name}`,
        department: topImminent.dept?.name,
        targetSector: topImminent.name,
        waitingPeriod: topImminent.waitingPeriodFormatted,
        risk: topImminent.riskLevel,
        action: topImminent.authorityAction,
        impactPrevention: `Intervening here halts the domino chain from spreading to ${topImminent.dept?.name} and eliminates risk for downstream hospital and relief networks.`,
      }
    : null;

  return {
    citizenAdvisories: citizenAdvisories.slice(0, 6),
    authorityInterventions: authorityInterventions.slice(0, 6),
    highLeverageIntervention,
  };
}
