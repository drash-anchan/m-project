# Disaster Response Platform

React + Vite + Tailwind CSS, multi-page site for a disaster-management /
emergency-response coordination platform, with React Router navigation,
a free live map, an offline-first service worker, and a transparent
donation ledger.

## Setup

```bash
npm install
npm run dev
```

Open the local URL Vite prints (usually `http://localhost:5173`).
Note: geolocation, offline caching, and push notifications need HTTPS
or `localhost` to work — `npm run dev` on localhost is fine.

## Build for production

```bash
npm run build
npm run preview
```

## Pages / routes

| Route              | Page                                                     |
|---------------------|-----------------------------------------------------------|
| `/`                 | Home — hero + live stats + Live Alerts / Damage Map CTAs |
| `/login`            | Agency Login — glass card form, no backend                |
| `/live-alerts`      | Live Alerts — real USGS quake feed + mock community reports, each with a verified/unverified badge |
| `/response-teams`   | Response Teams — deployable unit status (mock data)        |
| `/shelters`         | Shelters — free Leaflet map (OSM streets + Esri satellite), geolocation, nearest-shelter sort, offline map download |
| `/donate`           | Donate — donation form + public tamper-evident ledger      |
| `/alert-setup`      | Alert Setup — real push notifications, real SMS + AI voice calling to any phone number (via `/server`), India emergency helplines |
| `/resources`        | Resources — links to real official sources (NDMA, SACHET, IMD, CWC, USGS, GDACS, Indian Red Cross) |

## Backend (required for real SMS / AI calling)

`/server` is a small Express app that actually sends the SMS / places
the AI voice call — a browser can never hold the Twilio secret key
needed to do that directly. See `server/README.md` for setup
(Twilio account, `.env`, `npm start`). Without it running, `/alert-setup`
clearly says so and push notifications still work on their own.

```bash
cd server && npm install && cp .env.example .env
npm start
```

**Demo mode (default, no Twilio account needed):** out of the box,
`DEMO_MODE=true` in `server/.env.example`, so SMS/AI-call requests are
simulated — logged and returned with a fake SID instead of hitting
Twilio. This exists because Twilio trial accounts block all custom SMS
text and custom voice TwiML outright, which makes a live demo of a
disaster-alert app (which needs custom message content by definition)
impossible on a free account. `/alert-setup` shows a "Demo mode" badge
and a live "Recent demo sends" log so it's clear the request pipeline
actually ran end-to-end, not just a silent no-op.

**Going live:** upgrade your Twilio account (add billing — a few
dollars covers a lot of SMS/calls), fill in `TWILIO_ACCOUNT_SID`,
`TWILIO_AUTH_TOKEN`, `TWILIO_SMS_FROM`, `TWILIO_VOICE_FROM` in
`server/.env`, and set `DEMO_MODE=false` (or just delete that line —
it auto-detects real credentials and switches to live mode on its own).

## What's real vs. simulated — read this before demoing or deploying

This section exists because several requested features (real-time
satellite imagery, decentralized funds, a J-Alert-style national alert
system, offline maps, phone-to-phone mesh networking) span very
different levels of "buildable in a frontend repo." Here's the honest
state of each:

### Fully real, working today, free
- **Satellite + street map**: Leaflet with OpenStreetMap tiles and Esri
  World Imagery satellite tiles. No API key, no cost, genuinely live.
  Defaults to an India-wide view (`INDIA_CENTER` in `siteConfig.js`).
- **Live earthquake alerts, scoped to India**: pulled straight from
  USGS's public GeoJSON feed, filtered server-side to the India
  bounding box via query params — no key, real-time.
- **Cyclone/flood/volcano alerts, scoped to India**: pulled from
  GDACS's free public API, filtered client-side to India. Both feeds
  are cited by name with source links on `/live-alerts`; the official
  government feed (NDMA's SACHET portal + IMD) is linked out to
  directly since it doesn't expose a public key-free API to poll.
- **Real SMS and AI voice calling to any phone number**: `/alert-setup`
  now actually sends an SMS or places a text-to-speech phone call to
  the number you type in, via the backend in `/server` (Twilio).
  Previously this only showed a same-device browser notification —
  that limitation is gone once the backend is running with real
  credentials. The AI call can also auto-bridge into an Indian
  emergency helpline (112, 108, etc.) right after the message.
- **India emergency helplines**: real, sourced numbers (112, 100, 101,
  108, 1070, 1078, 1091, 181, 1098, 1930) shown as one-tap `tel:` links
  on Home and Alert Setup — source: National Portal of India.
- **Geolocation + nearest shelter sorting**: browser Geolocation API.
- **Offline map caching**: `/shelters` → "Download for offline use"
  pre-fetches OSM tiles for a bounding box into the Cache API via
  `src/lib/offlineMaps.js`; the service worker (`public/sw.js`) also
  caches the app shell and serves tiles cache-first when offline.
- **Browser push notifications**: `/alert-setup` → "Enable push
  alerts" is a real `Notification`/`PushManager` subscription flow,
  free, no telecom account needed. Limitation: only reaches people who
  already opened the site/PWA and granted permission, and only while
  their device has *some* connectivity to receive the push.
- **Tamper-evident donation ledger**: `/donate` hash-chains every
  entry (SHA-256 of each entry + the previous entry's hash) and offers
  a one-click chain-integrity check. This is the same core mechanism a
  blockchain uses for tamper-evidence — it does **not** give you
  decentralization (no independent nodes/consensus) or move real
  money. It's a real, honest first step, not smoke and mirrors.

### Stubbed with real integration points (needs your credentials)
- **SMS/AI-call at production scale**: `/server` uses Twilio, which
  works fine for testing but isn't India-native — for volume in India,
  MSG91 or Exotel (DLT-registered sender IDs, cheaper per-SMS) are the
  standard choice. Swapping the provider is documented at the bottom
  of `server/lib/twilioProvider.js`.
- **Real donation payments**: needs a payment processor. For India,
  Razorpay or a UPI intent link are the standard choice — plug the
  confirmed-transaction webhook into `addEntry()` in `src/lib/ledger.js`
  from your backend, not the browser.
- **Decentralized ledger on an actual chain**: if you want real
  decentralization later, swap the `localStorage` calls in
  `src/lib/ledger.js` for calls to a cheap-gas chain (Polygon, Celo) or
  keep the hash-chain design against an append-only public database —
  the UI barely changes.
- **AI-assisted report verification ("is the AI call working")**:
  there is currently **no AI integration** anywhere in this codebase.
  Calling Anthropic's (or any) API directly from the browser would
  expose your key to everyone who opens dev tools — it needs a small
  backend proxy holding the key server-side. Once you have that
  proxy, `/live-alerts` community reports are the natural place to
  show an AI-suggested verification confidence, alongside — never
  instead of — human moderator review.

### Not achievable as a website — needs a native app or government partnership
- **India-wide cell broadcast (a real J-Alert equivalent)**: this
  requires direct integration with telecom carriers or NDMA's own
  alert infrastructure (India's actual system is called SACHET) —
  not something any individual project, including this one, can
  stand up. What's built instead is a small-scale, opt-in version:
  register a handful of numbers, and once you have a paid SMS/voice
  provider wired up server-side, those numbers get called/texted
  directly — a real, if smaller-scale, safety net.
- **Phone-to-phone mesh networking** (like Bridgefy/FireChat, for
  when there's no cell signal at all): browsers have no access to
  raw Bluetooth mesh or Wi-Fi Direct — this needs a **native**
  Android/iOS app built on a mesh SDK (Bridgefy is the most common
  off-the-shelf option; Google's Nearby Connections is another).
  This is a legitimate and important feature for real disaster
  scenarios — it's just a different codebase (native, not web) from
  what's here.
- **Satellite fallback messaging** (like a Garmin inReach or
  satellite-SMS): needs either dedicated satellite modem hardware or
  a satellite-SMS API (Skylo, Iridium) with its own account — also a
  native-app-level integration, not a web feature.

If/when you're ready to build the native companion app for mesh +
satellite fallback, the web app's offline-cached shelter data and
alert registry are exactly the kind of state you'd hand off to it.

## Structure

```
src/
  siteConfig.js         nav links, bg video sources, map tile URLs,
                         India-scoped data-source URLs, emergency
                         helplines, offline region bounds, backend URL
  App.jsx                route definitions
  main.jsx                React Router + service worker registration
  lib/
    ledger.js             hash-chained donation ledger (localStorage demo)
    offlineMaps.js         tile pre-caching for offline map use
    alertSystem.js         push notifications + real SMS/AI-call dispatch
  components/
    BackgroundVideo.jsx    mp4/webm Earth video with poster + gradient fallback
    Header.jsx
    MobileMenu.jsx
    PageShell.jsx          wraps every page (video + header + menu + offline banner)
    PageHeader.jsx          eyebrow/title/subhead block
    OfflineBanner.jsx        shows when the app is running from cache
    VerifiedBadge.jsx        verified/unverified + source link, used on alerts
  pages/
    Home.jsx, Login.jsx, LiveAlerts.jsx, ResponseTeams.jsx,
    Shelters.jsx, Donate.jsx, AlertSetup.jsx, Resources.jsx
public/
  sw.js                   service worker: cache-first shell/tiles, network-first data
  manifest.json            PWA manifest (installable, needed for reliable push)
  videos/                 earth-bg.mp4, earth-bg.webm, earth-bg-poster.jpg
  assets/logo.svg           placeholder mark — swap for your real logo
server/                   Express backend for real SMS + AI voice calls
  index.js, lib/twilioProvider.js, lib/phone.js, .env.example, README.md
```

## Notes carried over
- **Background video (fixed)**: the original `earth3.mov` was a
  QuickTime container, which Chrome/Firefox/most Android browsers
  refuse to decode via `<video src>` — that's why it rendered as a
  solid black screen instead of the rotating Earth. It's now
  transcoded to `earth-bg.mp4` (H.264, plays everywhere) and
  `earth-bg.webm`, listed as `<source>` alternatives with a real
  poster frame and a dark-gradient (not flat black) CSS fallback if
  video is ever blocked outright. Served locally from `public/videos/`,
  cached offline by the service worker.
- **Login form has no backend** — see `src/pages/Login.jsx`.
- **Response Teams / Resources use mock or static data** where noted
  above; swap for real APIs when available.
- `public/assets/logo.svg` is a placeholder mark (SVG, since no image
  file was available to generate here) — swap in your real logo at
  the same path, or update the path in `Header.jsx` if using a
  different filename/format.
- All exact spacing/animation values from the original spec are still
  implemented via Tailwind config in `tailwind.config.js`. The one
  layout change made per this update: the **"Live Alerts" / "Open
  Damage Map"** buttons on `/` were moved from directly under the
  subhead into their own more spaced-out action row lower on the
  hero, so they read as a clear call-to-action instead of crowding
  the headline — see the comment in `src/pages/Home.jsx`.

## Running the complete stack

The project uses three processes:
- Vite frontend: http://localhost:5173
- Python FastAPI ML/early-warning backend: http://localhost:8000
- Node/Express alerts backend: http://localhost:5000

Install Python dependencies once:
`python -m pip install -r backend/requirements.txt`

Then either run `run-dev.bat` on Windows, or start each process separately.
The ML backend is the proven Python/scikit-learn Isolation Forest pipeline from the previous version; the Node backend remains responsible for SMS/voice dispatch.
