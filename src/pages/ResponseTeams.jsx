import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import PageShell from "../components/PageShell";
import PageHeader from "../components/PageHeader";
import { useLanguage } from "../lib/i18n/LanguageContext";

const TEAMS = [
  // ---- NDRF (National Disaster Response Force) Battalions & RRCs ----
  {
    id: "ndrf-16",
    name: "16th Battalion NDRF",
    agency: "NDRF",
    state: "Uttarakhand",
    base: "Dehradun & Joshimath",
    status: "Deployed",
    personnel: 42,
    commander: "Commandant R. K. Bhatt",
    specialty: "High-Altitude Alpine Rescue & Landslide Extrication",
    equipment: ["Victim Locating Cameras (VLC)", "Hydraulic Concrete Cutters", "Mountain Rope Winches", "Satellite BGAN"],
    hotline: "0135-2410199 / 1078",
    radioFreq: "156.800 MHz (VHF Ch 16)",
    activeMission: "Active slope surveillance and debris clearance standby across Joshimath & Garhwal corridor.",
  },
  {
    id: "ndrf-14",
    name: "14th Battalion NDRF",
    agency: "NDRF",
    state: "Himachal Pradesh",
    base: "Jassur & Kangra",
    status: "Deployed",
    personnel: 40,
    commander: "Commandant Baljinder Singh",
    specialty: "Torrential River Rescue & Flash Flood Response",
    equipment: ["Inflatable Rescue Boats (IRBs)", "Deep Diving Scuba Sets", "Life Detectors", "High-Capacity Dewatering Pumps"],
    hotline: "01893-247014 / 1078",
    radioFreq: "162.400 MHz (DMR Network)",
    activeMission: "Riverine flood patrols along Beas and Sutlej river basins following mountain rainfall.",
  },
  {
    id: "ndrf-01",
    name: "1st Battalion NDRF",
    agency: "NDRF",
    state: "Assam",
    base: "Patgaon, Guwahati",
    status: "Deployed",
    personnel: 48,
    commander: "Commandant H. P. S. Kandari",
    specialty: "Brahmaputra Riverine Search & Flood Triage",
    equipment: ["High-Speed Rescue Boats (40HP)", "Echo-Sounder Sonar", "Floating Medical Stations", "Night Vision Drone Recon"],
    hotline: "0361-2840284 / 1078",
    radioFreq: "155.750 MHz (Disaster Grid)",
    activeMission: "Stationed in upper Brahmaputra delta & Sarupathar basin for immediate water evacuation.",
  },
  {
    id: "ndrf-rrc-kar",
    name: "NDRF Regional Response Centre (RRC)",
    agency: "NDRF",
    state: "Karnataka",
    base: "Mangaluru & Bengaluru",
    status: "Deployed",
    personnel: 36,
    commander: "Assistant Commandant V. K. Nair",
    specialty: "Coastal Surge & Western Ghats Slope Response",
    equipment: ["Inflatable Motorized Boats", "Chainsaws & Tree Cutters", "Portable Water Purifiers", "Thermal Drones"],
    hotline: "0824-2220587 / 112",
    radioFreq: "156.650 MHz (Coast Tactical)",
    activeMission: "Coastal monsoon watch covering Udupi, Manipal, and Swarna river catchment areas.",
  },
  {
    id: "ndrf-05",
    name: "5th Battalion NDRF",
    agency: "NDRF",
    state: "Maharashtra",
    base: "Sudumbare, Pune",
    status: "Deployed",
    personnel: 45,
    commander: "Commandant S. B. Singh",
    specialty: "Urban Search & Rescue (USAR) & Western Ghats",
    equipment: ["Acoustic Life Detectors", "Heavy Rotary Rescue Saws", "Structural Shoring Kits", "CBRN Hazmat Suits"],
    hotline: "02114-247000 / 1078",
    radioFreq: "168.100 MHz (State Trunking)",
    activeMission: "Deployed across Raigad & Konkan coastal belt for rapid landslide intervention.",
  },
  {
    id: "ndrf-04",
    name: "4th Battalion NDRF",
    agency: "NDRF",
    state: "Tamil Nadu",
    base: "Arakkonam",
    status: "On standby",
    personnel: 44,
    commander: "Commandant Akhilesh Kumar",
    specialty: "Cyclone Impact & Deep Submergence Evacuation",
    equipment: ["Rigid Inflatable Boats (RIB)", "Underwater Metal Cutters", "Air-Droppable Liferafts", "Amphibious All-Terrain Vehicles"],
    hotline: "04177-246594 / 1078",
    radioFreq: "157.100 MHz (Maritime SAR)",
    activeMission: "Immediate air-transport readiness at Arakkonam airbase for Southern Peninsula deployment.",
  },
  {
    id: "ndrf-03",
    name: "3rd Battalion NDRF",
    agency: "NDRF",
    state: "Odisha",
    base: "Mundali, Cuttack",
    status: "On standby",
    personnel: 42,
    commander: "Commandant Jacob Kispotta",
    specialty: "Super Cyclone & Coastal Surge Operations",
    equipment: ["High-Buoyancy Flood Boats", "Emergency Satellite Terminals", "Debris Removal Cranes", "Pneumatic Lifting Bags"],
    hotline: "0671-2879711 / 1078",
    radioFreq: "154.570 MHz (Odisha Emergency)",
    activeMission: "Pre-positioned for Bay of Bengal coastal depression monitoring along Mahanadi delta.",
  },
  {
    id: "ndrf-09",
    name: "9th Battalion NDRF",
    agency: "NDRF",
    state: "Bihar",
    base: "Bihta, Patna",
    status: "On standby",
    personnel: 38,
    commander: "Commandant Sunil Kumar",
    specialty: "Ganga Basin Mass Inundation & Embankment Breach",
    equipment: ["Motorized Fiber Boats", "Submersible Flood Pumps", "Aerial Surveillance Quadcopters", "Emergency Lighting Towers"],
    hotline: "06115-252559 / 1078",
    radioFreq: "163.250 MHz (State Police Grid)",
    activeMission: "Standby along Kosi and Gandak river basins for rapid flood triage.",
  },
  {
    id: "ndrf-02",
    name: "2nd Battalion NDRF",
    agency: "NDRF",
    state: "West Bengal",
    base: "Haringhata, Nadia",
    status: "On standby",
    personnel: 36,
    commander: "Commandant Gurminder Singh",
    specialty: "Sundarbans Estuarine Triage & Delta Evacuation",
    equipment: ["Amphibious Inflatable Craft", "GPS Life Rings", "High-Volume Dewatering Pumps", "Field Hospital Tents"],
    hotline: "033-25875032 / 1078",
    radioFreq: "155.050 MHz (Kolkata Port Net)",
    activeMission: "Riverine patrolling across Hooghly estuary and Sundarbans mangrove channels.",
  },
  {
    id: "ndrf-10",
    name: "10th Battalion NDRF",
    agency: "NDRF",
    state: "Andhra Pradesh",
    base: "Acharya Nagarjuna Nagar, Guntur",
    status: "On standby",
    personnel: 35,
    commander: "Commandant Zahid Khan",
    specialty: "Krishna-Godavari Basin Flood & Cyclone Relief",
    equipment: ["Assault Boats", "Underwater Lighting", "Emergency Radio Repeaters", "First Aid Trauma Packs"],
    hotline: "0863-2293900 / 1078",
    radioFreq: "157.000 MHz (Coast Guard Link)",
    activeMission: "Pre-positioned for eastern coastal depression response.",
  },

  // ---- SDRF (State Disaster Response Forces) ----
  {
    id: "sdrf-kar-coast",
    name: "Karnataka SDRF — Coastal Division",
    agency: "SDRF",
    state: "Karnataka",
    base: "Mangaluru & Udupi",
    status: "Deployed",
    personnel: 28,
    commander: "DySP M. S. Poovaiah",
    specialty: "Shallow Water Rescue & Estuary Inundation",
    equipment: ["Gemini Inflatable Boats", "Deep Diving Oxygen Tanks", "Lifejackets & Throw Bags", "Power Chainsaws"],
    hotline: "0820-2521250 / 112",
    radioFreq: "151.625 MHz (Karnataka Police Net)",
    activeMission: "River patrol along Swarna and Netravati rivers; rapid response boat docked at Malpe port.",
  },
  {
    id: "sdrf-kar-hills",
    name: "Karnataka SDRF — Hill Slope Taskforce",
    agency: "SDRF",
    state: "Karnataka",
    base: "Belagavi & Madikeri (Kodagu)",
    status: "Deployed",
    personnel: 24,
    commander: "Inspector Anand Patil",
    specialty: "Western Ghats Mudslide Excavation & Cliff Clearance",
    equipment: ["Hydraulic Rock Splitters", "Winch Cable Trucks", "Slope Soil Moisture Meters", "Thermal Cameras"],
    hotline: "08272-221077 / 112",
    radioFreq: "152.125 MHz (Kodagu District Net)",
    activeMission: "Monitoring vulnerable ridge roads and coffee estate hill slopes in Madikeri & Bhagamandala.",
  },
  {
    id: "sdrf-ker-wayanad",
    name: "Kerala SDRF — Mountain Strike Force",
    agency: "SDRF",
    state: "Kerala",
    base: "Kalpetta, Wayanad",
    status: "Deployed",
    personnel: 26,
    commander: "Deputy Commandant K. V. Suresh",
    specialty: "Steep Terrain Mountain Evacuation & Valley Extraction",
    equipment: ["High-Angle Rope Rigging", "Heavy Debris Cutters", "Satellite GPS Navigators", "Foldable Field Stretchers"],
    hotline: "04936-204151 / 112",
    radioFreq: "153.800 MHz (Kerala Forest Net)",
    activeMission: "Stationed in Meppadi & Chooralmala sector for active landslide detection and safe evacuation.",
  },
  {
    id: "sdrf-ker-water",
    name: "Kerala SDRF — Kuttanad Water Rescue",
    agency: "SDRF",
    state: "Kerala",
    base: "Alappuzha & Ernakulam",
    status: "Deployed",
    personnel: 22,
    commander: "Inspector P. Thomas",
    specialty: "Backwater Amphibious Evacuation & Tidal Choke Relief",
    equipment: ["Shallow-Draft Fiber Boats", "Water Filtration Stations", "Battery Outboard Motors", "Emergency Floating Dispensary"],
    hotline: "0477-2238630 / 112",
    radioFreq: "156.450 MHz (Backwater Net)",
    activeMission: "Continuous pump operations and elderly citizen transport across low-lying Vembanad basin.",
  },
  {
    id: "sdrf-maha-konkan",
    name: "Maharashtra SDRF — Konkan Monsoon Unit",
    agency: "SDRF",
    state: "Maharashtra",
    base: "Mahad & Raigad",
    status: "On standby",
    personnel: 30,
    commander: "Inspector Nitin Gaikwad",
    specialty: "River Flash Surge & Highway Rockfall Relief",
    equipment: ["Telescopic Boom Cranes", "Inflatable Patrol Boats", "Megaphones & Siren Vans", "Emergency Rations Packs"],
    hotline: "02141-222118 / 112",
    radioFreq: "154.200 MHz (Maharashtra Disaster Net)",
    activeMission: "Savitri river basin monitoring; road clearance teams stationed on Mumbai-Goa NH-66.",
  },
  {
    id: "sdrf-assam-div",
    name: "Assam SDRF — Deep Water Diving Squadron",
    agency: "SDRF",
    state: "Assam",
    base: "Guwahati & Dibrugarh",
    status: "Deployed",
    personnel: 28,
    commander: "Inspector B. K. Sarma",
    specialty: "Swift Current River Navigation & Silt Extraction",
    equipment: ["High-Torque Outboard Motors", "Diving Compressors", "Submerged Obstacle Sonar", "Waterproof Emergency Radios"],
    hotline: "0361-2237011 / 1070",
    radioFreq: "155.100 MHz (Assam SDMA)",
    activeMission: "River rescue operations across vulnerable embankment points in Kamrup & Golaghat districts.",
  },
  {
    id: "sdrf-uk-high",
    name: "Uttarakhand SDRF — Alpine Lake & Cliff Unit",
    agency: "SDRF",
    state: "Uttarakhand",
    base: "Kedarnath & Srinagar (Garhwal)",
    status: "Deployed",
    personnel: 24,
    commander: "Inspector Lalit Mohan",
    specialty: "Glacial Lake Outburst (GLOF) & High-Altitude Extraction",
    equipment: ["Avalanche Beacons & Probes", "Technical Ice Axes & Crampons", "Satellite Phone Terminals", "Carbon-Fiber Rescue Litters"],
    hotline: "0135-2710334 / 1070",
    radioFreq: "150.950 MHz (Yatra Security Net)",
    activeMission: "Monitoring Chorabari glacial lake area and Alaknanda riverhead water gauges.",
  },
  {
    id: "sdrf-hp-river",
    name: "Himachal Pradesh SDRF — River Valley Force",
    agency: "SDRF",
    state: "Himachal Pradesh",
    base: "Kullu & Mandi",
    status: "Deployed",
    personnel: 25,
    commander: "Inspector Rajeev Sharma",
    specialty: "Torrential Gorge Crossing & Landslip Evacuation",
    equipment: ["Ropeway Aerial Traverse Rigs", "Hydraulic Saws", "Inflatable Whitewater Rafts", "High-Visibility Thermal Vests"],
    hotline: "01902-224330 / 112",
    radioFreq: "151.850 MHz (HP Disaster Channel)",
    activeMission: "Securing Beas river bridges and monitoring landslides along Kullu-Manali highway.",
  },

  // ---- Armed Forces HADR (Humanitarian Assistance & Disaster Relief) ----
  {
    id: "navy-garuda",
    name: "Indian Navy Diving & Maritime Search Unit",
    agency: "Armed Forces HADR",
    state: "Kerala",
    base: "INS Garuda, Southern Naval Command, Kochi",
    status: "Deployed",
    personnel: 18,
    commander: "Lt. Cdr. Arjun Shenoy",
    specialty: "Deep Submergence, Underwater Cutting & Scuba Triage",
    equipment: ["Heavy Dive Scuba Gear", "Hydrographic Sonar Craft", "Underwater Cutting Torches", "Hyperbaric Decompression Unit"],
    hotline: "0484-2872200 (Naval Operations)",
    radioFreq: "VHF Marine Ch 16 (156.800 MHz)",
    activeMission: "Support deployment for coastal water triage and submerged channel clearances.",
  },
  {
    id: "cg-varaha",
    name: "Indian Coast Guard Coastal Search Unit",
    agency: "Armed Forces HADR",
    state: "Karnataka",
    base: "ICGS Varaha, District HQ 3, Mangaluru",
    status: "Deployed",
    personnel: 30,
    commander: "Commandant (JG) Vivek Nair",
    specialty: "Off-Shore Maritime SAR & Air-Droppable Liferafts",
    equipment: ["Offshore Patrol Vessel (OPV)", "Fast Interceptor Boats", "Search & Rescue Helicopter Helipad", "Sea-Marker Beacons"],
    hotline: "0824-2405266 / 1554 (Toll-Free SAR)",
    radioFreq: "VHF Marine Ch 16 & HF 2182 kHz",
    activeMission: "Patrolling Arabian Sea coast between Karwar, Malpe, and Mangaluru for stranded fishing vessels.",
  },
  {
    id: "army-south-col",
    name: "Indian Army Disaster Relief Column",
    agency: "Armed Forces HADR",
    state: "Karnataka",
    base: "Maratha Light Infantry Regimental Centre / Belagavi",
    status: "On standby",
    personnel: 65,
    commander: "Colonel Aditya Rathore",
    specialty: "Bailey Bridge Assembly & Heavy Amphibious Mobility",
    equipment: ["BTR Amphibious Personnel Carriers", "Bailey Bridge Sections", "Tactical Field Kitchen", "Combat Engineering Excavators"],
    hotline: "0831-2405555 / 112",
    radioFreq: "Military Tactical VHF Net",
    activeMission: "Standby with pre-loaded Bailey bridge units for immediate washed-out road replacement.",
  },
  {
    id: "iaf-126-flt",
    name: "Indian Air Force 126 Helicopter Flight",
    agency: "Armed Forces HADR",
    state: "Tamil Nadu",
    base: "Sulur Air Force Station",
    status: "On standby",
    personnel: 16,
    commander: "Wing Commander Priya Menon",
    specialty: "Heavy Aerial Evacuation & Rooftop Winch Operations",
    equipment: ["Mi-17V5 Multi-Role Helicopters", "CH-47 Chinook Heavy-Lifter", "Emergency Airdrop Slings", "FLIR Night Cameras"],
    hotline: "0422-2687000 (Air Ops Sulur)",
    radioFreq: "UHF Aviation SAR 243.000 MHz",
    activeMission: "Equipped with power winches and emergency medical stretchers on 30-minute scramble notice.",
  },

  // ---- Specialized Emergency Medical & Trauma ----
  {
    id: "med-kmc-triage",
    name: "KMC Hospital Mass Casualty Triage Team",
    agency: "Emergency Medical",
    state: "Karnataka",
    base: "KMC Hospital Emergency Casualty, Manipal",
    status: "Deployed",
    personnel: 16,
    commander: "Dr. Arvind Hegde (HOD Trauma)",
    specialty: "Level-1 Trauma Surgery, Blood Bank & Mobile ICU",
    equipment: ["Mobile Defibrillator Units", "Emergency Blood Transfusion Kits", "Portable Oxygen Concentrators", "Tele-Medicine Satellite Uplink"],
    hotline: "0820-2922761 / 108",
    radioFreq: "Direct Hospital Hotline & 108 Intercom",
    activeMission: "20 ICU beds and 2 surgical trauma suites placed on 5-minute mass casualty standby for regional alerts.",
  },
  {
    id: "med-108-kar",
    name: "108 Karnataka Advanced Life Support (ALS) Fleet",
    agency: "Emergency Medical",
    state: "Karnataka",
    base: "Udupi & Dakshina Kannada",
    status: "Deployed",
    personnel: 24,
    commander: "Zonal Medical Officer Dr. Sneha Rao",
    specialty: "On-Scene Paramedic Resuscitation & Transit Telemetry",
    equipment: ["12 ALS Ambulance Vans", "Multipara Monitors", "Ventilators & Suction Pumps", "Emergency Splinting Kits"],
    hotline: "108 (Toll Free) / 112",
    radioFreq: "GVK EMRI Central Dispatch System",
    activeMission: "Dispatched to flood-prone river crossings across Swarna and Udyavara basins.",
  },
  {
    id: "med-108-ker",
    name: "108 Kerala Mountain Medical Rescue Wing",
    agency: "Emergency Medical",
    state: "Kerala",
    base: "Wayanad & Kozhikode",
    status: "Deployed",
    personnel: 18,
    commander: "Dr. K. Mathew",
    specialty: "4x4 All-Weather Mountain Critical Care",
    equipment: ["4x4 ALS Ambulances", "Anti-Snake Venom Dispensers", "Portable Ventilators", "Hypothermia Warmers"],
    hotline: "108 / 112",
    radioFreq: "Kerala 108 Operations Desk",
    activeMission: "Stationed at designated community relief shelters in Kalpetta & Sulthan Bathery.",
  },

  // ---- Civil Defence & Certified Community Responders (Aapda Mitra) ----
  {
    id: "cd-aapda-udupi",
    name: "Aapda Mitra Community Responders (Udupi)",
    agency: "Civil Defence / Aapda Mitra",
    state: "Karnataka",
    base: "Udupi & Swarna River Basin",
    status: "Deployed",
    personnel: 48,
    commander: "District Coordinator Premanand Shetty",
    specialty: "First-Mile Citizen Warning & Local Evacuation Guides",
    equipment: ["Emergency Life Jackets", "Megaphones & Flashlights", "First Aid Field Backpacks", "Inflatable Rafts"],
    hotline: "0820-2574924 (DDMA Udupi)",
    radioFreq: "WhatsApp Emergency Broadcast & VHF Ham Net",
    activeMission: "Guiding elderly citizens from low-lying riverbanks to official high-ground community shelters.",
  },
  {
    id: "cd-aapda-wayanad",
    name: "Aapda Mitra Hill Sentinel Brigade",
    agency: "Civil Defence / Aapda Mitra",
    state: "Kerala",
    base: "Meppadi & Vythiri, Wayanad",
    status: "Deployed",
    personnel: 35,
    commander: "Sentry Lead George Varghese",
    specialty: "Local Terrain Sentry & Night Slope Monitoring",
    equipment: ["Water Flow Staff Gauges", "Emergency High-Decibel Sirens", "Ropes & Stretchers", "Handheld Radios"],
    hotline: "04936-203380 (DDMA Wayanad)",
    radioFreq: "Local Community Emergency Channel",
    activeMission: "Continuous observation of hill water runoff and soil slippage indicators along village roads.",
  },
  {
    id: "cd-redcross-kar",
    name: "Indian Red Cross Society Relief Detachment",
    agency: "Civil Defence / Aapda Mitra",
    state: "Karnataka",
    base: "Mangaluru & Udupi",
    status: "Deployed",
    personnel: 32,
    commander: "Field Secretary Ronald D'Souza",
    specialty: "Camp Water Purification, Hygiene & Food Distribution",
    equipment: ["RO Water Purification Units", "Emergency Tarpaulin Kits", "Nutrition Rations Packs", "Sanitation Modules"],
    hotline: "0824-2423755 / 112",
    radioFreq: "Red Cross Disaster Coordination",
    activeMission: "Providing potable drinking water and hot meals at Government Pre-University College Relief Camp.",
  },
];

const AGENCIES = ["All Agencies", "NDRF", "SDRF", "Armed Forces HADR", "Emergency Medical", "Civil Defence / Aapda Mitra"];
const STATUSES = ["All Statuses", "Deployed", "On standby"];

const STATUS_STYLE = {
  Deployed: "bg-emerald-500/20 text-emerald-300 border-emerald-400/40 shadow-emerald-500/10",
  "On standby": "bg-amber-500/15 text-amber-300 border-amber-400/30 shadow-amber-500/10",
};

const AGENCY_BADGE_STYLE = {
  NDRF: "bg-orange-500/20 text-orange-300 border-orange-400/30",
  SDRF: "bg-sky-500/20 text-sky-300 border-sky-400/30",
  "Armed Forces HADR": "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
  "Emergency Medical": "bg-rose-500/20 text-rose-300 border-rose-400/30",
  "Civil Defence / Aapda Mitra": "bg-purple-500/20 text-purple-300 border-purple-400/30",
};

export default function ResponseTeams() {
  const { t } = useLanguage();
  const [selectedAgency, setSelectedAgency] = useState("All Agencies");
  const [selectedState, setSelectedState] = useState("All States");
  const [selectedStatus, setSelectedStatus] = useState("All Statuses");
  const [searchQuery, setSearchQuery] = useState("");
  const [dispatchedId, setDispatchedId] = useState(null);
  const [activeModalTeam, setActiveModalTeam] = useState(null);

  // Extract list of all unique states represented in the teams roster
  const allStates = useMemo(() => {
    const set = new Set();
    TEAMS.forEach((t) => set.add(t.state));
    return ["All States", ...Array.from(set).sort()];
  }, []);

  // Filtered teams based on selection
  const filteredTeams = useMemo(() => {
    return TEAMS.filter((t) => {
      const matchAgency = selectedAgency === "All Agencies" || t.agency === selectedAgency;
      const matchState = selectedState === "All States" || t.state === selectedState;
      const matchStatus = selectedStatus === "All Statuses" || t.status === selectedStatus;
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.base.toLowerCase().includes(q) ||
        t.state.toLowerCase().includes(q) ||
        t.specialty.toLowerCase().includes(q) ||
        t.equipment.some((e) => e.toLowerCase().includes(q));
      return matchAgency && matchState && matchStatus && matchSearch;
    });
  }, [selectedAgency, selectedState, selectedStatus, searchQuery]);

  // Aggregate metrics
  const totalPersonnel = useMemo(() => TEAMS.reduce((acc, cur) => acc + cur.personnel, 0), []);
  const deployedCount = useMemo(() => TEAMS.filter((t) => t.status === "Deployed").length, []);
  const standbyCount = useMemo(() => TEAMS.filter((t) => t.status === "On standby").length, []);

  function handleQuickDispatch(team) {
    setDispatchedId(team.id);
    setTimeout(() => {
      setDispatchedId(null);
    }, 4000);
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Emergency Response Force Operations"
        title="Live National Rescue Fleet Directory"
        subhead="Official Common Operating Picture (COP): Real-time multi-agency deployment tracking of National Disaster Response Force (NDRF), State SDRF units, Armed Forces HADR assets, and Certified Aapda Mitra responders."
      />

      {/* Real-time Fleet Operations Telemetry Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-8">
        <div className="rounded-2xl bg-gradient-to-br from-emerald-950/40 via-black/60 to-black/80 border border-emerald-400/30 p-4 shadow-lg shadow-black/40">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-300 font-semibold uppercase tracking-wider font-mono">
              Live In Field
            </span>
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
            </span>
          </div>
          <div className="mt-2 text-3xl font-display font-bold text-white">
            {deployedCount} <span className="text-sm font-normal text-white/60">Battalions</span>
          </div>
          <div className="mt-1 text-xs text-emerald-300/80">
            Actively engaged in relief & rescue missions
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-amber-950/40 via-black/60 to-black/80 border border-amber-400/30 p-4 shadow-lg shadow-black/40">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-300 font-semibold uppercase tracking-wider font-mono">
              High Readiness
            </span>
            <i className="fa-solid fa-clock-rotate-left text-amber-300 text-xs" />
          </div>
          <div className="mt-2 text-3xl font-display font-bold text-white">
            {standbyCount} <span className="text-sm font-normal text-white/60">Battalions</span>
          </div>
          <div className="mt-1 text-xs text-amber-300/80">
            15-minute scramble readiness notice
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-sky-950/40 via-black/60 to-black/80 border border-sky-400/30 p-4 shadow-lg shadow-black/40">
          <div className="flex items-center justify-between">
            <span className="text-xs text-sky-300 font-semibold uppercase tracking-wider font-mono">
              Total Responders
            </span>
            <i className="fa-solid fa-users text-sky-300 text-xs" />
          </div>
          <div className="mt-2 text-3xl font-display font-bold text-white">
            {totalPersonnel} <span className="text-sm font-normal text-white/60">Personnel</span>
          </div>
          <div className="mt-1 text-xs text-sky-300/80">
            Specialized command, divers & paramedics
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-purple-950/40 via-black/60 to-black/80 border border-purple-400/30 p-4 shadow-lg shadow-black/40">
          <div className="flex items-center justify-between">
            <span className="text-xs text-purple-300 font-semibold uppercase tracking-wider font-mono">
              Avg Dispatch Time
            </span>
            <i className="fa-solid fa-bolt text-purple-300 text-xs" />
          </div>
          <div className="mt-2 text-3xl font-display font-bold text-white">
            11.4 <span className="text-sm font-normal text-white/60">Minutes</span>
          </div>
          <div className="mt-1 text-xs text-purple-300/80">
            Via Automated Hermes Tactical Bridge
          </div>
        </div>
      </div>

      {/* Citizen Guardian Radar & Automated Dispatch Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-sky-950/40 via-black/60 to-emerald-950/30 border border-sky-400/30 p-4 sm:p-5 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-start gap-3.5">
          <span className="p-3 rounded-xl bg-sky-500/10 border border-sky-400/25 text-sky-300 text-lg shrink-0 mt-0.5">
            <i className="fa-solid fa-tower-broadcast animate-pulse" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-semibold text-white text-base">
                Autonomous Multi-Agency Dispatch Integration
              </h2>
              <span className="text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Connected
              </span>
            </div>
            <p className="text-xs text-white/70 mt-1 leading-relaxed max-w-3xl">
              All <strong>{TEAMS.length} live rescue battalions</strong> in this directory receive automated telemetry alerts from RAKSHAK’s <strong>Citizen Guardian Radar</strong>. When Doppler radar confirms a severe flash flood or landslide hazard in any monitored corridor, GPS coordinates and evacuation orders are instantly radio-dispatched to the closest response unit in parallel with SMS alerts to registered citizens.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/alert-setup"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 text-xs font-semibold transition shadow-lg shadow-sky-500/10"
          >
            <span>Simulate Citizen Dispatch</span>
            <i className="fa-solid fa-arrow-right text-[10px]" />
          </Link>
        </div>
      </div>

      {/* Comprehensive Filter Controls */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-4 mb-8 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search bar */}
          <div className="relative flex-1">
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 text-xs" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by battalion name, location (e.g. Mangaluru, Wayanad), equipment, or specialty..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-black/60 border border-white/15 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-sky-400/50"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>

          {/* State Filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="team-state-filter" className="text-xs text-white/60 whitespace-nowrap">
              <i className="fa-solid fa-location-dot mr-1" /> State:
            </label>
            <select
              id="team-state-filter"
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              style={{ colorScheme: "dark" }}
              className="rounded-xl bg-black/60 border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-400/50 cursor-pointer"
            >
              {allStates.map((s) => (
                <option key={s} value={s} className="bg-neutral-900 text-white">
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="team-status-filter" className="text-xs text-white/60 whitespace-nowrap">
              <i className="fa-solid fa-circle-notch mr-1" /> Status:
            </label>
            <select
              id="team-status-filter"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{ colorScheme: "dark" }}
              className="rounded-xl bg-black/60 border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-400/50 cursor-pointer"
            >
              {STATUSES.map((st) => (
                <option key={st} value={st} className="bg-neutral-900 text-white">
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Agency Filter Pills */}
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/10">
          {AGENCIES.map((ag) => {
            const isSelected = selectedAgency === ag;
            const count = ag === "All Agencies" ? TEAMS.length : TEAMS.filter((t) => t.agency === ag).length;
            return (
              <button
                key={ag}
                type="button"
                onClick={() => setSelectedAgency(ag)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-sky-500 text-white shadow-md shadow-sky-500/20"
                    : "bg-white/5 hover:bg-white/10 text-white/70 border border-white/10"
                }`}
              >
                <span>{ag}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isSelected ? "bg-black/30 text-white" : "bg-white/10 text-white/50"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Showing count */}
      <div className="flex items-center justify-between mb-4 px-1 text-xs text-white/60">
        <div>
          Showing <strong>{filteredTeams.length}</strong> of <strong>{TEAMS.length}</strong> operational rescue units
          {selectedState !== "All States" && <span> in <strong>{selectedState}</strong></span>}
          {selectedAgency !== "All Agencies" && <span> under <strong>{selectedAgency}</strong></span>}
        </div>
        {(selectedState !== "All States" || selectedAgency !== "All Agencies" || selectedStatus !== "All Statuses" || searchQuery) && (
          <button
            type="button"
            onClick={() => {
              setSelectedAgency("All Agencies");
              setSelectedState("All States");
              setSelectedStatus("All Statuses");
              setSearchQuery("");
            }}
            className="text-sky-400 hover:underline flex items-center gap-1"
          >
            <i className="fa-solid fa-rotate-left text-[10px]" /> Reset Filters
          </button>
        )}
      </div>

      {/* Teams Grid */}
      {filteredTeams.length === 0 ? (
        <div className="rounded-2xl bg-white/5 border border-white/10 p-12 text-center text-white/50">
          <i className="fa-solid fa-triangle-exclamation text-3xl mb-3 text-amber-400/80" />
          <p className="text-base text-white">No rescue units match the selected filters.</p>
          <p className="text-xs mt-1">Try selecting “All Agencies” or “All States” to view the complete fleet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTeams.map((team) => {
            const isDispatched = dispatchedId === team.id;
            return (
              <div
                key={team.id}
                className="rounded-2xl bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-white/10 hover:border-white/20 p-5 transition flex flex-col justify-between shadow-xl relative overflow-hidden group"
              >
                {/* Top Bar */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <span className={`text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded-md border ${AGENCY_BADGE_STYLE[team.agency] || "bg-white/10 text-white/80"}`}>
                      {team.agency}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium rounded-full border px-2.5 py-0.5 ${STATUS_STYLE[team.status] || "bg-white/10 text-white/70"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${team.status === "Deployed" ? "bg-emerald-400 animate-ping" : "bg-amber-400"}`} />
                      {team.status}
                    </span>
                  </div>

                  <h3 className="font-display font-semibold text-lg text-white group-hover:text-sky-300 transition">
                    {team.name}
                  </h3>

                  <div className="flex items-center gap-2 mt-1 text-xs text-white/60">
                    <span className="inline-flex items-center gap-1 text-white/80">
                      <i className="fa-solid fa-location-dot text-rose-400" />
                      <strong>{team.base}</strong>
                    </span>
                    <span>·</span>
                    <span className="text-white/50">{team.state}</span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-white/10 space-y-2 text-xs">
                    <div>
                      <span className="text-white/50 block text-[11px] uppercase tracking-wider">Mission Specialty</span>
                      <p className="text-white/90 font-medium mt-0.5">{team.specialty}</p>
                    </div>

                    <div>
                      <span className="text-white/50 block text-[11px] uppercase tracking-wider">Active Mission Telemetry</span>
                      <p className="text-white/70 text-[11px] mt-0.5 leading-relaxed bg-black/40 border border-white/5 rounded-lg p-2">
                        {team.activeMission}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1 text-white/60">
                      <span>
                        <i className="fa-solid fa-user-shield mr-1 text-white/40" />
                        {team.commander}
                      </span>
                      <span className="font-mono bg-white/10 px-2 py-0.5 rounded text-white/80">
                        {team.personnel} personnel
                      </span>
                    </div>

                    <div className="pt-1">
                      <span className="text-white/50 block text-[10px] uppercase tracking-wider mb-1">Assigned Equipment</span>
                      <div className="flex flex-wrap gap-1">
                        {team.equipment.slice(0, 3).map((eq, i) => (
                          <span key={i} className="text-[10px] bg-white/5 border border-white/10 text-white/70 px-1.5 py-0.5 rounded">
                            {eq}
                          </span>
                        ))}
                        {team.equipment.length > 3 && (
                          <span className="text-[10px] text-white/40 px-1 py-0.5">
                            +{team.equipment.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveModalTeam(team)}
                    className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <i className="fa-solid fa-circle-info text-[11px]" />
                    <span>Details & Comms</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDispatch(team)}
                    disabled={isDispatched}
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer ${
                      isDispatched
                        ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/30 animate-pulse"
                        : "bg-white/10 hover:bg-white/20 text-white border border-white/15"
                    }`}
                  >
                    <i className={`fa-solid ${isDispatched ? "fa-check" : "fa-tower-broadcast text-sky-400"}`} />
                    <span>{isDispatched ? "Dispatched!" : "Trigger Alert"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Team Details & Communications Modal */}
      {activeModalTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="rounded-2xl bg-neutral-900 border border-white/20 p-6 max-w-lg w-full shadow-2xl relative">
            <button
              type="button"
              onClick={() => setActiveModalTeam(null)}
              className="absolute top-4 right-4 text-white/50 hover:text-white text-base"
              aria-label="Close"
            >
              <i className="fa-solid fa-xmark" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded border ${AGENCY_BADGE_STYLE[activeModalTeam.agency] || "bg-white/10"}`}>
                {activeModalTeam.agency}
              </span>
              <span className={`text-[11px] rounded-full border px-2.5 py-0.5 ${STATUS_STYLE[activeModalTeam.status]}`}>
                {activeModalTeam.status}
              </span>
            </div>

            <h3 className="font-display font-semibold text-xl text-white">
              {activeModalTeam.name}
            </h3>
            <p className="text-xs text-white/60 mt-0.5">
              Base: {activeModalTeam.base} · {activeModalTeam.state}
            </p>

            <div className="mt-4 space-y-3 text-xs bg-white/5 border border-white/10 rounded-xl p-4">
              <div>
                <strong className="text-white/50 block uppercase text-[10px] tracking-wider">Officer-in-Charge / Commander:</strong>
                <span className="text-white text-sm font-medium">{activeModalTeam.commander}</span>
              </div>

              <div>
                <strong className="text-white/50 block uppercase text-[10px] tracking-wider">Mission Specialty:</strong>
                <span className="text-white/90">{activeModalTeam.specialty}</span>
              </div>

              <div>
                <strong className="text-white/50 block uppercase text-[10px] tracking-wider">Active Tactical Task:</strong>
                <span className="text-white/80 leading-relaxed block">{activeModalTeam.activeMission}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                <div>
                  <strong className="text-white/50 block uppercase text-[10px] tracking-wider">Emergency Hotline:</strong>
                  <a href={`tel:${activeModalTeam.hotline.split("/")[0].trim()}`} className="text-emerald-300 font-mono font-semibold hover:underline">
                    <i className="fa-solid fa-phone mr-1" />
                    {activeModalTeam.hotline}
                  </a>
                </div>
                <div>
                  <strong className="text-white/50 block uppercase text-[10px] tracking-wider">Tactical Radio Frequency:</strong>
                  <span className="text-sky-300 font-mono font-semibold block">
                    <i className="fa-solid fa-walkie-talkie mr-1" />
                    {activeModalTeam.radioFreq}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10">
                <strong className="text-white/50 block uppercase text-[10px] tracking-wider mb-1.5">Full Deployable Inventory:</strong>
                <ul className="list-disc list-inside space-y-1 text-white/80">
                  {activeModalTeam.equipment.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveModalTeam(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  handleQuickDispatch(activeModalTeam);
                  setActiveModalTeam(null);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
              >
                <i className="fa-solid fa-satellite-dish" />
                <span>Simulate Emergency Dispatch</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
