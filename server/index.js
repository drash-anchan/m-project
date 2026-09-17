// RAKSHAK — Alerts Backend (SMS + AI voice call)
//
// This is the piece the frontend's siteConfig.js / alertSystem.js talk to. It
// exists because actually sending an SMS or placing a phone call to a number
// the user typed in requires a paid telecom provider and a secret API key —
// which must never live in browser JavaScript, since anyone could open devtools
// and steal it / run up your bill.
//
// Channel split (see lib/dispatcher.js for the reasoning):
//   SMS       -> MSG91   (India DLT-registered sender IDs; Indian carriers
//                         filter non-DLT senders, so Twilio SMS to +91 is
//                         unreliable in practice)
//   AI call   -> Twilio  (programmable voice + Polly TTS)
//
// Fill in server/.env (see .env.example) and the "Send SMS" / "Trigger AI call"
// buttons in /alert-setup will reach a real phone. With no credentials the
// server still runs, but every send is simulated and clearly labelled as such —
// it never claims to have delivered something it didn't.

import "dotenv/config";
import express from "express";
import cors from "cors";
import { normalizeIndianPhone } from "./lib/phone.js";
import * as mockProvider from "./lib/mockProvider.js";
import {
  smsChannel,
  voiceChannel,
  overallMode,
  status as dispatcherStatus,
  hintFor,
  msg91Configured,
  twilioConfigured,
} from "./lib/dispatcher.js";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Same list as src/siteConfig.js EMERGENCY_HELPLINES, kept here too so a
// backend-only client (or the AI-call helpline bridge) doesn't need the
// frontend bundle. Source: india.gov.in/directory/helpline, NDMA.
// All Indian national short codes — this backend does not dial out of India.
const EMERGENCY_HELPLINES = [
  { id: "112", number: "112", name: "112 — National Emergency Number (ERSS)" },
  { id: "100", number: "100", name: "Police" },
  { id: "101", number: "101", name: "Fire & Rescue" },
  { id: "108", number: "108", name: "Ambulance / Emergency Medical" },
  { id: "1070", number: "1070", name: "NDMA — Disaster Management Helpline" },
  { id: "1078", number: "1078", name: "NDMA Control Room" },
  { id: "1091", number: "1091", name: "Women's Helpline (Police)" },
  { id: "181", number: "181", name: "Women Helpline (National)" },
  { id: "1098", number: "1098", name: "Child Helpline" },
  { id: "1930", number: "1930", name: "Cyber Crime Helpline" },
];

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "RAKSHAK Alerts Backend",
    scope: "India only (+91 destinations, Indian helpline short codes)",
    // `mode` is kept at the top level for backwards compatibility with the
    // existing frontend banners: "live", "demo", or "partial" when only one
    // of the two channels has real credentials.
    ...dispatcherStatus(),
    msg91Configured: msg91Configured(),
    twilioConfigured: twilioConfigured(),
  });
});

app.get("/api/demo-log", (_req, res) => {
  // The log is only ever written by the mock provider, so return it whenever
  // there is anything in it — with the SMS/voice split, one channel can be
  // simulated while the other is live.
  res.json({ mode: overallMode(), log: mockProvider.getDemoLog() });
});

app.get("/api/helplines", (_req, res) => {
  res.json({ helplines: EMERGENCY_HELPLINES });
});

// POST /api/send-sms  { to: "+919876543210" | "9876543210", message: "..." }
// Sends a real SMS via MSG91 to the given number — not to this server, and not
// back to the browser. normalizeIndianPhone enforces a +91 destination.
app.post("/api/send-sms", async (req, res) => {
  const { to, message } = req.body || {};
  const phone = normalizeIndianPhone(to);
  if (!phone.valid) {
    return res.status(400).json({ error: phone.error });
  }
  if (!message || !message.trim()) {
    return res.status(400).json({ error: "Message text is required." });
  }

  const channel = smsChannel();
  try {
    const result = await channel.provider.sendSms({ to: phone.e164, body: message.trim() });
    res.json({
      ok: true,
      to: phone.e164,
      mode: overallMode(),
      channel: "sms",
      provider: channel.name,
      simulated: channel.simulated,
      providerNote: channel.reason,
      ...result,
    });
  } catch (err) {
    res.status(502).json({
      error: err.message || "Failed to send SMS.",
      provider: channel.name,
      hint: hintFor("sms", channel.name),
    });
  }
});

// POST /api/ai-call  { to: "+919876543210", message: "...", helplineNumber?: "108" }
// Places a real outbound Twilio call to `to` that speaks `message` via
// text-to-speech, then bridges into `helplineNumber` if provided.
app.post("/api/ai-call", async (req, res) => {
  const { to, message, helplineNumber } = req.body || {};
  const phone = normalizeIndianPhone(to);
  if (!phone.valid) {
    return res.status(400).json({ error: phone.error });
  }
  if (!message || !message.trim()) {
    return res.status(400).json({ error: "Message text is required." });
  }

  let dialTarget = null;
  if (helplineNumber) {
    const known = EMERGENCY_HELPLINES.find((h) => h.number === helplineNumber);
    if (!known) {
      return res.status(400).json({ error: "Unknown helpline number." });
    }
    dialTarget = known.number;
  }

  const channel = voiceChannel();
  try {
    const result = await channel.provider.placeAiCall({
      to: phone.e164,
      message: message.trim(),
      helplineNumber: dialTarget,
    });
    res.json({
      ok: true,
      to: phone.e164,
      mode: overallMode(),
      channel: "voice",
      provider: channel.name,
      simulated: channel.simulated,
      providerNote: channel.reason,
      connectedTo: dialTarget,
      ...result,
    });
  } catch (err) {
    res.status(502).json({
      error: err.message || "Failed to place call.",
      provider: channel.name,
      hint: hintFor("voice", channel.name),
    });
  }
});

app.listen(PORT, () => {
  const s = dispatcherStatus();
  console.log(`RAKSHAK alerts backend listening on http://localhost:${PORT}`);
  console.log(
    `  SMS   -> ${s.sms.provider}${s.sms.simulated ? " (simulated)" : ""} — ${s.sms.reason}`
  );
  console.log(
    `  Call  -> ${s.voice.provider}${s.voice.simulated ? " (simulated)" : ""} — ${s.voice.reason}`
  );
  if (s.mode !== "live") {
    console.log(
      "  Simulated sends are logged at GET /api/demo-log. Fill in server/.env (MSG91_AUTHKEY for SMS, TWILIO_* for the AI call) to dispatch for real."
    );
  }
});
