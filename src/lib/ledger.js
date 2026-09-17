// --- Transparent Fund Ledger (demo) -----------------------------------
// This is NOT a real blockchain — there is no network of independent
// nodes, no consensus, and no real money moves through it yet. What it
// DOES give you, honestly:
//
//   - Every entry stores a SHA-256 hash of (its own data + the previous
//     entry's hash), exactly like a blockchain's linking mechanism.
//   - Anyone can call verifyChain() and it will detect if a single past
//     entry was edited, because every hash after that point breaks.
//   - The full ledger is readable by anyone who opens /donate — nothing
//     is hidden server-side.
//
// To make this a REAL decentralized ledger in production, swap the
// storage layer below for a cheap-gas chain (Polygon, Celo) or an
// append-only public database with the same hash-chaining — the UI and
// verifyChain() logic barely change.

const STORAGE_KEY = "disaster_platform_ledger_v1";

async function sha256(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function loadRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRaw(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

// Seed a few illustrative entries the first time so the page isn't empty.
async function seedIfEmpty() {
  const existing = loadRaw();
  if (existing.length > 0) return;

  const seedData = [
    { type: "donation", donor: "Anonymous", amountINR: 5000, note: "General relief fund" },
    { type: "disbursement", to: "Response Team — Coastal Unit 3", amountINR: 3200, note: "Fuel + generator rental, cyclone response" },
    { type: "donation", donor: "R. Shah", amountINR: 12000, note: "Earmarked: Kerala flood relief" },
    { type: "disbursement", to: "Kerala Flood Shelter Network", amountINR: 8000, note: "Dry ration kits (40 families)" },
  ];

  let prevHash = "GENESIS";
  const entries = [];
  for (const d of seedData) {
    const timestamp = new Date().toISOString();
    const payload = JSON.stringify({ ...d, timestamp, prevHash });
    const hash = await sha256(payload);
    entries.push({ ...d, timestamp, prevHash, hash });
    prevHash = hash;
  }
  saveRaw(entries);
}

export async function getLedger() {
  await seedIfEmpty();
  return loadRaw();
}

export async function addEntry(entry) {
  const entries = loadRaw();
  const prevHash = entries.length ? entries[entries.length - 1].hash : "GENESIS";
  const timestamp = new Date().toISOString();
  const payload = JSON.stringify({ ...entry, timestamp, prevHash });
  const hash = await sha256(payload);
  const full = { ...entry, timestamp, prevHash, hash };
  entries.push(full);
  saveRaw(entries);
  return full;
}

// Walks the whole chain and recomputes every hash to confirm nothing
// was tampered with after the fact. Returns { valid, brokenAtIndex }.
export async function verifyChain() {
  const entries = loadRaw();
  let prevHash = "GENESIS";
  for (let i = 0; i < entries.length; i++) {
    const { hash, ...rest } = entries[i];
    const recomputed = await sha256(JSON.stringify({ ...rest, prevHash }));
    if (recomputed !== hash || rest.prevHash !== prevHash) {
      return { valid: false, brokenAtIndex: i };
    }
    prevHash = hash;
  }
  return { valid: true, brokenAtIndex: -1 };
}

export function summarize(entries) {
  const totalDonated = entries
    .filter((e) => e.type === "donation")
    .reduce((s, e) => s + e.amountINR, 0);
  const totalDisbursed = entries
    .filter((e) => e.type === "disbursement")
    .reduce((s, e) => s + e.amountINR, 0);
  return { totalDonated, totalDisbursed, balance: totalDonated - totalDisbursed };
}
