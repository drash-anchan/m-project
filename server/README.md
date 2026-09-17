# RAKSHAK Alerts Backend (real SMS + AI voice calling)

A small Express server that actually sends an SMS or places a phone call to a
number someone types into `/alert-setup` — as opposed to the old behaviour,
which only ever showed a browser notification on the same device (because
that's all a static frontend can legally do: telecom credentials can't live in
client-side JS, or anyone could read them out of devtools).

## Which provider handles what, and why

| Channel | Provider | Reason |
| --- | --- | --- |
| SMS | **MSG91** | India's TRAI/DLT regime requires a registered 6-character sender ID and an approved content template. Indian carriers filter or drop messages that don't satisfy it — which is what happens to Twilio's default US/virtual long codes and alphanumeric sender IDs. MSG91 is India-based and DLT-native, and cheaper per SMS at volume. |
| AI voice call | **Twilio** | Programmable voice with `<Say>` text-to-speech (Amazon Polly `Polly.Aditi`, `en-IN`) plus a `<Dial>` bridge into an Indian helpline, all as inline TwiML with no public webhook needed. MSG91's voice/OBD product is an add-on with no comparable TTS story. |

`lib/dispatcher.js` resolves each channel independently, so SMS can be live
while the call is still simulated, or the other way round. With no credentials
at all, both fall back to `lib/mockProvider.js` — the app still demos
end-to-end, and every response is explicitly labelled `simulated: true`. It
never claims to have delivered something it didn't.

## Setup

```bash
cd server
npm install
cp .env.example .env
```

### MSG91 (for SMS)

1. Create an account at https://msg91.com and copy your **Auth Key** from
   Dashboard → Settings → API into `MSG91_AUTHKEY`.
2. Get DLT-registered. You need a registered Principal Entity via your telecom
   operator's DLT portal (Jio/Airtel/Vi/BSNL — registration is free), then a
   registered **Header** (your 6-character sender ID, e.g. `RKSHAK`) and an
   approved **content template**. Until this is done, sends to Indian numbers
   will be rejected or scrubbed by the carrier no matter which API you use.
3. Then pick one path:
   - **Flow API v5 (recommended)** — create a template with one variable, get it
     approved, and set `MSG91_TEMPLATE_ID` plus `MSG91_MESSAGE_VAR` (the
     variable's name, commonly `VAR1`). The alert text is injected into it.
   - **sendsms v2** — leave `MSG91_TEMPLATE_ID` blank and set `MSG91_SENDER` to
     your approved sender ID. Accepts free-form text, which is easier for
     testing but can be scrubbed on a DLT-enforced route.

### Twilio (for the AI call)

1. Create a free account at https://www.twilio.com/try-twilio.
2. Copy your **Account SID** and **Auth Token** into `.env`.
3. Put your Twilio voice-capable number in `TWILIO_VOICE_FROM` (E.164 format,
   e.g. `+15551234567`).
4. **Trial accounts**: Twilio will only call numbers you've verified under
   Console → Phone Numbers → Verified Caller IDs, and it blocks custom voice
   TwiML entirely — so the spoken alert text won't play until you add billing.

Then set `DEMO_MODE=false` in `.env` (or delete the line to use auto-detect)
and start it:

```bash
npm start
```

Runs on `http://localhost:5000` by default. Set `VITE_ALERTS_BACKEND_URL` in
the frontend's `.env` if you run it elsewhere (see the project root
`.env.example`).

## Endpoints

- `GET /api/health` — the full picture: overall `mode` (`live` / `demo` /
  `partial`), plus per-channel `{ provider, simulated, reason }` for SMS and
  voice, and which credential sets were found.
- `GET /api/demo-log` — the in-memory log of simulated sends (max 50), so you
  can prove the flow ran end-to-end without a paid account.
- `GET /api/helplines` — the same Indian emergency helpline list shown in the app.
- `POST /api/send-sms` — `{ to, message }` → sends a real SMS to `to` via MSG91.
- `POST /api/ai-call` — `{ to, message, helplineNumber? }` → places a real Twilio
  call to `to` that speaks `message` via text-to-speech, then bridges into
  `helplineNumber` (e.g. `"108"`) if one is given.

Destination numbers are normalised to Indian E.164 (`+91` + 10 digits) by
`lib/phone.js` and rejected otherwise, and `helplineNumber` must match one of
the Indian national short codes in the built-in list — this backend does not
dial out of India.

## Troubleshooting

Every 502 from the send endpoints includes a `provider` and a `hint` naming the
exact env var or account setting to check. `GET /api/health` is the fastest way
to see whether the server thinks it is live or simulating, and why.

## Deploying so it's reachable from a real phone / production frontend

`localhost` only works while your own machine is running the server. For a
deployed site, host this folder on Render, Railway, Fly.io, or any Node host,
set the same env vars there, and point the frontend's
`VITE_ALERTS_BACKEND_URL` at that public URL.

## Why not a two-way "press 1 to connect" call?

The AI call speaks the alert and then optionally dials straight into a chosen
helpline in one shot (inline TwiML). A "press 1 for police, press 2 for
ambulance" menu needs Twilio to call your server back mid-call for the next
step, which means this server must be reachable from the public internet (not
just localhost) with a stable URL. Once deployed, that's a ~15-line addition —
see Twilio's `<Gather>` docs: https://www.twilio.com/docs/voice/twiml/gather
