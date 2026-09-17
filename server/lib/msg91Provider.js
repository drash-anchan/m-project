// Real MSG91 integration for SMS alerts.
//
// Why MSG91 for SMS rather than Twilio
// ------------------------------------
// India's TRAI/DLT regime means every commercial SMS has to be sent from a
// registered 6-character Sender ID belonging to a registered Principal Entity,
// against a pre-approved content template. Indian carriers routinely filter or
// drop messages that don't satisfy that, which is exactly what happens to
// Twilio's default US/virtual long codes and alphanumeric sender IDs. MSG91 is
// India-based and DLT-native, so a disaster alert sent through it actually
// lands on Indian handsets — and it's substantially cheaper per SMS at volume.
//
// Twilio is still used for the outbound AI voice call (see twilioProvider.js),
// because its programmable-voice + TTS story is the stronger of the two. That
// split — SMS via MSG91, voice via Twilio — is what this server implements.
//
// No SDK is needed: MSG91's API is plain HTTPS + JSON, and Node 18+ ships
// global fetch. Docs: https://docs.msg91.com/reference/send-sms
//
// Two send paths are supported, because which one you need depends on how your
// MSG91 account is set up:
//
//   1. Flow API (v5) — used when MSG91_TEMPLATE_ID is set. This is the current
//      recommended endpoint and the DLT-correct one: your approved template
//      carries a variable, and the alert text is injected into it. Set
//      MSG91_MESSAGE_VAR to whatever you named that variable (commonly VAR1).
//
//   2. sendsms (v2) — used when no template ID is configured. Accepts fully
//      free-form text, which is what you want while testing, on international
//      routes, or on accounts still using the legacy API. On a DLT-enforced
//      Indian route, free-form text can be scrubbed by the carrier, and that
//      is a carrier decision this code cannot work around — hence path 1.

const FLOW_URL = "https://control.msg91.com/api/v5/flow/";
const SENDSMS_URL = "https://api.msg91.com/api/v2/sendsms";
const REQUEST_TIMEOUT_MS = Number(process.env.MSG91_TIMEOUT_MS || 12000);

/** True when there are enough env vars to attempt a real MSG91 send. */
export function isConfigured() {
  return Boolean(process.env.MSG91_AUTHKEY && process.env.MSG91_AUTHKEY.trim());
}

/** Which of the two send paths a real send would take right now. */
export function describe() {
  return {
    provider: "msg91",
    configured: isConfigured(),
    mode: process.env.MSG91_TEMPLATE_ID ? "flow-v5-template" : "sendsms-v2-freetext",
    senderId: process.env.MSG91_SENDER || null,
    templateId: process.env.MSG91_TEMPLATE_ID || null,
  };
}

function authKey() {
  const key = (process.env.MSG91_AUTHKEY || "").trim();
  if (!key) {
    throw new Error(
      "MSG91_AUTHKEY is not set. Copy server/.env.example to server/.env and add your MSG91 auth key (MSG91 dashboard > Settings > API)."
    );
  }
  return key;
}

// MSG91 wants bare digits with the country code and no "+".
function toMsg91Mobile(e164) {
  return String(e164).replace(/[^\d]/g, "");
}

async function postJson(url, body) {
  if (typeof fetch !== "function") {
    throw new Error(
      "global fetch is unavailable — this server needs Node 18 or newer (check `node --version`)."
    );
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
        authkey: authKey(),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error(`MSG91 did not respond within ${REQUEST_TIMEOUT_MS} ms.`);
    }
    throw new Error(`Could not reach MSG91: ${err.message}`);
  } finally {
    clearTimeout(timer);
  }

  const raw = await res.text();
  let data;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { message: raw };
  }

  // MSG91 signals failure two different ways: a non-2xx status, or a 200 with
  // {"type":"error"}. Both have to be treated as failures, otherwise a
  // rejected send would be reported to the user as delivered.
  if (!res.ok) {
    throw new Error(msg91Error(data) || `MSG91 returned HTTP ${res.status}.`);
  }
  if (String(data.type || "").toLowerCase() === "error") {
    throw new Error(msg91Error(data) || "MSG91 rejected the request.");
  }
  return data;
}

function msg91Error(data) {
  if (!data) return "";
  if (typeof data.message === "string" && data.message) return `MSG91: ${data.message}`;
  if (data.message && typeof data.message === "object") {
    return `MSG91: ${JSON.stringify(data.message)}`;
  }
  if (data.errors) return `MSG91: ${JSON.stringify(data.errors)}`;
  return "";
}

/**
 * Send a real SMS through MSG91.
 * Returns the same shape as the Twilio/mock providers so callers don't care
 * which one they got: { sid, status, provider, ... }.
 */
export async function sendSms({ to, body }) {
  // Check the auth key first. It's the one credential both send paths need, so
  // failing on it up front gives the operator the most fundamental problem
  // rather than a confusing "sender ID missing" when nothing is configured.
  authKey();

  const mobile = toMsg91Mobile(to);
  const templateId = (process.env.MSG91_TEMPLATE_ID || "").trim();

  if (templateId) {
    const varName = (process.env.MSG91_MESSAGE_VAR || "VAR1").trim();
    const data = await postJson(FLOW_URL, {
      template_id: templateId,
      short_url: 0,
      realTimeResponse: 1,
      recipients: [{ mobiles: mobile, [varName]: body }],
    });
    return {
      sid: String(data.message || data.request_id || "msg91-flow"),
      status: "queued",
      provider: "msg91",
      api: "flow-v5",
      templateId,
    };
  }

  const sender = (process.env.MSG91_SENDER || "").trim();
  if (!sender) {
    throw new Error(
      "MSG91_SENDER is not set. Add your DLT-approved 6-character sender ID (e.g. RKSHAK) to server/.env, or set MSG91_TEMPLATE_ID to use the Flow API instead."
    );
  }
  const payload = {
    sender,
    // Route 4 = transactional. Disaster warnings are transactional, not
    // promotional, which also means they can reach DND-registered numbers.
    route: (process.env.MSG91_ROUTE || "4").trim(),
    country: (process.env.MSG91_COUNTRY || "91").trim(),
    sms: [{ message: body, to: [mobile] }],
  };
  if (process.env.MSG91_DLT_TE_ID) {
    payload.DLT_TE_ID = process.env.MSG91_DLT_TE_ID.trim();
  }
  const data = await postJson(SENDSMS_URL, payload);
  return {
    sid: String(data.message || "msg91-sendsms"),
    status: "queued",
    provider: "msg91",
    api: "sendsms-v2",
    sender,
  };
}

// Deliberately not implemented: MSG91 does sell a voice/OBD product, but it is
// an add-on with a separate approval flow and no TTS story comparable to
// Twilio's <Say>. The AI voice call therefore goes through Twilio. Exporting a
// throwing stub would only invite a confusing runtime error, so the dispatcher
// simply never routes voice here.
export const supports = { sms: true, voice: false };
