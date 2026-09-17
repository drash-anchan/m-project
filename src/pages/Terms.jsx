import PageShell from "../components/PageShell";
import PageHeader from "../components/PageHeader";
import { useLanguage } from "../lib/i18n/LanguageContext";

export default function Terms() {
  const { t } = useLanguage();

  return (
    <PageShell>
      <PageHeader
        eyebrow={t("page.terms.eyebrow")}
        title={t("page.terms.title")}
        subhead={t("page.terms.subhead")}
      />

      <div className="space-y-6 text-sm text-white/80 leading-relaxed">
        <section className="rounded-2xl bg-white/5 border border-white/10 p-6">
          <div className="flex items-center gap-2 text-amber-300 font-semibold mb-3">
            <i className="fa-solid fa-triangle-exclamation text-base" />
            <h2 className="text-lg font-display text-white">1. Decision-Support & Statutory Authority Disclaimer</h2>
          </div>
          <p>
            RAKSHAK (&ldquo;the Platform&rdquo;) is an independent, prototype-stage disaster intelligence and emergency coordination software system. <strong>RAKSHAK is intended strictly for situational awareness and decision support.</strong>
          </p>
          <p className="mt-2.5 text-white/70">
            The outputs, hazard scores, and algorithmic predictions provided by this platform do not constitute official statutory evacuations, curfew declarations, or warnings under the <strong>Disaster Management Act, 2005</strong>. In all circumstances, citizens, responders, and administrative officers must follow directives issued by the <strong>National Disaster Management Authority (NDMA)</strong>, the <strong>India Meteorological Department (IMD)</strong>, and respective State (SDMA) and District (DDMA) Disaster Management Authorities.
          </p>
        </section>

        <section className="rounded-2xl bg-white/5 border border-white/10 p-6">
          <div className="flex items-center gap-2 text-emerald-300 font-semibold mb-3">
            <i className="fa-solid fa-shield-halved text-base" />
            <h2 className="text-lg font-display text-white">2. Telecom & TRAI DLT Compliance</h2>
          </div>
          <p>
            Emergency text messages dispatched through the platform leverage Indian Telecom Regulatory Authority of India (TRAI) Distributed Ledger Technology (DLT) registered routes (MSG91 Flow API Route 4 transactional gateway).
          </p>
          <ul className="list-disc list-inside mt-2.5 space-y-1 text-white/70">
            <li>Phone numbers registered in the Alert Setup module are stored with explicit user opt-in consent for emergency alerts only.</li>
            <li>Voice calls placed via text-to-speech are strictly non-commercial emergency advisories with auto-bridging to National Emergency Helplines (112, 108).</li>
            <li>No registered contact information is ever sold, rented, or utilized for commercial marketing.</li>
          </ul>
        </section>

        <section className="rounded-2xl bg-white/5 border border-white/10 p-6">
          <div className="flex items-center gap-2 text-cyan-300 font-semibold mb-3">
            <i className="fa-solid fa-user-lock text-base" />
            <h2 className="text-lg font-display text-white">3. Data Privacy & DPDP Act Alignment</h2>
          </div>
          <p>
            In accordance with India&rsquo;s <strong>Digital Personal Data Protection (DPDP) Act, 2023</strong>:
          </p>
          <ul className="list-disc list-inside mt-2.5 space-y-1 text-white/70">
            <li><strong>Cryptographic Ledger Anonymity:</strong> Relief fund donations on the public SHA-256 ledger permit pseudonymous or anonymous donor handles while maintaining mathematical auditability.</li>
            <li><strong>Device-Local Storage:</strong> Map tile pre-caching and shelter coordinates reside strictly within the user&rsquo;s client-side browser Cache API and IndexedDB storage.</li>
            <li><strong>Geolocation Privacy:</strong> Browser location coordinates are processed on-device solely to calculate Haversine distance to nearest shelters and are never transmitted to third-party tracking networks.</li>
          </ul>
        </section>

        <section className="rounded-2xl bg-white/5 border border-white/10 p-6">
          <div className="flex items-center gap-2 text-purple-300 font-semibold mb-3">
            <i className="fa-solid fa-database text-base" />
            <h2 className="text-lg font-display text-white">4. Open Data Attribution & Third-Party Feeds</h2>
          </div>
          <p>
            RAKSHAK is grateful to and strictly complies with the terms of public-domain scientific and humanitarian data providers:
          </p>
          <div className="grid sm:grid-cols-2 gap-3 mt-3 text-xs">
            <div className="p-3 rounded-xl bg-black/40 border border-white/10">
              <strong className="text-white block">Open-Meteo & NASA POWER</strong>
              <span className="text-white/60">Numerical weather prediction models & solar/meteorological reanalysis series.</span>
            </div>
            <div className="p-3 rounded-xl bg-black/40 border border-white/10">
              <strong className="text-white block">United States Geological Survey (USGS)</strong>
              <span className="text-white/60">Public GeoJSON earthquake telemetry filtered geographically to India bounds.</span>
            </div>
            <div className="p-3 rounded-xl bg-black/40 border border-white/10">
              <strong className="text-white block">Global Disaster Alert & Coordination (GDACS)</strong>
              <span className="text-white/60">Joint UNEP/OCHA cyclone, flood, and geophysical event bulletins.</span>
            </div>
            <div className="p-3 rounded-xl bg-black/40 border border-white/10">
              <strong className="text-white block">OpenStreetMap & Esri World Imagery</strong>
              <span className="text-white/60">Community-contributed street basemaps & commercial high-resolution satellite tiles.</span>
            </div>
          </div>
        </section>

        <div className="pt-4 flex items-center justify-between text-xs text-white/50 border-t border-white/10">
          <span>Version: 2026.1 (DPDP-2023 & NDMA Aligned)</span>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem("rakshak_terms_accepted");
              localStorage.removeItem("rakshak_terms_accepted_at");
              window.location.reload();
            }}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-white/80 transition flex items-center gap-1.5"
          >
            <i className="fa-solid fa-rotate-left text-[10px]" />
            <span>Reset Consent & Re-open Modal</span>
          </button>
        </div>
      </div>
    </PageShell>
  );
}
