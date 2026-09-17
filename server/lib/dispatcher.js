// Channel router: which provider actually handles an SMS vs a voice call.
//
// The product decision, spelled out because it isn't arbitrary:
//   SMS   -> MSG91  (India-native, DLT-registered sender IDs; Indian carriers
//                    filter non-DLT senders, so Twilio SMS to +91 is unreliable)
//   VOICE -> Twilio (programmable voice + Polly TTS, which MSG91 has no real
//                    equivalent of; this is the "AI call" in the UI)
//
// Anything unconfigured falls back to the mock provider rather than throwing,
// so the app is always demonstrable — but every response says which provider
// answered and whether it was simulated. Nothing is ever reported as "sent"
// when it wasn't.
//
// Resolution order per channel:
//   1. An explicit override: SMS_PROVIDER / VOICE_PROVIDER = msg91|twilio|mock
//   2. DEMO_MODE=true  -> mock everything (DEMO_MODE=false -> never mock)
//   3. Auto: use the preferred real provider if its credentials are present,
//      then the secondary one, else mock.

import * as twilioProvider from "./twilioProvider.js";
import * as msg91Provider from "./msg91Provider.js";
import * as mockProvider from "./mockProvider.js";

const PROVIDERS = {
  msg91: msg91Provider,
  twilio: twilioProvider,
  mock: mockProvider,
};

function flag(name) {
  return (process.env[name] || "").trim().toLowerCase();
}

function demoFlag() {
  const value = flag("DEMO_MODE");
  if (value === "true") return "force-demo";
  if (value === "false") return "force-live";
  return "auto";
}

export function twilioConfigured() {
  return Boolean(
    (process.env.TWILIO_ACCOUNT_SID || "").trim() &&
      (process.env.TWILIO_AUTH_TOKEN || "").trim()
  );
}

export function msg91Configured() {
  return msg91Provider.isConfigured();
}

/**
 * Decide the provider for one channel.
 * Returns { name, provider, simulated, reason }.
 */
function resolveChannel(channel) {
  const overrideVar = channel === "sms" ? "SMS_PROVIDER" : "VOICE_PROVIDER";
  const override = flag(overrideVar);
  if (override && PROVIDERS[override]) {
    if (override === "msg91" && channel === "voice") {
      return {
        name: "twilio",
        provider: twilioProvider,
        simulated: false,
        reason: `${overrideVar}=msg91 ignored: MSG91 is not used for voice in this project. Using Twilio.`,
      };
    }
    return {
      name: override,
      provider: PROVIDERS[override],
      simulated: override === "mock",
      reason: `${overrideVar}=${override}`,
    };
  }

  const demo = demoFlag();
  if (demo === "force-demo") {
    return {
      name: "mock",
      provider: mockProvider,
      simulated: true,
      reason: "DEMO_MODE=true — everything is simulated and logged at /api/demo-log.",
    };
  }

  // Preference order differs by channel: this is the MSG91-for-SMS,
  // Twilio-for-voice split.
  const order = channel === "sms" ? ["msg91", "twilio"] : ["twilio"];
  for (const name of order) {
    const configured = name === "msg91" ? msg91Configured() : twilioConfigured();
    if (configured) {
      return {
        name,
        provider: PROVIDERS[name],
        simulated: false,
        reason:
          name === "msg91"
            ? "MSG91 credentials found — SMS goes out through MSG91."
            : "Twilio credentials found.",
      };
    }
  }

  if (demo === "force-live") {
    // The operator explicitly asked for live sending, so don't silently
    // simulate — return the real provider and let it produce a precise
    // "credential X is missing" error the user can act on.
    const name = channel === "sms" ? "msg91" : "twilio";
    return {
      name,
      provider: PROVIDERS[name],
      simulated: false,
      reason: `DEMO_MODE=false but no ${name.toUpperCase()} credentials are set — this request will fail with a credential error rather than being simulated.`,
    };
  }

  return {
    name: "mock",
    provider: mockProvider,
    simulated: true,
    reason:
      channel === "sms"
        ? "No MSG91 or Twilio credentials found — SMS is simulated. Add MSG91_AUTHKEY to server/.env to send for real."
        : "No Twilio credentials found — the AI call is simulated. Add TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN to server/.env to place a real call.",
  };
}

export function smsChannel() {
  return resolveChannel("sms");
}

export function voiceChannel() {
  return resolveChannel("voice");
}

/** Overall mode, kept for the existing /api/health + frontend banners. */
export function overallMode() {
  const sms = smsChannel();
  const voice = voiceChannel();
  if (sms.simulated && voice.simulated) return "demo";
  if (!sms.simulated && !voice.simulated) return "live";
  return "partial";
}

/** Everything the frontend needs to describe the current setup honestly. */
export function status() {
  const sms = smsChannel();
  const voice = voiceChannel();
  return {
    mode: overallMode(),
    sms: {
      provider: sms.name,
      simulated: sms.simulated,
      reason: sms.reason,
      detail: sms.name === "msg91" ? msg91Provider.describe() : undefined,
    },
    voice: {
      provider: voice.name,
      simulated: voice.simulated,
      reason: voice.reason,
    },
    configured: {
      msg91: msg91Configured(),
      twilio: twilioConfigured(),
    },
    intent: {
      sms: "MSG91 (India DLT-registered sender IDs)",
      voice: "Twilio programmable voice with text-to-speech",
    },
  };
}

/** Provider-specific troubleshooting text, surfaced in the API error body. */
export function hintFor(channel, providerName) {
  if (providerName === "msg91") {
    return "Check server/.env has a valid MSG91_AUTHKEY plus either MSG91_TEMPLATE_ID (Flow API, DLT-approved template) or MSG91_SENDER (6-character DLT sender ID). MSG91 rejects sends from unapproved sender IDs and templates.";
  }
  if (providerName === "twilio") {
    return channel === "sms"
      ? "Check server/.env has valid TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_SMS_FROM, and that a trial account's destination number is verified in the Twilio console."
      : "Check server/.env has valid TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_VOICE_FROM. Twilio trial accounts cannot run custom voice TwiML, so upgrade the account for a real AI call.";
  }
  return "Running in simulated mode — see GET /api/demo-log for the simulated send.";
}
