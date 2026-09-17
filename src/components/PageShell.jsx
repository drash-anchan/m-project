import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { EARLY_WARNING_API_URL, HEADER_STATUS_POLL_MS } from "../siteConfig";
import BackgroundVideo from "./BackgroundVideo";
import Header from "./Header";
import MobileMenu from "./MobileMenu";
import OfflineBanner from "./OfflineBanner";

export default function PageShell({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [warning, setWarning] = useState(null);
  const location = useLocation();
  const isHome = location.pathname === "/";

  useEffect(() => {
    let cancelled = false;
    let busy = false;
    // The Python backend serves this from a warm snapshot, so a few-second
    // poll costs it almost nothing and the status pill tracks the Early
    // Warning page instead of lagging it by up to five minutes.
    const load = async () => {
      if (busy) return;
      busy = true;
      try {
        const res = await fetch(`${EARLY_WARNING_API_URL}?location=manipal`);
        if (!res.ok) throw new Error("warning request failed");
        const json = await res.json();
        if (!cancelled) setWarning(json);
      } catch {
        if (!cancelled) setWarning({ unavailable: true });
      } finally {
        busy = false;
      }
    };
    load();
    const timer = setInterval(load, HEADER_STATUS_POLL_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, []);

  return (
    <div className="min-h-screen text-white">
      {/* Background rotating Earth is present across all tabs */}
      <BackgroundVideo />

      <Header onOpenMenu={() => setMenuOpen(true)} warning={warning} />
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <OfflineBanner />

      <main className="relative z-10 pt-24 pb-16 px-4 sm:px-8 max-w-6xl mx-auto">
        {!isHome ? (
          <div className="rounded-3xl bg-black/85 border border-white/10 backdrop-blur-2xl p-6 sm:p-10 shadow-2xl shadow-black/90">
            {children}
          </div>
        ) : (
          children
        )}
      </main>

      <footer className="relative z-10 border-t border-white/10 bg-black/60 backdrop-blur-md py-8 px-5 sm:px-8 text-xs text-white/50">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-display font-semibold text-white tracking-wide">RAKSHAK</span>
            <span>· Next-Gen Disaster Intelligence & Coordination Platform</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-white/70">
            <Link to="/strategy" className="hover:text-white transition">Vision & Strategy</Link>
            <Link to="/early-warning" className="hover:text-white transition">AI Early Warning</Link>
            <Link to="/terms" className="hover:text-white transition">Terms & Statutory Disclaimers</Link>
            <Link to="/resources" className="hover:text-white transition">Official Resources</Link>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-3 text-[11px] text-white/40 text-center sm:text-left">
          Decision-support prototype. In emergencies, strictly heed directives from NDMA (1078), Police (112), and State Disaster Management Authorities.
        </div>
      </footer>
    </div>
  );
}
