# RAKSHA Early Warning backend

This backend implements a hybrid early-warning engine:

1. Pulls live/current weather + 3-day forecasts from Open-Meteo.
2. Pulls a 365-day historical baseline from Open-Meteo.
3. Pulls an independent historical series from NASA POWER.
4. Optionally pulls OpenWeather current/forecast data with `OPENWEATHER_API_KEY`.
5. Optionally pulls real IoT/sensor data through `SENSOR_API_URL` + `SENSOR_API_KEY`.
6. Optionally pulls CWC water-level data through `CWC_API_URL`.
7. Reads recent GDACS flood/cyclone alerts.
8. Trains an `IsolationForest` on historical weather features to detect unusual observations.
9. Fuses anomaly + forecast + terrain/soil/runoff signals into flood, landslide and extreme-weather risk scores.

## Run

```bash
python -m venv .venv
.venv\\Scripts\\activate
pip install -r backend/requirements.txt
copy backend\\.env.example backend\\.env
uvicorn backend.main:app --reload --port 8000
```

The frontend calls `http://localhost:8000/api/early-warning`.

## API keys

OpenWeather requires an API key. Keep it in `backend/.env`; do not put it in frontend `VITE_*` variables. Open-Meteo and NASA POWER can be used without a key for this prototype.

For a real sensor gateway, expose normalized JSON at `SENSOR_API_URL`, for example:

```json
{
  "rainfall_mm_1h": 6.2,
  "water_level_m": 4.8,
  "soil_moisture": 0.71,
  "timestamp": "2026-08-28T12:30:00+05:30"
}
```

The CWC adapter is intentionally configurable because the exact feed/credentials available to the deployment should be supplied by the implementing authority.

## Push sensor readings directly into RAKSHA

An ESP32/LoRaWAN gateway/edge computer can POST normalized readings to:

`POST /api/sensors/ingest`

Header: `X-Sensor-Key: <SENSOR_INGEST_KEY>`

Body:

```json
{
  "sensor_id": "MANIPAL-RAIN-01",
  "rainfall_mm_1h": 6.2,
  "rainfall_mm_24h": 18.4,
  "water_level_m": 4.8,
  "soil_moisture": 0.71,
  "timestamp": "2026-08-28T12:30:00+05:30"
}
```

The latest reading is fused into the risk calculation. For production, replace the in-memory store with a time-series database (TimescaleDB/InfluxDB) and retain sensor history for model retraining.

## Intelligence architecture
The ML/AI implementation is intentionally separated into the top-level `ml/` folder:
`anomaly.py` (Isolation Forest) -> `risk.py` (hazard scoring) -> `agentic.py` (Agentic AI orchestration) -> `genai.py` (Generative AI explanation).
The FastAPI backend is the bridge between live data sources/sensors and that intelligence layer; the React UI consumes the resulting JSON.
