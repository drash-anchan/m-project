import { Link } from "react-router-dom";
import { useLanguage } from "../lib/i18n/LanguageContext";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Header({ onOpenMenu, warning }) {
  const { t } = useLanguage();

  return (
    <header className="fixed top-0 inset-x-0 z-40 h-16 flex items-center justify-between px-5 sm:px-8 bg-black/75 border-b border-white/[0.08] backdrop-blur-xl shadow-lg shadow-black/40">
      {/* Brand logo & wordmark */}
      <Link to="/" className="flex items-center gap-3 group">
        <div className="relative">
          <img
            src="/assets/logo.svg"
            alt="Rakshak logo"
            className="h-9 w-9 rounded-full ring-1 ring-white/20 group-hover:ring-white/40 transition"
          />
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-black" />
        </div>
        <div className="flex flex-col">
          <span className="font-display text-xl sm:text-2xl font-bold tracking-wider text-white group-hover:text-white/90 transition">
            {t("common.brand")}
          </span>
          <span className="text-[9px] font-mono tracking-widest uppercase text-white/40 -mt-1 hidden sm:inline">
            National Disaster Intelligence
          </span>
        </div>
      </Link>

      {/* Right Corner: Minimal Status + Language + 3-Line Menu Button */}
      <div className="flex items-center gap-3">
        {/* Subtle AI Status indicator in header */}
        <Link
          to="/early-warning"
          className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs text-white/70 hover:text-white transition"
          title="AI Early Warning Status"
        >
          <span
            className={`h-2 w-2 rounded-full shrink-0 ${
              warning?.unavailable
                ? "bg-white/40"
                : warning?.prediction?.primary_level === "EXTREME" ||
                  warning?.prediction?.primary_level === "HIGH"
                ? "bg-red-400 animate-pulse"
                : warning?.prediction?.primary_level === "MODERATE"
                ? "bg-amber-400"
                : "bg-emerald-400"
            }`}
          />
          <span className="text-[11px] font-mono">
            {warning?.unavailable
              ? "Early Warning"
              : warning?.prediction
              ? `${warning.prediction.primary_level}`
              : "Normal"}
          </span>
        </Link>

        {/* Minimal Language Switcher */}
        <div className="hidden sm:block">
          <LanguageSwitcher />
        </div>

        {/* 3-LINE CORNER HAMBURGER MENU (Minimalism Design) */}
        <button
          onClick={onOpenMenu}
          className="group relative flex flex-col items-center justify-center w-10 h-10 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] hover:border-white/30 transition-all duration-200 cursor-pointer focus:outline-none"
          aria-label="Open navigation menu"
          title="Open all sections"
        >
          {/* 3 clean minimal lines */}
          <span className="w-5 h-[2px] rounded-full bg-white/90 group-hover:bg-white group-hover:w-5 transition-all duration-200 mb-1.5" />
          <span className="w-5 h-[2px] rounded-full bg-white/90 group-hover:bg-white group-hover:w-4 transition-all duration-200 mb-1.5" />
          <span className="w-5 h-[2px] rounded-full bg-white/90 group-hover:bg-white group-hover:w-5 transition-all duration-200" />
        </button>
      </div>
    </header>
  );
}
