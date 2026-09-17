import { useEffect, useRef, useState } from "react";

export default function TermsConsentModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    try {
      const accepted = localStorage.getItem("rakshak_terms_accepted");
      if (accepted !== "true") {
        setIsOpen(true);
      }
    } catch {
      setIsOpen(true);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  function handleScroll() {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    // When user reaches within 25px of bottom
    if (scrollHeight - scrollTop - clientHeight <= 25) {
      setHasScrolledToBottom(true);
    }
  }

  function handleAccept() {
    if (!agreed || !hasScrolledToBottom) return;
    try {
      localStorage.setItem("rakshak_terms_accepted", "true");
      localStorage.setItem("rakshak_terms_accepted_at", new Date().toISOString());
    } catch {
      /* ignore */
    }
    setIsOpen(false);
  }

  function scrollToBottomDirectly() {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-reveal">
      <div className="w-full max-w-2xl rounded-2xl border border-sky-400/30 bg-neutral-950/95 shadow-2xl shadow-black/80 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-white/10 bg-gradient-to-r from-sky-950/40 via-black to-black flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-300 text-lg shrink-0">
              <i className="fa-solid fa-shield-halved" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-mono tracking-widest text-sky-400 font-semibold">
                  Official Terms & Statutory Guidelines
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white/70 border border-white/10">
                  DPDP-2023
                </span>
              </div>
              <h2 className="text-lg font-display text-white mt-0.5">
                RAKSHAK Emergency Intelligence Platform
              </h2>
            </div>
          </div>
        </div>

        {/* Scrollable Terms Content */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="p-6 overflow-y-auto space-y-4 text-xs text-white/80 leading-relaxed max-h-[48vh] scroll-smooth"
        >
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-400/30 text-amber-200">
            <div className="flex items-start gap-2.5">
              <i className="fa-solid fa-triangle-exclamation text-amber-300 mt-0.5 text-sm shrink-0" />
              <div>
                <strong className="block text-white font-semibold text-xs mb-1">
                  1. Statutory Authority & Decision-Support Disclaimer
                </strong>
                RAKSHAK is an independent emergency coordination and disaster intelligence platform. All predictive hazard scores, Doppler telemetry, and algorithmic tripwires are designed strictly for <strong>situational awareness and decision support</strong>. They do not supersede statutory evacuation orders issued by the <strong>National Disaster Management Authority (NDMA)</strong>, <strong>India Meteorological Department (IMD)</strong>, or respective State (SDMA) and District (DDMA) authorities under the <strong>Disaster Management Act, 2005</strong>.
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
            <strong className="block text-white font-semibold text-xs mb-1">
              2. Citizen Guardian Radar & Emergency Dispatches
            </strong>
            <p>
              Pre-disaster location registration is stored locally on-device and queued into district emergency registries. In the event of confirmed disaster triggers, RAKSHAK automatically executes parallel notifications to registered citizen devices via TRAI DLT-compliant SMS, and shares coordinates with first responders (NDRF, local police, and hospital casualty triage desks).
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
            <strong className="block text-white font-semibold text-xs mb-1">
              3. Data Privacy & Digital Personal Data Protection (DPDP) Act, 2023
            </strong>
            <ul className="list-disc list-inside space-y-1 text-white/70 mt-1">
              <li><strong>Local Geolocation:</strong> Browser GPS coordinates are processed on-device solely to route to the nearest relief shelter and are never sold or tracked.</li>
              <li><strong>Offline Resilience:</strong> In zero-network scenarios, the RuView Mesh protocol pulses simulated local beacons without cloud transmission.</li>
              <li><strong>Public Ledger Integrity:</strong> Relief fund donations are recorded transparently with SHA-256 cryptographic hashes, supporting anonymous or pseudonymous donor handles.</li>
            </ul>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
            <strong className="block text-white font-semibold text-xs mb-1">
              4. Open Scientific Data Attribution
            </strong>
            <p className="text-white/70">
              The platform integrates open public scientific feeds from the United States Geological Survey (USGS), Global Disaster Alert and Coordination System (GDACS), Open-Meteo high-resolution models, and OpenStreetMap basemaps under respective open attribution guidelines.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-black/40 border border-white/10 text-[11px] text-white/50 text-center font-mono">
            — End of Terms & Conditions —
          </div>
        </div>

        {/* Scroll Progress Indicator Bar */}
        <div className="px-6 py-2 bg-neutral-900 border-t border-white/10 flex items-center justify-between text-xs">
          {!hasScrolledToBottom ? (
            <button
              type="button"
              onClick={scrollToBottomDirectly}
              className="text-amber-300 hover:text-amber-200 flex items-center gap-1.5 transition text-[11px] font-medium"
            >
              <i className="fa-solid fa-arrow-down animate-bounce text-[10px]" />
              <span>Scroll to bottom to review complete terms</span>
            </button>
          ) : (
            <span className="text-emerald-400 flex items-center gap-1.5 text-[11px] font-medium">
              <i className="fa-solid fa-circle-check" />
              <span>You have reviewed the terms in full</span>
            </span>
          )}
          <span className="text-[10px] text-white/40 font-mono">
            Required Step 1 of 2
          </span>
        </div>

        {/* Agreement Checkbox & Accept Footer */}
        <div className="p-6 bg-black border-t border-white/10 shrink-0 space-y-4">
          <label
            className={`flex items-start gap-3 text-xs cursor-pointer select-none transition ${
              !hasScrolledToBottom ? "opacity-40 cursor-not-allowed" : "text-white/90"
            }`}
          >
            <input
              type="checkbox"
              disabled={!hasScrolledToBottom}
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded bg-neutral-900 border-white/30 text-emerald-500 focus:ring-emerald-400 cursor-pointer disabled:cursor-not-allowed"
            />
            <span>
              I have read, understood, and agree to the <strong>RAKSHAK Emergency Terms of Use</strong>, the statutory NDMA decision-support disclaimer, and the DPDP-compliant data handling policy.
            </span>
          </label>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <span className="text-[11px] text-white/50">
              One-time acknowledgement. You can re-read these terms anytime on the <span className="text-white/70 font-semibold">/terms</span> page.
            </span>
            <button
              type="button"
              onClick={handleAccept}
              disabled={!hasScrolledToBottom || !agreed}
              className={`rounded-xl px-6 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-lg ${
                hasScrolledToBottom && agreed
                  ? "bg-emerald-400 hover:bg-emerald-300 text-black shadow-emerald-400/25 cursor-pointer scale-100 hover:scale-[1.02]"
                  : "bg-white/10 text-white/40 border border-white/10 cursor-not-allowed"
              }`}
            >
              <i className="fa-solid fa-check" />
              <span>Accept & Enter RAKSHAK</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
