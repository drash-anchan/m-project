// Demo-mode provider — simulates SMS + AI voice calls without touching
// Twilio at all. Built for demoing (e.g. SIH judging) without needing a
// paid account: Twilio trial accounts block ALL custom SMS text and
// custom voice TwiML, which makes live demos of a disaster-alert app
// impossible on a free tier. This mirrors the exact same request/response
// shape as the real Twilio provider, so switching to real sending later
// (once the account is upgraded) needs zero frontend changes — just flip
// DEMO_MODE off in server/.env.
//
// Every simulated send is logged in-memory (see demoLog below) so the
// judges/reviewers can see a live "Recent Demo Sends" feed on
// /alert-setup and trust the flow actually ran end-to-end, not just a
// silent no-op.

const demoLog = [];
const MAX_LOG = 50;

function fakeSid(prefix) {
  const chars = "0123456789abcdef";
  let s = prefix;
  for (let i = 0; i < 32; i++) s += chars[Math.floor(Math.random() * 16)];
  return s;
}

function record(entry) {
  demoLog.unshift({ ...entry, at: new Date().toISOString() });
  if (demoLog.length > MAX_LOG) demoLog.length = MAX_LOG;
}

// Small artificial delay so the UI's "Sending…" / "Calling…" states are
// visible during a live demo, instead of resolving instantly.
function delay(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

export async function sendSms({ to, body }) {
  await delay(600);
  const sid = fakeSid("SMxxDEMO");
  record({ channel: "sms", to, body, sid, status: "simulated-delivered", wouldUse: "msg91" });
  return { sid, status: "simulated-delivered", demo: true, provider: "mock", wouldUse: "msg91" };
}

export async function placeAiCall({ to, message, helplineNumber }) {
  await delay(900);
  const sid = fakeSid("CAxxDEMO");
  record({
    channel: "ai-call",
    to,
    message,
    helplineNumber: helplineNumber || null,
    sid,
    status: "simulated-completed",
    wouldUse: "twilio",
  });
  return {
    sid,
    status: "simulated-completed",
    demo: true,
    provider: "mock",
    wouldUse: "twilio",
  };
}

export function getDemoLog() {
  return demoLog;
}
