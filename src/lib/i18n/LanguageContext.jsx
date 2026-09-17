import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { TRANSLATIONS } from "./translations";
import { DEFAULT_LANGUAGE, LANGUAGES } from "./languages";

const STORAGE_KEY = "response.language";
const LanguageContext = createContext(null);

function detectInitialLanguage() {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && TRANSLATIONS[saved]) return saved;
  } catch {
    // localStorage can throw in private-browsing/lockdown modes — ignore
    // and fall through to browser-language detection.
  }
  // Best-effort: if the browser reports a language we support (e.g. a
  // phone set to Hindi), start there instead of always defaulting to
  // English. Still falls back safely if not.
  const nav = window.navigator?.language?.slice(0, 2);
  if (nav && TRANSLATIONS[nav]) return nav;
  return DEFAULT_LANGUAGE;
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(detectInitialLanguage);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // Ignore write failures (private browsing etc.) — language still
      // works for the current session via React state.
    }
    document.documentElement.lang = language;
  }, [language]);

  function setLanguage(code) {
    if (TRANSLATIONS[code]) setLanguageState(code);
  }

  // t(key) looks up `key` in the active language, then falls back to
  // English, then to the key itself so a typo never renders "undefined".
  function t(key) {
    return (
      TRANSLATIONS[language]?.[key] ?? TRANSLATIONS[DEFAULT_LANGUAGE]?.[key] ?? key
    );
  }

  const value = useMemo(
    () => ({ language, setLanguage, t, languages: LANGUAGES }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage() must be used inside <LanguageProvider>");
  }
  return ctx;
}
