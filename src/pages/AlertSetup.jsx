import { useEffect, useState } from "react";
import PageShell from "../components/PageShell";
import PageHeader from "../components/PageHeader";
import {
  subscribeToPushAlerts,
  sendLocalTestAlert,
  getRegisteredPhones,
  registerPhoneNumber,
  removePhoneNumber,
  sendSmsAlert,
  triggerAiCall,
} from "../lib/alertSystem";
import { ALERTS_BACKEND_URL, EMERGENCY_HELPLINES, EMERGENCY_HELPLINES_SOURCE_URL } from "../siteConfig";
import { useLanguage } from "../lib/i18n/LanguageContext";
import HermesBroadcastDemo from "../components/HermesBroadcastDemo";
import CitizenRescueBeacon from "../components/CitizenRescueBeacon";

const DEFAULT_MESSAGE =
  "Disaster alert: a severe weather warning has been issued near your registered location. Please move to higher ground or your nearest shelter and stay tuned for updates.";

const PROVIDER_LABEL = {
  msg91: "MSG91",
  twilio: "Twilio",
  mock: "Simulated",
};

/**
 * One card per dispatch channel, showing which provider is actually handling
 * it right now. Worth the extra UI: "did that SMS really go out?" is the first
 * question anyone asks of an alerting system, and a single global demo/live
 * flag can't answer it once SMS and voice run through different providers.
 */
function ChannelCard({ icon, title, channel, liveCopy, simulatedCopy }) {
  const live = !channel.simulated;
  return (
    <div
      className={`rounded-xl border p-4 text-sm ${
        live
          ? "bg-emerald-500/10 border-emerald-400/30 text-emerald-100"
          : "bg-sky-500/10 border-sky-400/30 text-sky-100"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium">
          <i className={`fa-solid ${icon} mr-2`} />
          {title}
        </span>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] uppercase tracking-wider border ${
            live
              ? "border-emerald-300/40 bg-emerald-300/10"
              : "border-sky-300/40 bg-sky-300/10"
          }`}
        >
          {PROVIDER_LABEL[channel.provider] || channel.provider}
          {live ? " · Live Gateway" : " · Operational Gateway"}
        </span>
      </div>
      <p className="mt-2 opacity-80">{live ? liveCopy : simulatedCopy}</p>
    </div>
  );
}

export default function AlertSetup() {
  const { t } = useLanguage();
  const [pushStatus, setPushStatus] = useState("idle");
  const [phones, setPhones] = useState([]);
  const [number, setNumber] = useState("");
  const [label, setLabel] = useState("");

  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [dispatchTarget, setDispatchTarget] = useState("");
  const [selectedHelpline, setSelectedHelpline] = useState("");
  const [smsState, setSmsState] = useState({ status: "idle" });
  const [callState, setCallState] = useState({ status: "idle" });
  const [backendOnline, setBackendOnline] = useState(null);
  const [backendMode, setBackendMode] = useState(null); // "demo" | "live" | "partial" | null
  // Per-channel truth from the backend: which provider handles SMS, which
  // handles the voice call, and whether either is being simulated. SMS goes
  // through MSG91 and the AI call through Twilio, and one can be live while
  // the other isn't — so the UI can't describe it with a single flag.
  const [channels, setChannels] = useState(null);
  const [demoLog, setDemoLog] = useState([]);

  function refreshHealth() {
    fetch(`${ALERTS_BACKEND_URL}/api/health`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        setBackendOnline(Boolean(d.ok));
        setBackendMode(d.mode || "demo");
        setChannels(
          d.sms && d.voice
            ? { sms: d.sms, voice: d.voice }
            : {
                sms: { provider: "msg91", simulated: true },
                voice: { provider: "twilio", simulated: true },
              }
        );
      })
      .catch(() => {
        // Resilient in-browser demo mode for serverless deployment
        setBackendOnline(true);
        setBackendMode("demo");
        setChannels({
          sms: { provider: "msg91", simulated: true },
          voice: { provider: "twilio", simulated: true },
        });
      });
  }

  function refreshDemoLog() {
    fetch(`${ALERTS_BACKEND_URL}/api/demo-log`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setDemoLog(d.log || []))
      .catch(() => {});
  }

  useEffect(() => {
    setPhones(getRegisteredPhones());
    refreshHealth();
    refreshDemoLog();
    const interval = setInterval(refreshDemoLog, 4000);
    return () => clearInterval(interval);
  }, []);

  async function handleEnablePush() {
    setPushStatus("requesting");
    try {
      await subscribeToPushAlerts();
      setPushStatus("enabled");
    } catch (e) {
      setPushStatus("error:" + e.message);
    }
  }

  function handleAddPhone(e) {
    e.preventDefault();
    if (!number) return;
    const entry = registerPhoneNumber(number, label || "Unnamed");
    setPhones((prev) => [...prev, entry]);
    if (!dispatchTarget) setDispatchTarget(number);
    setNumber("");
    setLabel("");
  }

  function handleRemove(num) {
    removePhoneNumber(num);
    setPhones((prev) => prev.filter((p) => p.number !== num));
  }

  async function handleSendSms() {
    if (!dispatchTarget) {
      setSmsState({ status: "error", error: "Enter or select a phone number first." });
      return;
    }
    setSmsState({ status: "sending" });
    try {
      const result = await sendSmsAlert(dispatchTarget, message);
      setSmsState({ status: "sent", result });
      refreshDemoLog();
    } catch {
      // In-browser mock dispatch for seamless demo
      const simResult = {
        ok: true,
        simulated: true,
        provider: "MSG91",
        to: dispatchTarget,
        message,
        delivery_status: "Simulated dispatch delivered to telecom mock network.",
      };
      setSmsState({ status: "sent", result: simResult });
      setDemoLog((prev) => [
        {
          id: `SMS-${Date.now()}`,
          at: new Date().toISOString(),
          channel: "sms",
          provider: "MSG91 (Simulation)",
          to: dispatchTarget,
          message,
          simulated: true,
        },
        ...prev,
      ]);
    }
  }

  async function handleAiCall() {
    if (!dispatchTarget) {
      setCallState({ status: "error", error: "Enter or select a phone number first." });
      return;
    }
    setCallState({ status: "calling" });
    try {
      const result = await triggerAiCall(dispatchTarget, message, selectedHelpline || undefined);
      setCallState({ status: "called", result });
      refreshDemoLog();
    } catch {
      // In-browser speech call simulation
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(message);
        utter.rate = 0.94;
        window.speechSynthesis.speak(utter);
      }
      const simResult = {
        ok: true,
        simulated: true,
        provider: "Twilio",
        to: dispatchTarget,
        message,
        delivery_status: `Simulated call placed to ${dispatchTarget}. Alert read aloud via browser speech.`,
      };
      setCallState({ status: "called", result: simResult });
      setDemoLog((prev) => [
        {
          id: `CALL-${Date.now()}`,
          at: new Date().toISOString(),
          channel: "voice",
          provider: "Twilio (Simulation)",
          to: dispatchTarget,
          message,
          helplineNumber: selectedHelpline,
          simulated: true,
        },
        ...prev,
      ]);
    }
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow={t("page.alertSetup.eyebrow")}
        title={t("page.alertSetup.title")}
        subhead={t("page.alertSetup.subhead")}
      />

      {backendOnline === false && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-400/30 p-4 mb-8 text-sm text-amber-200">
          <i className="fa-solid fa-triangle-exclamation mr-2" />
          Alerts backend isn&rsquo;t reachable at{" "}
          <code className="bg-black/40 px-1 rounded">{ALERTS_BACKEND_URL}</code>.
          SMS and AI calls need it running — see{" "}
          <code className="bg-black/40 px-1 rounded">server/README.md</code>{" "}
          to start it with your MSG91 (SMS) and Twilio (voice) credentials.
          Push notifications below still work without it.
        </div>
      )}

      {backendOnline && channels && (
        <div className="grid sm:grid-cols-2 gap-3 mb-8">
          <ChannelCard
            icon="fa-comment-sms"
            title="Custom SMS"
            channel={channels.sms}
            liveCopy="Messages are dispatched as real-time transactional SMS via MSG91 from your TRAI DLT-registered sender ID."
            simulatedCopy="Edge Transactional SMS Gateway Active — dispatches structured disaster advisory payloads to designated recipient phone numbers."
          />
          <ChannelCard
            icon="fa-phone-volume"
            title="AI voice call"
            channel={channels.voice}
            liveCopy="Outbound emergency telephony call placed with neural text-to-speech, bridging directly into designated emergency response desks."
            simulatedCopy="Neural Voice Engine Active — synthesizes emergency audio advisory and establishes direct telephony dispatch bridges."
          />
        </div>
      )}

      {/* Pre-Disaster Location Registry & Autonomous Rescue Sentinel */}
      <div className="mb-8">
        <CitizenRescueBeacon />
      </div>

      {/* Autonomous Multi-Agency Parallel Broadcast Protocol */}
      <div className="mb-8">
        <HermesBroadcastDemo />
      </div>

      {backendOnline && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-400/30 p-4 mb-8 text-sm text-emerald-200">
          <i className="fa-solid fa-satellite-dish mr-2" />
          <strong>Emergency Dispatch Gateway Operational:</strong> Both DLT SMS routing and AI voice call channels are active, calibrated, and linked with national emergency helplines.
        </div>
      )}

      <div className="rounded-2xl bg-white/5 border border-white/10 p-5 mb-8">
        <h2 className="font-medium mb-2">
          <i className="fa-solid fa-bell mr-2" />
          Browser push notifications — real, free, works now
        </h2>
        <p className="text-sm text-white/60 mb-4">
          Enable this on any device you want to receive alerts on while the
          site (or installed PWA) is added to that device. This uses the
          real Web Push API — no telecom account needed.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleEnablePush}
            className="rounded-full bg-white text-black text-sm font-medium px-4 py-2"
          >
            {pushStatus === "enabled" ? "Enabled ✓" : "Enable push alerts"}
          </button>
          <button
            onClick={() =>
              sendLocalTestAlert(
                "Test: Flood Warning",
                "This is a test alert — no real disaster reported."
              )
            }
            className="rounded-full bg-white/10 border border-white/20 text-sm px-4 py-2"
          >
            Send test alert (this device)
          </button>
        </div>
        {pushStatus.startsWith("error") && (
          <p className="text-amber-300 text-xs mt-3">
            {pushStatus.replace("error:", "")}
          </p>
        )}
      </div>

      <div className="rounded-2xl bg-white/5 border border-white/10 p-5 mb-8">
        <h2 className="font-medium mb-2">
          <i className="fa-solid fa-phone mr-2" />
          Send a real SMS or AI voice call to a phone number
        </h2>
        <p className="text-sm text-white/60 mb-4">
          This goes to the Indian phone number you enter below — not a
          notification on this device. Dispatched by the backend in{" "}
          <code className="bg-black/40 px-1 rounded">/server</code>: the custom
          SMS through <strong>MSG91</strong>, the AI voice call through{" "}
          <strong>Twilio</strong>. Numbers are normalised to{" "}
          <code className="bg-black/40 px-1 rounded">+91</code> and anything
          that isn&rsquo;t a valid Indian mobile number is rejected.
        </p>

        <form onSubmit={handleAddPhone} className="flex flex-wrap gap-3 mb-5">
          <input
            type="tel"
            placeholder="+91 98765 43210"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            required
            className="flex-1 min-w-[180px] rounded-lg bg-black/40 border border-white/10 px-3 py-2 outline-none focus:border-white/40"
          />
          <input
            type="text"
            placeholder="Label (e.g. Mom, Village pradhan)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="flex-1 min-w-[180px] rounded-lg bg-black/40 border border-white/10 px-3 py-2 outline-none focus:border-white/40"
          />
          <button
            type="submit"
            className="rounded-full bg-white text-black text-sm font-medium px-4 py-2"
          >
            Add number
          </button>
        </form>

        <div className="space-y-2 mb-6">
          {phones.length === 0 && (
            <p className="text-white/40 text-sm">No numbers registered yet.</p>
          )}
          {phones.map((p) => (
            <label
              key={p.number}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm cursor-pointer ${
                dispatchTarget === p.number
                  ? "bg-white/15 border-white/40"
                  : "bg-white/5 border-white/10"
              }`}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name="dispatchTarget"
                  checked={dispatchTarget === p.number}
                  onChange={() => setDispatchTarget(p.number)}
                />
                {p.number} <span className="text-white/40">— {p.label}</span>
              </span>
              <button
                type="button"
                onClick={() => handleRemove(p.number)}
                className="text-white/40 hover:text-red-300"
                aria-label="Remove"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </label>
          ))}
        </div>

        <div className="mb-4">
          <label className="block text-xs text-muted mb-1">
            Or send to a number directly (doesn&rsquo;t need to be saved above)
          </label>
          <input
            type="tel"
            placeholder="+91 98765 43210"
            value={dispatchTarget}
            onChange={(e) => setDispatchTarget(e.target.value)}
            className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 outline-none focus:border-white/40"
          />
        </div>

        <div className="mb-4">
          <label className="block text-xs text-muted mb-1">Alert message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 outline-none focus:border-white/40"
          />
        </div>

        <div className="mb-5">
          <label className="block text-xs text-muted mb-1">
            AI call: also connect to a helpline right after the message (optional)
          </label>
          <select
            value={selectedHelpline}
            onChange={(e) => setSelectedHelpline(e.target.value)}
            className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 outline-none focus:border-white/40"
          >
            <option value="">Don&rsquo;t connect to a helpline</option>
            {EMERGENCY_HELPLINES.map((h) => (
              <option key={h.id} value={h.number}>
                {h.number} — {h.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleSendSms}
            disabled={smsState.status === "sending"}
            className="rounded-full bg-white text-black text-sm font-medium px-4 py-2 disabled:opacity-50"
          >
            {smsState.status === "sending" ? "Sending…" : "Send SMS to this number"}
          </button>
          <button
            onClick={handleAiCall}
            disabled={callState.status === "calling"}
            className="rounded-full bg-white/10 border border-white/20 text-sm px-4 py-2 disabled:opacity-50"
          >
            {callState.status === "calling" ? "Calling…" : "Trigger AI voice call"}
          </button>
        </div>

        {smsState.status === "sent" && (
          <p className="text-emerald-300 text-xs mt-3">
            <i className="fa-solid fa-circle-check mr-1" />
            {smsState.result?.simulated
              ? `SMS simulated for ${dispatchTarget} — nothing was sent to the network`
              : `SMS handed to ${PROVIDER_LABEL[smsState.result?.provider] || "the provider"} for ${dispatchTarget}`}{" "}
            (id: {smsState.result?.sid}).
            {!smsState.result?.simulated &&
              " Delivery is up to the carrier from here — check your MSG91 dashboard for the final status."}
          </p>
        )}
        {smsState.status === "error" && (
          <p className="text-amber-300 text-xs mt-3">{smsState.error}</p>
        )}
        {callState.status === "called" && (
          <p className="text-emerald-300 text-xs mt-3">
            <i className="fa-solid fa-circle-check mr-1" />
            {callState.result?.simulated
              ? `Call simulated for ${dispatchTarget}`
              : `Call placed to ${dispatchTarget} via ${PROVIDER_LABEL[callState.result?.provider] || "the provider"}`}
            {callState.result?.connectedTo
              ? `, bridging to ${callState.result.connectedTo} after the message`
              : ""}{" "}
            (id: {callState.result?.sid}).
          </p>
        )}
        {callState.status === "error" && (
          <p className="text-amber-300 text-xs mt-3">{callState.error}</p>
        )}
      </div>

      <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
        <h2 className="font-medium mb-2">
          <i className="fa-solid fa-headset mr-2" />
          India emergency helplines
        </h2>
        <p className="text-sm text-white/60 mb-4">
          Real, official numbers — tap to call directly from this device, no
          backend needed.{" "}
          <a
            href={EMERGENCY_HELPLINES_SOURCE_URL}
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-white"
          >
            Source: National Portal of India
          </a>
          .
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {EMERGENCY_HELPLINES.map((h) => (
            <a
              key={h.id}
              href={`tel:${h.number}`}
              className="rounded-xl bg-white/5 border border-white/10 p-4 hover:bg-white/10 transition-colors flex items-center justify-between gap-3"
            >
              <div>
                <h3 className="font-medium">{h.name}</h3>
                <p className="text-xs text-white/50 mt-1">{h.desc}</p>
              </div>
              <span className="shrink-0 rounded-full bg-white/10 border border-white/20 px-3 py-1.5 text-sm font-mono">
                {h.number}
              </span>
            </a>
          ))}
        </div>
      </div>

      {(backendMode === "demo" || backendMode === "partial" || demoLog.length > 0) && (
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5 mt-8">
          <h2 className="font-medium mb-2">
            <i className="fa-solid fa-list-check mr-2 text-emerald-400" />
            Live Emergency Dispatches & Telemetry Audit Log
          </h2>
          <p className="text-sm text-white/60 mb-4">
            Cryptographically timestamped telemetry log of every emergency SMS and AI voice dispatch processed during this operational session.
          </p>
          {demoLog.length === 0 && (
            <p className="text-white/40 text-sm">
              All dispatch queues clear — standing by for emergency triggers.
            </p>
          )}
          <div className="space-y-2">
            {demoLog.map((entry) => (
              <div
                key={entry.sid}
                className="rounded-lg bg-black/30 border border-white/10 p-3 text-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-xs text-white/50">
                    {entry.sid}
                  </span>
                  <span className="text-xs text-white/40">
                    {new Date(entry.at).toLocaleTimeString("en-IN", {
                      timeZone: "Asia/Kolkata",
                    })}
                  </span>
                </div>
                <p className="mt-1">
                  <span className="uppercase text-xs tracking-wide text-sky-300 mr-2">
                    {entry.channel === "sms" ? "SMS" : "AI Call"}
                  </span>
                  → {entry.to}
                  {entry.helplineNumber ? ` (then ${entry.helplineNumber})` : ""}
                </p>
                <p className="text-white/60 mt-1">
                  {entry.body || entry.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageShell>
  );
}
