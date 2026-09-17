// --- Three alert channels ---
//
// 1) Browser Push Notifications — REAL, free, works today, no telecom
//    account needed. Limitation: only reaches people who opened the
//    site/PWA at least once and granted permission, and only while
//    their device has any connectivity to receive the push. This is a
//    local, on-this-device notification — it is NOT a substitute for
//    actually texting/calling a phone number (see below).
//
// 2) SMS to a phone number — REAL, sent via the backend in /server
//    through MSG91, which is DLT-registered and therefore actually
//    lands on Indian handsets. This sends an actual text message to
//    whatever number you type in, not a notification on this device.
//
// 3) AI voice call — REAL, same backend, via Twilio: places an
//    outbound phone call that reads the alert aloud in Indian English
//    and can bridge straight into an emergency helpline (112, 108).
//
// (2) and (3) require the backend server to be running with real
// credentials — MSG91 for SMS, Twilio for voice, see server/README.md.
// Until then the backend answers in simulation mode and every response
// below carries `simulated: true` plus the provider it *would* have
// used, so the UI can say so plainly rather than pretending to succeed.
// A missing-credential failure comes back as a clear error naming the
// exact env var to set.

import { ALERTS_BACKEND_URL } from "../siteConfig";

const PHONE_STORAGE_KEY = "disaster_platform_phone_registry_v1";

export async function subscribeToPushAlerts() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Push notifications aren't supported in this browser.");
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission was not granted.");
  }
  const reg = await navigator.serviceWorker.ready;

  // NOTE: applicationServerKey (VAPID public key) must come from YOUR
  // backend once you stand one up — subscribing without it will work
  // for local testing/showNotification demos but won't receive pushes
  // from a real server until that key is wired in.
  // const sub = await reg.pushManager.subscribe({
  //   userVisibleOnly: true,
  //   applicationServerKey: VAPID_PUBLIC_KEY,
  // });

  return reg;
}

export function sendLocalTestAlert(title, body) {
  navigator.serviceWorker.ready.then((reg) => {
    reg.showNotification(title, {
      body,
      icon: "/assets/logo.svg",
      vibrate: [200, 100, 200, 100, 200],
      requireInteraction: true,
    });
  });
}

export function getRegisteredPhones() {
  try {
    return JSON.parse(localStorage.getItem(PHONE_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function registerPhoneNumber(number, label) {
  const list = getRegisteredPhones();
  const entry = { number, label, addedAt: new Date().toISOString() };
  const next = [...list, entry];
  localStorage.setItem(PHONE_STORAGE_KEY, JSON.stringify(next));
  return entry;
}

export function removePhoneNumber(number) {
  const next = getRegisteredPhones().filter((p) => p.number !== number);
  localStorage.setItem(PHONE_STORAGE_KEY, JSON.stringify(next));
}

async function parseBackendResponse(res) {
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const msg =
      data?.error ||
      `Backend returned ${res.status}. Is the server running at ${ALERTS_BACKEND_URL}?`;
    const hint = data?.hint ? ` ${data.hint}` : "";
    throw new Error(msg + hint);
  }
  return data;
}

// Sends a REAL SMS to `number` (not a local notification), via MSG91.
// Requires the backend in /server to be running with MSG91_AUTHKEY set;
// otherwise the reply carries simulated: true.
export async function sendSmsAlert(number, message) {
  const res = await fetch(`${ALERTS_BACKEND_URL}/api/send-sms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to: number, message }),
  });
  return parseBackendResponse(res);
}

// Places a REAL outbound call to `number` via Twilio that speaks
// `message` aloud, optionally bridging into an emergency helpline
// number (e.g. "108") right after. Requires the backend to be running.
export async function triggerAiCall(number, message, helplineNumber) {
  const res = await fetch(`${ALERTS_BACKEND_URL}/api/ai-call`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to: number, message, helplineNumber }),
  });
  return parseBackendResponse(res);
}

// Sends the SMS alert to every number in the local registry — useful
// for "notify all my registered contacts" style flows.
export async function broadcastSmsToRegistry(message) {
  const phones = getRegisteredPhones();
  const results = await Promise.allSettled(
    phones.map((p) => sendSmsAlert(p.number, message))
  );
  return phones.map((p, i) => ({ phone: p, result: results[i] }));
}
