// Supported UI languages. `name` is shown in the switcher in that
// language's own script (so a Hindi speaker sees "हिन्दी", not "Hindi"),
// which is standard practice for language pickers.
//
// To add another Indian language later: add a row here, then add a
// matching top-level block to translations.js with the same keys as
// the `en` block. Any key you don't translate yet just falls back to
// English automatically — see LanguageContext.jsx.
export const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "hi", name: "हिन्दी" },
  { code: "kn", name: "ಕನ್ನಡ" },
  { code: "ta", name: "தமிழ்" },
  { code: "te", name: "తెలుగు" },
  { code: "bn", name: "বাংলা" },
  { code: "mr", name: "मराठी" },
  { code: "ml", name: "മലയാളം" },
];

export const DEFAULT_LANGUAGE = "en";
