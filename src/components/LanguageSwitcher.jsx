import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../lib/i18n/LanguageContext";

// Compact dropdown used in the desktop header. `MobileMenu` renders the
// same list inline instead (see there) since a nested dropdown inside
// the slide-down mobile panel is fiddly to tap correctly.
export default function LanguageSwitcher() {
  const { language, setLanguage, t, languages } = useLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const current = languages.find((l) => l.code === language) ?? languages[0];

  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t("common.selectLanguage")}
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 hover:bg-white/15 transition-colors px-3 py-1.5 text-sm text-white/85"
      >
        <i className="fa-solid fa-globe text-xs" />
        <span>{current.name}</span>
        <i className={`fa-solid fa-chevron-down text-[10px] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-40 rounded-xl bg-pilldark/95 border border-white/10 shadow-menu overflow-hidden z-50">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setLanguage(lang.code);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                lang.code === language
                  ? "bg-white/15 text-white"
                  : "text-white/75 hover:bg-white/10 hover:text-white"
              }`}
            >
              {lang.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
