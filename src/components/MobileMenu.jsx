import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useLanguage } from "../lib/i18n/LanguageContext";

// Grouped sections for the minimalist drawer navigation
const MENU_SECTIONS = [
  {
    title: "Crisis Intelligence & Resilience",
    icon: "fa-brain",
    links: [
      {
        to: "/cascading-failure-engine",
        labelKey: "nav.cascadingEngine",
        fallback: "Cascading Failures (30 Depts)",
        desc: "Predict multi-order domino collapses & waiting periods",
        badge: "AI Predictor",
        badgeColor: "red",
        icon: "fa-burst",
      },
      {
        to: "/resilience-network",
        labelKey: "nav.resilienceNetwork",
        fallback: "Resilience Network Studio",
        desc: "Interdependent infrastructure topology & SPOFs",
        icon: "fa-diagram-project",
      },
      {
        to: "/early-warning",
        labelKey: "nav.aiEarlyWarning",
        fallback: "AI Early Warning System",
        desc: "Isolation Forest anomaly engine & satellite fusion",
        icon: "fa-wave-square",
      },
    ],
  },
  {
    title: "Operational Field Response",
    icon: "fa-tower-broadcast",
    links: [
      {
        to: "/live-alerts",
        labelKey: "nav.liveAlerts",
        fallback: "Live Hazard Alerts",
        desc: "USGS & GDACS real-time feeds scoped to India",
        live: true,
        icon: "fa-triangle-exclamation",
      },
      {
        to: "/shelters",
        labelKey: "nav.shelters",
        fallback: "Evacuation Shelters & Map",
        desc: "Leaflet offline-cached map & nearest shelter routing",
        icon: "fa-map-location-dot",
      },
      {
        to: "/response-teams",
        labelKey: "nav.responseTeams",
        fallback: "Deployable Units & Fleets",
        desc: "Status and readiness tracking for rescue squads",
        icon: "fa-people-group",
      },
    ],
  },
  {
    title: "Citizen Services & Governance",
    icon: "fa-shield-halved",
    links: [
      {
        to: "/alert-setup",
        labelKey: "nav.alertSetup",
        fallback: "Alert Setup (SMS & Voice)",
        desc: "MSG91 Flow SMS & Twilio automated AI calling",
        icon: "fa-bell",
      },
      {
        to: "/donate",
        labelKey: "nav.donate",
        fallback: "Transparent Relief Ledger",
        desc: "Cryptographic SHA-256 tamper-evident funding chain",
        icon: "fa-hand-holding-heart",
      },
      {
        to: "/strategy",
        labelKey: "nav.strategy",
        fallback: "Strategy & Institutional Blueprint",
        desc: "Innovation criteria, feasibility, and gap analysis",
        icon: "fa-lightbulb",
      },
      {
        to: "/resources",
        labelKey: "nav.resources",
        fallback: "Statutory Resources & SOPs",
        desc: "NDMA, SACHET, IMD, and CWC official guides",
        icon: "fa-book-bookmark",
      },
    ],
  },
];

export default function MobileMenu({ open, onClose }) {
  const { pathname } = useLocation();
  const { t, language, setLanguage, languages } = useLanguage();

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Dimmed Backdrop with Blur */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity animate-overlayIn"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Sheet from Right (Works on all screen sizes) */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#090b10]/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl shadow-black/90 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto animate-slideDown">
          
          {/* Top Bar of the Drawer */}
          <div>
            <div className="flex items-center justify-between pb-5 border-b border-white/10 mb-6">
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-display font-bold text-white text-base tracking-wider">
                  RAKSHAK Directory
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-white/50 hidden sm:inline">
                  ESC to close
                </span>
              </div>

              <button
                onClick={onClose}
                className="h-9 w-9 rounded-xl bg-white/[0.06] hover:bg-white/[0.15] border border-white/10 text-white/70 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                aria-label="Close menu"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            {/* Home Quick Link */}
            <Link
              to="/"
              onClick={onClose}
              className={`flex items-center gap-3 p-3 rounded-2xl border transition-all mb-6 ${
                pathname === "/"
                  ? "bg-white text-black border-white font-semibold"
                  : "bg-white/[0.04] border-white/10 text-white/90 hover:bg-white/[0.08]"
              }`}
            >
              <div className="h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center text-sm">
                <i className="fa-solid fa-house" />
              </div>
              <div>
                <div className="text-sm font-semibold">Home Dashboard</div>
                <div className="text-[11px] opacity-70">Main command center & live overview</div>
              </div>
            </Link>

            {/* Categorized Navigation Sections */}
            <div className="space-y-6">
              {MENU_SECTIONS.map((section, sIdx) => (
                <div key={sIdx}>
                  <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-white/45 mb-2.5 px-1">
                    <i className={`fa-solid ${section.icon} text-[9px]`} />
                    <span>{section.title}</span>
                  </div>

                  <div className="space-y-1.5">
                    {section.links.map((link) => {
                      const active = pathname === link.to;
                      const label = t(link.labelKey) || link.fallback;
                      return (
                        <Link
                          key={link.to}
                          to={link.to}
                          onClick={onClose}
                          className={`group flex items-center justify-between p-3 rounded-xl border transition-all duration-150 ${
                            active
                              ? "bg-white/15 border-white/30 text-white font-medium shadow-md shadow-white/5"
                              : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.08] hover:border-white/15 text-white/80 hover:text-white"
                          }`}
                        >
                          <div className="flex items-center gap-3 truncate">
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs shrink-0 transition ${
                              active ? "bg-white text-black" : "bg-white/[0.06] text-white/70 group-hover:text-white"
                            }`}>
                              <i className={`fa-solid ${link.icon}`} />
                            </div>

                            <div className="truncate">
                              <div className="text-xs font-medium flex items-center gap-2">
                                <span className="truncate">{label}</span>
                                {link.badge && (
                                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                                    {link.badge}
                                  </span>
                                )}
                                {link.live && (
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                )}
                              </div>
                              <div className="text-[10px] text-white/45 truncate mt-0.5">
                                {link.desc}
                              </div>
                            </div>
                          </div>

                          <i className={`fa-solid fa-chevron-right text-[10px] transition-transform ${
                            active ? "text-white translate-x-0.5" : "text-white/20 group-hover:text-white/60 group-hover:translate-x-0.5"
                          }`} />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Drawer Footer: Language Picker & Emergency Helplines */}
          <div className="mt-8 pt-6 border-t border-white/10 space-y-4">
            {/* Language Chips */}
            <div>
              <p className="text-[10px] uppercase font-mono tracking-widest text-white/40 mb-2">
                {t("common.selectLanguage")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={`rounded-lg border px-2.5 py-1 text-xs transition-colors ${
                      lang.code === language
                        ? "bg-white text-black border-white font-semibold"
                        : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {lang.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Emergency Helplines */}
            <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between text-xs text-white/60">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-phone text-red-400" />
                <span>Emergency:</span>
              </div>
              <div className="flex items-center gap-3 font-mono font-bold text-white">
                <a href="tel:112" className="hover:text-red-400 transition">112 (National)</a>
                <span>&bull;</span>
                <a href="tel:1078" className="hover:text-red-400 transition">1078 (NDMA)</a>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
