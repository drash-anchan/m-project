// Real Twilio integration for SMS + outbound "AI voice call" alerts.
// Twilio's trial + paid accounts can both send to Indian (+91) numbers;
// a trial account can only call/text numbers you've verified in the
// Twilio console first — see server/README.md.

import twilio from "twilio";

function getClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    throw new Error(
      "TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN are not set. Copy server/.env.example to server/.env and fill in your Twilio credentials."
    );
  }
  return twilio(sid, token);
}

export async function sendSms({ to, body }) {
  const from = process.env.TWILIO_SMS_FROM;
  if (!from) {
    throw new Error("TWILIO_SMS_FROM is not set in server/.env.");
  }
  const client = getClient();
  const message = await client.messages.create({ to, from, body });
  return { sid: message.sid, status: message.status, provider: "twilio" };
}

// Places a real outbound phone call that speaks `message` aloud via
// text-to-speech (Twilio's <Say> verb — Amazon Polly voices under the
// hood), then — if a helpline number is given — automatically bridges
// the call into that emergency helpline, so the person doesn't have to
// hang up and redial mid-emergency. Built as inline TwiML (no public
// webhook URL required), which is why the "press 1 to connect" version
// isn't included: multi-step Gather flows need a second URL Twilio can
// call back into, which means hosting this server somewhere reachable
// from the internet (Render/Railway/Fly.io/your own VPS all work).
export async function placeAiCall({ to, message, helplineNumber, voice = "Polly.Aditi" }) {
  const from = process.env.TWILIO_VOICE_FROM || process.env.TWILIO_SMS_FROM;
  if (!from) {
    throw new Error("TWILIO_VOICE_FROM (or TWILIO_SMS_FROM) is not set in server/.env.");
  }
  const client = getClient();

  const response = new twilio.twiml.VoiceResponse();
  response.say({ voice, language: "en-IN" }, message);
  if (helplineNumber) {
    response.pause({ length: 1 });
    response.say(
      { voice, language: "en-IN" },
      "Connecting you now to the emergency helpline. Please stay on the line."
    );
    response.dial(helplineNumber);
  }

  const call = await client.calls.create({
    to,
    from,
    twiml: response.toString(),
  });
  return { sid: call.sid, status: call.status, provider: "twilio" };
}

// --- Why Twilio still handles SMS here even though MSG91 is the default ---
// SMS is routed to MSG91 by lib/dispatcher.js (India's DLT rules mean a
// non-Indian sender ID gets filtered by carriers — see msg91Provider.js).
// sendSms() above is kept as a working fallback for two real cases: an
// operator who has Twilio credentials but no MSG91 account yet, and sending
// to a non-Indian test number during development. Set SMS_PROVIDER=twilio in
// server/.env to force it.
export const supports = { sms: true, voice: true };
