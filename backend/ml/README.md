# RAKSHA ML / AI Layer

This folder contains the intelligence layer only. The React website does not contain the ML algorithms.

## Components
- `anomaly.py` — Isolation Forest anomaly detection. Learns the local normal pattern from historical feature vectors.
- `risk.py` — combines anomaly, forecast, soil, runoff and terrain signals into flood/landslide/extreme-weather risk scores.
- `agentic.py` — Agentic AI orchestration: decides which verification/response checks should happen next based on evidence.
- `genai.py` — Generative AI incident brief. Uses an OpenAI-compatible endpoint when configured; otherwise a safe local fallback keeps the demo running.

## Flow
Historical + live + forecast data -> anomaly detection -> hazard risk -> Agentic AI verification/response plan -> GenAI explanation -> website.

## Important
An anomaly is not automatically a disaster. Risk is increased only when multiple signals support the hazard. The prototype is decision support, not an official warning system.
