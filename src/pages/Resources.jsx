import PageShell from "../components/PageShell";
import PageHeader from "../components/PageHeader";
import { useLanguage } from "../lib/i18n/LanguageContext";

// Every entry here is a real, working, publicly reachable page — no
// placeholder or invented URLs. Grouped so the list stays scannable as
// it grows: official Indian agencies first (these are the authoritative
// warning sources), then Earth-observation portals, then the open
// research datasets and reference code this project's models draw on.
const RESOURCE_GROUPS = [
  {
    group: "Official Indian agencies — authoritative warnings",
    items: [
      {
        title: "NDMA — National Disaster Management Authority",
        url: "https://ndma.gov.in/",
        desc: "Official preparedness guidelines and current advisories for India.",
      },
      {
        title: "SACHET — NDMA's National Disaster Alert Portal",
        url: "https://sachet.ndma.gov.in/",
        desc: "Official, geo-targeted Common Alerting Protocol (CAP) warnings for India — the authoritative feed this app links out to.",
      },
      {
        title: "India Meteorological Department (IMD)",
        url: "https://mausam.imd.gov.in",
        desc: "Official weather forecasts, cyclone tracking, nowcasts and severe-weather warnings for India.",
      },
      {
        title: "Central Water Commission (CWC) — Flood Forecasting Services",
        url: "https://ffs.india-water.gov.in",
        desc: "River-level observations and official flood forecasts for India's major river basins.",
      },
      {
        title: "Geological Survey of India (GSI)",
        url: "https://www.gsi.gov.in",
        desc: "National landslide susceptibility mapping, geohazard bulletins and seismotectonic data.",
      },
      {
        title: "Indian Red Cross Society",
        url: "https://indianredcross.org/",
        desc: "Household emergency planning and disaster preparedness resources for India.",
      },
    ],
  },
  {
    group: "Earth observation & satellite data",
    items: [
      {
        title: "National Database for Emergency Management (NDEM) — NRSC",
        url: "https://www.nrsc.gov.in",
        desc: "ISRO/NRSC's geospatial emergency-management database: satellite-derived flood, cyclone and landslide inventories for India.",
      },
      {
        title: "ISRO Bhuvan",
        url: "https://bhuvan.nrsc.gov.in",
        desc: "India's national geoportal — disaster services, flood inundation layers, and free thematic map data.",
      },
      {
        title: "NASA Earthdata",
        url: "https://www.earthdata.nasa.gov",
        desc: "Open access to NASA's Earth-observation archives — precipitation (GPM/IMERG), soil moisture (SMAP) and land-cover products used for hazard modelling.",
      },
    ],
  },
  {
    group: "Open research datasets & reference implementations",
    items: [
      {
        title: "Google Research — Flood Forecasting",
        url: "https://github.com/google-research/google-research/tree/master/flood_forecasting",
        desc: "Reference code and papers behind Google's operational flood-forecasting models, including the LSTM-based river-stage approach deployed across India.",
      },
      {
        title: "Kodagu Landslide Inventory (2018 storm event, Western Ghats)",
        url: "https://github.com/Arpithaachaiah6/Landslide-inventory-for-the-2018-storm-event-of-Kodagu-in-the-Western-Ghats",
        desc: "Field-mapped landslide inventory for the 2018 Kodagu event — the closest open ground-truth dataset to this project's Kodagu/Wayanad risk locations.",
      },
      {
        title: "Earth System Science Data (ESSD) — rainfall-triggered landslide data",
        url: "https://essd.copernicus.org/articles/12/2899/2020/",
        desc: "Peer-reviewed, openly licensed ESSD dataset article used as a reference for rainfall-threshold and landslide-susceptibility methodology.",
      },
      {
        title: "USGS Earthquake Hazards Program",
        url: "https://earthquake.usgs.gov/",
        desc: "Real-time earthquake data (used on Live Alerts, filtered to India) and safety guidance.",
      },
      {
        title: "GDACS — Global Disaster Alert and Coordination System",
        url: "https://www.gdacs.org/",
        desc: "Free multi-hazard alerts: floods, cyclones, wildfires, earthquakes (used on Live Alerts, filtered to India).",
      },
    ],
  },
];

export default function Resources() {
  const { t } = useLanguage();
  return (
    <PageShell>
      <PageHeader
        eyebrow={t("page.resources.eyebrow")}
        title={t("page.resources.title")}
        subhead={t("page.resources.subhead")}
      />

      <div className="space-y-10">
        {RESOURCE_GROUPS.map((section) => (
          <section key={section.group}>
            <h2 className="font-display text-lg mb-1">{section.group}</h2>
            <div className="h-px bg-white/10 mb-4" />
            <div className="space-y-3">
              {section.items.map((r) => (
                <a
                  key={r.url}
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-xl bg-white/5 border border-white/10 p-4 hover:bg-white/10 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-medium">{r.title}</h3>
                    <i className="fa-solid fa-arrow-up-right-from-square text-xs text-white/30 mt-1.5 group-hover:text-white/70 transition-colors" />
                  </div>
                  <p className="text-sm text-white/60 mt-1">{r.desc}</p>
                  <p className="text-xs text-white/30 mt-2 font-mono break-all">
                    {r.url.replace(/^https?:\/\//, "")}
                  </p>
                </a>
              ))}
            </div>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
