import { useState } from "react";
import PageShell from "../components/PageShell";
import PageHeader from "../components/PageHeader";
import { useLanguage } from "../lib/i18n/LanguageContext";

export default function Login() {
  const { t } = useLanguage();
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    // No backend wired up — see README for what a real auth endpoint needs.
    setSubmitted(true);
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow={t("page.login.eyebrow")}
        title={t("page.login.title")}
        subhead={t("page.login.subhead")}
      />
      <div className="max-w-md rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md p-6">
        {submitted ? (
          <p className="text-white/80">
            <i className="fa-solid fa-circle-check text-emerald-400 mr-2" />
            This is a demo form — no account was created. Wire{" "}
            <code className="text-xs bg-black/40 px-1.5 py-0.5 rounded">
              handleSubmit
            </code>{" "}
            in <code className="text-xs">src/pages/Login.jsx</code> up to a
            real auth endpoint.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-muted mb-1">
                Agency email
              </label>
              <input
                type="email"
                required
                className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-white outline-none focus:border-white/40"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">
                Password
              </label>
              <input
                type="password"
                required
                className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-white outline-none focus:border-white/40"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-full bg-white text-black font-medium px-6 py-2.5 shadow-ctaglow hover:shadow-ctaglowhover transition-shadow"
            >
              Sign in
            </button>
          </form>
        )}
      </div>
    </PageShell>
  );
}
