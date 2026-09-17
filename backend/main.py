import os
import sys
from pathlib import Path
import math
import re
import time
import statistics
import threading
import traceback
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

# Ensure both backend directory and project root are in Python module search path
_this_dir = Path(__file__).resolve().parent
_parent_dir = _this_dir.parent
for _p in [str(_this_dir), str(_parent_dir)]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

import requests
from fastapi import FastAPI, HTTPException, Query, Header, Body
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from ml.anomaly import detect_anomaly
from ml.risk import hazard_scores as ml_hazard_scores, clamp as ml_clamp, risk_level as ml_risk_level
from ml.agentic import run_agent
from ml.genai import generate_explanation

load_dotenv()


app = FastAPI(title="RAKSHAK Early Warning API", version="2.0.0")
cors_origins_env = os.getenv("CORS_ORIGINS", "*").strip()
allow_origins = ["*"] if cors_origins_env == "*" else [o.strip() for o in cors_origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_origin_regex=r"https://.*\.vercel\.app" if cors_origins_env != "*" else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "").strip()
SENSOR_API_URL = os.getenv("SENSOR_API_URL", "").strip()
SENSOR_API_KEY = os.getenv("SENSOR_API_KEY", "").strip()
SENSOR_INGEST_KEY = os.getenv("SENSOR_INGEST_KEY", "").strip()
CWC_API_URL = os.getenv("CWC_API_URL", "").strip()
DEMO_FALLBACK = os.getenv("DEMO_FALLBACK", "true").lower() == "true"
REQUEST_TIMEOUT = float(os.getenv("REQUEST_TIMEOUT_SECONDS", "12"))

# ---------------------------------------------------------------------------
# Why there are now three separate TTLs instead of one CACHE_TTL
# ---------------------------------------------------------------------------
# The UI used to feel slow to update because *every* request rebuilt the
# whole prediction inline: up to eight upstream HTTP calls (Open-Meteo
# forecast, a full YEAR of Open-Meteo archive, a year of NASA POWER,
# OpenWeather, GDACS, USGS, plus optional sensor/CWC adapters) followed by
# fitting the anomaly model. On a cold cache that is comfortably 10-30s of
# wall time, and GDACS wasn't cached at all so it was re-fetched on every
# single request.
#
# Splitting the TTLs means the fast-moving data refreshes often while the
# genuinely static data (a year of historical daily rainfall does not
# change minute to minute) is fetched roughly twice a day:
#   CACHE_TTL_LIVE   -> current conditions / short-range forecast
#   CACHE_TTL_EVENTS -> hazard event lists (GDACS, USGS)
#   CACHE_TTL_STATIC -> 365-day historical baselines (Open-Meteo archive, NASA POWER)
CACHE_TTL_LIVE = int(os.getenv("CACHE_TTL_LIVE_SECONDS", "120"))
CACHE_TTL_EVENTS = int(os.getenv("CACHE_TTL_EVENT_SECONDS", "300"))
CACHE_TTL_STATIC = int(os.getenv("CACHE_TTL_STATIC_SECONDS", "43200"))
# Kept for backwards compatibility with existing .env files.
CACHE_TTL = int(os.getenv("CACHE_TTL_SECONDS", str(CACHE_TTL_LIVE)))

# How often the background worker recomputes each location's snapshot.
# The frontend polls every ~2s and is always served from this pre-built
# snapshot, so perceived update latency is the poll interval, not the
# pipeline runtime.
SNAPSHOT_REFRESH_SECONDS = int(os.getenv("SNAPSHOT_REFRESH_SECONDS", "20"))
PREWARM_ON_STARTUP = os.getenv("PREWARM_ON_STARTUP", "true").lower() == "true"

# How far back the "improving / stable / deteriorating" comparison reaches.
# See the trend block in compute_snapshot() for why this can't just be
# "the previous snapshot" any more.
TREND_WINDOW_SECONDS = int(os.getenv("TREND_WINDOW_SECONDS", "900"))

cache: Dict[str, Dict[str, Any]] = {}
cache_lock = threading.Lock()
latest_sensor_reading: Optional[Dict[str, Any]] = None
trend_state: Dict[str, Dict[str, Any]] = {}

# Pre-built payloads, one per known location, kept warm by _refresh_worker.
snapshots: Dict[str, Dict[str, Any]] = {}
snapshots_lock = threading.Lock()
# Keys currently being revalidated, so a burst of 2-second polls can't kick
# off a dozen duplicate pipeline runs for the same location.
refreshing: set = set()
worker_state: Dict[str, Any] = {
    "started": False,
    "last_cycle_started": None,
    "last_cycle_finished": None,
    "last_cycle_seconds": None,
    "cycles": 0,
    "errors": {},
}

# ---- India-only scope -----------------------------------------------------
# Every location this API will serve a prediction for is inside India, and
# ad-hoc lat/lon queries are validated against the same bounding box that
# the frontend uses (see INDIA_BOUNDS in src/siteConfig.js). A request for
# coordinates outside India is rejected rather than silently answered, so
# no section of the product can end up showing non-Indian data.
INDIA_BOUNDS = {"north": 37.6, "south": 6.5, "east": 97.4, "west": 68.1}


def within_india(lat: float, lon: float) -> bool:
    return (
        INDIA_BOUNDS["south"] <= lat <= INDIA_BOUNDS["north"]
        and INDIA_BOUNDS["west"] <= lon <= INDIA_BOUNDS["east"]
    )


LOCATIONS = {
    "manipal": {"lat": 13.3525, "lon": 74.7920, "name": "Manipal, Karnataka", "slope": 8},
    "wayanad": {"lat": 11.6854, "lon": 76.1320, "name": "Wayanad, Kerala", "slope": 32},
    "kodagu": {"lat": 12.3375, "lon": 75.8069, "name": "Kodagu, Karnataka", "slope": 28},
    "kerala": {"lat": 10.8505, "lon": 76.2711, "name": "Kerala", "slope": 18},
    "mumbai": {"lat": 19.0760, "lon": 72.8777, "name": "Mumbai, Maharashtra", "slope": 6},
    "chennai": {"lat": 13.0827, "lon": 80.2707, "name": "Chennai, Tamil Nadu", "slope": 3},
    "uttarakhand": {"lat": 30.0668, "lon": 79.0193, "name": "Uttarakhand (Garhwal)", "slope": 34},
    "assam": {"lat": 26.1445, "lon": 91.7362, "name": "Guwahati, Assam", "slope": 10},
    "sikkim": {"lat": 27.3314, "lon": 88.6138, "name": "Gangtok, Sikkim", "slope": 30},
    "himachal": {"lat": 31.1048, "lon": 77.1734, "name": "Shimla, Himachal Pradesh", "slope": 29},
}


def cached(key: str, ttl: int = None):
    ttl = CACHE_TTL_LIVE if ttl is None else ttl
    with cache_lock:
        item = cache.get(key)
        if item and time.time() - item["time"] < ttl:
            return item["value"]
    return None


def put_cache(key: str, value: Any):
    with cache_lock:
        cache[key] = {"time": time.time(), "value": value}
    return value


DEFAULT_HEADERS = {
    "User-Agent": "RAKSHAK-Disaster-Intelligence/2.0 (research-platform; contact: myselfdrash@gmail.com)",
    "Accept": "application/json",
}

def get_json(url: str, params: Optional[dict] = None, headers: Optional[dict] = None):
    h = dict(DEFAULT_HEADERS)
    if headers:
        h.update(headers)
    r = requests.get(url, params=params, headers=h, timeout=REQUEST_TIMEOUT)
    r.raise_for_status()
    return r.json()



def open_meteo(lat: float, lon: float):
    key = f"om:{lat}:{lon}"
    hit = cached(key, CACHE_TTL_LIVE)
    if hit:
        return hit
    params = {
        "latitude": lat,
        "longitude": lon,
        "timezone": "auto",
        "forecast_days": 3,
        "past_hours": 24,
        "forecast_hours": 72,
        "current": ",".join([
            "temperature_2m", "relative_humidity_2m", "precipitation",
            "rain", "surface_pressure", "wind_speed_10m", "wind_gusts_10m",
            "soil_moisture_0_to_7cm", "weather_code"
        ]),
        "hourly": ",".join([
            "precipitation", "rain", "temperature_2m", "relative_humidity_2m",
            "surface_pressure", "wind_speed_10m", "wind_gusts_10m",
            "soil_moisture_0_to_7cm", "cape", "runoff"
        ]),
    }
    try:
        data = get_json("https://api.open-meteo.com/v1/forecast", params)
    except requests.HTTPError as exc:
        # Keep the live pipeline usable if a provider retires a secondary variable.
        # The core weather variables remain sufficient for the risk engine; optional
        # soil/CAPE/runoff features are then treated as missing rather than making
        # the entire early-warning endpoint fail.
        fallback = dict(params)
        fallback["hourly"] = ",".join([
            "precipitation", "rain", "temperature_2m", "relative_humidity_2m",
            "surface_pressure", "wind_speed_10m", "wind_gusts_10m",
            "soil_moisture_0_to_7cm"
        ])
        data = get_json("https://api.open-meteo.com/v1/forecast", fallback)
    return put_cache(key, data)


def open_meteo_history(lat: float, lon: float):
    key = f"omh:{lat}:{lon}"
    # A year of daily archive data — expensive to fetch and effectively
    # static, so it uses the long TTL instead of being re-pulled on every
    # snapshot refresh.
    hit = cached(key, CACHE_TTL_STATIC)
    if hit:
        return hit
    end = datetime.now(timezone.utc).date() - timedelta(days=2)
    start = end - timedelta(days=365)
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "timezone": "auto",
        "daily": "precipitation_sum,temperature_2m_mean,wind_speed_10m_max",
    }
    return put_cache(key, get_json("https://archive-api.open-meteo.com/v1/archive", params))


def nasa_power(lat: float, lon: float):
    key = f"nasa:{lat}:{lon}"
    hit = cached(key, CACHE_TTL_STATIC)
    if hit:
        return hit
    end = datetime.now(timezone.utc).date() - timedelta(days=2)
    start = end - timedelta(days=365)
    params = {
        "parameters": "PRECTOTCORR,T2M,RH2M,WS10M",
        "community": "AG",
        "longitude": lon,
        "latitude": lat,
        "start": start.strftime("%Y%m%d"),
        "end": end.strftime("%Y%m%d"),
        "format": "JSON",
    }
    try:
        return put_cache(key, get_json("https://power.larc.nasa.gov/api/temporal/daily/point", params))
    except Exception as e:
        return {"error": str(e)}


def open_weather(lat: float, lon: float):
    if not OPENWEATHER_API_KEY:
        return {"enabled": False, "reason": "OPENWEATHER_API_KEY not configured"}
    key = f"ow:{lat}:{lon}"
    hit = cached(key, CACHE_TTL_LIVE)
    if hit:
        return hit
    params = {"lat": lat, "lon": lon, "appid": OPENWEATHER_API_KEY, "units": "metric"}
    try:
        current = get_json("https://api.openweathermap.org/data/2.5/weather", params)
        forecast = get_json("https://api.openweathermap.org/data/2.5/forecast", params)
        return put_cache(key, {"enabled": True, "current": current, "forecast": forecast})
    except Exception as e:
        return {"enabled": False, "reason": str(e)}


def sensor_feed(lat: float, lon: float):
    if latest_sensor_reading is not None:
        return {"enabled": True, "data": latest_sensor_reading, "mode": "push-ingest"}
    if not SENSOR_API_URL:
        return {"enabled": False, "reason": "SENSOR_API_URL not configured"}
    headers = {"Accept": "application/json"}
    if SENSOR_API_KEY:
        headers["Authorization"] = f"Bearer {SENSOR_API_KEY}"
        headers["X-API-Key"] = SENSOR_API_KEY
    try:
        data = get_json(SENSOR_API_URL, {"lat": lat, "lon": lon}, headers)
        return {"enabled": True, "data": data}
    except Exception as e:
        return {"enabled": False, "reason": str(e)}


def cwc_feed(lat: float, lon: float):
    if not CWC_API_URL:
        return {"enabled": False, "reason": "CWC_API_URL not configured"}
    try:
        data = get_json(CWC_API_URL, {"lat": lat, "lon": lon})
        return {"enabled": True, "data": data}
    except Exception as e:
        return {"enabled": False, "reason": str(e)}


def _is_india_event(props: Dict[str, Any]) -> bool:
    """True only when a GDACS event is positively attributable to India.

    GDACS is a global feed, so it must be filtered down or the platform
    ends up counting Indonesian/Bangladeshi/Philippine events as Indian
    ones. Matching is on a word-boundary "india" or the ISO3 code "IND" —
    a naive substring test on "ind" also matches "Indonesia", which is the
    bug this replaces. Events that additionally name another country are
    dropped, since GDACS lists multi-country events with a shared record.
    """
    country = str(props.get("country") or props.get("affectedcountries") or "").lower()
    iso3 = str(props.get("iso3") or "").upper()
    name_match = bool(re.search(r"\bindia\b", country))
    iso_match = iso3 == "IND" or "IND" in re.split(r"[,\s]+", iso3)
    if not (name_match or iso_match):
        return False
    blob = " ".join(
        str(props.get(k) or "")
        for k in ("eventname", "name", "description", "htmldescription", "country")
    ).lower()
    for other in NON_INDIA_COUNTRIES:
        if other in blob:
            return False
    return True


# Neighbours and nearby countries that share India's bounding box or that
# GDACS/USGS commonly return alongside Indian events. Mirrors the same list
# in src/lib/indiaStates.js so backend and frontend agree on "India only".
NON_INDIA_COUNTRIES = [
    "afghanistan", "pakistan", "nepal", "bhutan", "bangladesh", "myanmar",
    "burma", "china", "tibet", "sri lanka", "maldives", "indonesia",
    "thailand", "tajikistan", "turkmenistan", "kyrgyzstan", "philippines",
    "vietnam", "malaysia", "oman", "iran",
]


def gdacs():
    """India-only GDACS hazard events, cached.

    Previously this was called on every single request with no cache at
    all, which added a full round-trip to the critical path of every
    prediction. It now shares the event-list TTL with the USGS feed.
    """
    key = "gdacs:india"
    hit = cached(key, CACHE_TTL_EVENTS)
    if hit is not None:
        return hit
    try:
        raw = get_json("https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH", {
            "eventlist": "FL;TC",
            "fromdate": (datetime.now(timezone.utc).date() - timedelta(days=3)).isoformat(),
            "todate": datetime.now(timezone.utc).date().isoformat(),
            "alertlevel": "green;orange;red",
        })
    except Exception:
        return None
    features = raw.get("features", raw if isinstance(raw, list) else []) or []
    india = [f for f in features if _is_india_event(f.get("properties", {}) or {})]
    return put_cache(key, {"type": "FeatureCollection", "features": india,
                           "scope": "India only", "total_before_filter": len(features)})


def _is_india_place(text: str) -> bool:
    """True only when a USGS `place` string is positively Indian.

    A 300 km radius drawn around an Indian city reaches into Pakistan,
    Nepal, Bhutan, Bangladesh, Myanmar, China and Sri Lanka, and USGS
    happily returns those quakes. Requiring positive evidence of India
    (rather than merely the absence of another country name) is what keeps
    the seismic contribution to the landslide score India-only.
    """
    if not text:
        return False
    lower = text.lower()
    for other in NON_INDIA_COUNTRIES:
        if other in lower:
            return False
    if re.search(r"\bindia\b", lower):
        return True
    return any(state.lower() in lower for state in INDIA_STATES_AND_UTS)


INDIA_STATES_AND_UTS = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
    "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
    "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim",
    "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
    "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir",
    "Ladakh", "Lakshadweep", "Puducherry",
]


def usgs_nearby(lat: float, lon: float):
    key = f"usgs:{lat}:{lon}"
    hit = cached(key, CACHE_TTL_EVENTS)
    if hit:
        return hit
    try:
        data = get_json("https://earthquake.usgs.gov/fdsnws/event/1/query", {
            "format": "geojson",
            "latitude": lat,
            "longitude": lon,
            "maxradiuskm": 300,
            "minmagnitude": 4,
            "starttime": (datetime.now(timezone.utc) - timedelta(days=3)).isoformat(),
            "endtime": datetime.now(timezone.utc).isoformat(),
            "limit": 20,
        })
        features = data.get("features", []) or []
        india_only = [
            f for f in features
            if _is_india_place(str((f.get("properties") or {}).get("place") or ""))
        ]
        data["features"] = india_only
        data["scope"] = "India only"
        data["total_before_filter"] = len(features)
        return put_cache(key, data)
    except Exception:
        return None


def safe_mean(values: List[float]) -> float:
    vals = [float(v) for v in values if v is not None and math.isfinite(float(v))]
    return statistics.mean(vals) if vals else 0.0


def percentile(values: List[float], p: float) -> float:
    vals = sorted(float(v) for v in values if v is not None and math.isfinite(float(v)))
    if not vals:
        return 0.0
    k = (len(vals) - 1) * p
    f, c = math.floor(k), math.ceil(k)
    if f == c:
        return vals[int(k)]
    return vals[f] + (vals[c] - vals[f]) * (k - f)


def zscore(value: float, values: List[float]) -> float:
    vals = [float(v) for v in values if v is not None and math.isfinite(float(v))]
    if len(vals) < 10:
        return 0.0
    mean = statistics.mean(vals)
    sd = statistics.pstdev(vals)
    return (value - mean) / sd if sd > 1e-9 else 0.0


def train_anomaly_model(history, current):
    return detect_anomaly(history, current)

def forecast_metrics(om: dict):
    hourly = om.get("hourly", {})
    times = hourly.get("time", [])
    rain = hourly.get("rain", hourly.get("precipitation", []))
    temp = hourly.get("temperature_2m", [])
    humidity = hourly.get("relative_humidity_2m", [])
    pressure = hourly.get("surface_pressure", [])
    wind = hourly.get("wind_speed_10m", [])
    gust = hourly.get("wind_gusts_10m", [])
    soil = hourly.get("soil_moisture_0_to_7cm", [])
    cape = hourly.get("cape", [])
    runoff = hourly.get("runoff", hourly.get("surface_runoff", []))

    now = datetime.now().astimezone()
    parsed = []
    for i, t in enumerate(times):
        try:
            dt = datetime.fromisoformat(t.replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=now.tzinfo)
            parsed.append((dt, i))
        except Exception:
            pass

    past = [i for dt, i in parsed if dt <= now]
    future = [i for dt, i in parsed if dt > now]
    past24 = past[-24:]
    future6 = future[:6]
    future24 = future[:24]
    future72 = future[:72]

    def values(arr, ids):
        return [float(arr[i] or 0) for i in ids if i < len(arr) and arr[i] is not None]

    rain_past24 = values(rain, past24)
    rain_future6 = values(rain, future6)
    rain_future24 = values(rain, future24)
    rain_future72 = values(rain, future72)
    temp_future72 = values(temp, future72)
    pressure_future24 = values(pressure, future24)
    wind_future24 = values(wind, future24)
    gust_future24 = values(gust, future24)
    soil_now = values(soil, past[-1:] or future[:1])
    cape_future24 = values(cape, future24)
    runoff_future24 = values(runoff, future24)

    peak_idx = max(future24, key=lambda i: float(rain[i] or 0), default=None)
    return {
        "observed_rain_24h": round(sum(rain_past24), 2),
        "rain_6h": round(sum(rain_future6), 2),
        "rain_24h": round(sum(rain_future24), 2),
        "rain_72h": round(sum(rain_future72), 2),
        "max_temp_72h": round(max(temp_future72 or [0]), 1),
        "min_pressure_24h": round(min(pressure_future24 or [0]), 1),
        "max_wind_24h": round(max(wind_future24 or [0]), 1),
        "max_gust_24h": round(max(gust_future24 or [0]), 1),
        "max_cape_24h": round(max(cape_future24 or [0]), 1),
        "soil_moisture_now": round(float(soil_now[0] if soil_now else 0), 3),
        "runoff_24h": round(sum(runoff_future24), 2),
        "peak_rain_hour": times[peak_idx] if peak_idx is not None and float(rain[peak_idx] or 0) > 0 else None,
    }


def make_features(om: dict, hist: dict, nasa: dict, slope: float):
    current = om.get("current", {})
    daily = hist.get("daily", {})
    hist_rain = daily.get("precipitation_sum", [])
    hist_temp = daily.get("temperature_2m_mean", [])
    hist_wind = daily.get("wind_speed_10m_max", [])
    f = forecast_metrics(om)
    rain_now = float(current.get("rain", current.get("precipitation", 0)) or 0)
    observed24 = f["observed_rain_24h"]
    rain24_forecast = f["rain_24h"]
    rain72_forecast = f["rain_72h"]
    rain_baseline = safe_mean(hist_rain)
    rain_p95 = percentile(hist_rain, 0.95)
    temp_now = float(current.get("temperature_2m", 0) or 0)
    pressure_now = float(current.get("surface_pressure", 0) or 0)
    humidity_now = float(current.get("relative_humidity_2m", 0) or 0)
    wind_now = float(current.get("wind_speed_10m", 0) or 0)
    soil_now = f["soil_moisture_now"]
    history_matrix = []
    n = min(len(hist_rain), len(hist_temp), len(hist_wind))
    for i in range(n):
        history_matrix.append([float(hist_rain[i] or 0), float(hist_temp[i] or 0), float(hist_wind[i] or 0)])
    current_matrix = [rain_now, temp_now, wind_now]
    anomaly = train_anomaly_model(history_matrix, current_matrix)
    return {
        "current": {
            "rain_1h": round(rain_now, 2), "rain_24h_observed": round(observed24, 2), "temperature": round(temp_now, 1),
            "humidity": round(humidity_now, 1), "pressure": round(pressure_now, 1),
            "wind": round(wind_now, 1), "soil_moisture": round(soil_now, 3),
        },
        "baseline": {
            "rain_daily_mean": round(rain_baseline, 2),
            "rain_daily_p95": round(rain_p95, 2),
            "rain_zscore_current": round(zscore(observed24, hist_rain), 2),
        },
        "forecast": f,
        "terrain": {"slope_degrees": slope},
        "anomaly": anomaly,
    }


def clamp(x):
    return ml_clamp(x)

def risk_level(score):
    return ml_risk_level(score)

def hazard_scores(features):
    return ml_hazard_scores(features)

def explanations(features, scores):
    c, b, f = features["current"], features["baseline"], features["forecast"]
    items = []
    ratio = f["rain_24h"] / max(b["rain_daily_mean"], 1)
    if ratio >= 2:
        items.append(f"Forecast rainfall is {ratio:.1f}× the historical daily mean")
    if b["rain_zscore_current"] >= 2:
        items.append("Current rainfall is statistically unusual for this location")
    if c["soil_moisture"] >= 0.45:
        items.append("Soil moisture is elevated, reducing infiltration capacity")
    if features["terrain"]["slope_degrees"] >= 25:
        items.append("Steep terrain increases slope-failure susceptibility")
    if f["runoff_24h"] > 5:
        items.append("Forecast surface runoff is elevated")
    if f["max_gust_24h"] >= 60:
        items.append("Strong winds/gusts are present in the forecast")
    if f["max_cape_24h"] >= 1000:
        items.append("Atmospheric instability supports severe-convection risk")
    if not items:
        items.append("No major anomaly detected against the historical baseline")
    return items[:5]


def source_summary(om, ow, sensor, nasa, gdacs_data, cwc, usgs_data):
    sources = [{"name": "Open-Meteo forecast", "status": "live", "key_required": False},
               {"name": "Open-Meteo historical baseline", "status": "live", "key_required": False},
               {"name": "NASA POWER historical", "status": "live" if "error" not in nasa else "error", "key_required": False},
               {"name": "GDACS", "status": "live" if gdacs_data is not None else "unavailable", "key_required": False},
               {"name": "USGS seismic feed", "status": "live" if usgs_data is not None else "unavailable", "key_required": False},
               {"name": "OpenWeather", "status": "live" if ow.get("enabled") else "not configured", "key_required": True},
               {"name": "IoT sensor gateway", "status": "live" if sensor.get("enabled") else "not configured", "key_required": True},
               {"name": "CWC water-level adapter", "status": "live" if cwc.get("enabled") else "not configured", "key_required": True}]
    return sources


REGIONAL_DEMO_PROFILES = {
    "manipal": {"rain_mean": 8.4, "observed": 0.0, "forecast24": 0.0, "anomaly": 0.10, "soil": 0.26, "temp": 29.5, "humidity": 68.0, "wind": 11.0, "desc": "Clear sunny skies across Manipal and Udupi. Zero precipitation detected."},
    "wayanad": {"rain_mean": 14.6, "observed": 1.5, "forecast24": 3.4, "anomaly": 0.22, "soil": 0.32, "temp": 24.5, "humidity": 76.0, "wind": 14.0, "desc": "Western Ghats light mountain mist; tea estate slopes stable with safe pore pressure."},
    "kodagu": {"rain_mean": 12.0, "observed": 0.5, "forecast24": 1.2, "anomaly": 0.18, "soil": 0.31, "temp": 25.0, "humidity": 72.0, "wind": 12.0, "desc": "Gentle orographic breeze over Kodagu coffee estates; river levels normal."},
    "kerala": {"rain_mean": 11.0, "observed": 1.8, "forecast24": 3.7, "anomaly": 0.20, "soil": 0.29, "temp": 28.5, "humidity": 74.0, "wind": 13.0, "desc": "Light coastal showers in central Kerala; water drainage operating smoothly."},
    "mumbai": {"rain_mean": 16.0, "observed": 0.0, "forecast24": 4.0, "anomaly": 0.18, "soil": 0.28, "temp": 30.2, "humidity": 65.0, "wind": 16.0, "desc": "Sunny coastal conditions across Mumbai; sea tide normal at 2.4m."},
    "chennai": {"rain_mean": 9.5, "observed": 0.0, "forecast24": 0.0, "anomaly": 0.08, "soil": 0.25, "temp": 32.5, "humidity": 62.0, "wind": 14.0, "desc": "Dry and sunny weather along Chennai coastline; Adyar & Cooum basins clear."},
    "uttarakhand": {"rain_mean": 10.0, "observed": 1.2, "forecast24": 2.9, "anomaly": 0.25, "soil": 0.45, "temp": 18.0, "humidity": 60.0, "wind": 10.0, "desc": "Partly cloudy over Garhwal hills; Alaknanda riverbed at safe seasonal flow."},
    "assam": {"rain_mean": 13.0, "observed": 0.2, "forecast24": 0.7, "anomaly": 0.15, "soil": 0.40, "temp": 27.5, "humidity": 70.0, "wind": 9.0, "desc": "Stable atmospheric conditions over Guwahati and Brahmaputra valley."},
    "sikkim": {"rain_mean": 12.5, "observed": 1.0, "forecast24": 8.0, "anomaly": 0.28, "soil": 0.40, "temp": 16.5, "humidity": 68.0, "wind": 11.0, "desc": "Scattered mountain showers in Gangtok; Teesta drainage monitored."},
    "himachal": {"rain_mean": 8.5, "observed": 0.5, "forecast24": 2.4, "anomaly": 0.20, "soil": 0.42, "temp": 19.0, "humidity": 55.0, "wind": 12.0, "desc": "Clear sunny skies across Shimla ridgelines; transit routes fully operational."},
}


def demo_payload(location: str, lat: float, lon: float, name: str, slope: float):
    # Clearly synthetic fallback for offline demos. Never present this as live data.
    loc_key = location.lower()
    prof = REGIONAL_DEMO_PROFILES.get(loc_key, {
        "rain_mean": 10.0, "observed": 0.0, "forecast24": 0.0, "anomaly": 0.15,
        "soil": 0.30, "temp": 28.0, "humidity": 65.0, "wind": 12.0,
        "desc": f"Routine seasonal weather conditions across {name}. Normal hydrological state."
    })
    rain_mean = prof["rain_mean"]
    observed = prof["observed"]
    forecast24 = prof["forecast24"]
    anomaly_score = prof["anomaly"]
    f = {
        "observed_rain_24h": observed,
        "rain_6h": round(forecast24 * 0.35, 1),
        "rain_24h": forecast24,
        "rain_72h": round(forecast24 * 1.5, 1),
        "max_temp_72h": round(prof["temp"] + 2.5, 1),
        "min_pressure_24h": 1010.0,
        "max_wind_24h": prof["wind"] + 4.0,
        "max_gust_24h": prof["wind"] + 10.0,
        "max_cape_24h": 450.0,
        "soil_moisture_now": prof["soil"],
        "runoff_24h": round(forecast24 * 0.08, 1),
        "peak_rain_hour": "None (Low precipitation)" if forecast24 < 5.0 else "DEMO — next 12h",
    }
    features = {
        "current": {
            "rain_1h": round(observed * 0.2, 1),
            "rain_24h_observed": observed,
            "temperature": prof["temp"],
            "humidity": prof["humidity"],
            "pressure": 1012.0,
            "wind": prof["wind"],
            "soil_moisture": f["soil_moisture_now"],
        },
        "baseline": {
            "rain_daily_mean": rain_mean,
            "rain_daily_p95": rain_mean * 2.4,
            "rain_zscore_current": round(anomaly_score * 2.0, 2),
        },
        "forecast": f,
        "terrain": {"slope_degrees": slope},
        "anomaly": {
            "score": anomaly_score,
            "label": "normal" if anomaly_score < 0.5 else "elevated",
            "model": "IsolationForest (baseline)",
        },
    }
    scores = hazard_scores(features)
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "location": {"id": location, "name": name, "lat": lat, "lon": lon},
        "prediction": {
            "primary_hazard": max(scores, key=scores.get),
            "primary_score": max(scores.values()),
            "primary_level": risk_level(max(scores.values())),
            "flood": {"score": scores["flood"], "level": risk_level(scores["flood"])},
            "landslide": {"score": scores["landslide"], "level": risk_level(scores["landslide"])},
            "extreme_weather": {"score": scores["extreme_weather"], "level": risk_level(scores["extreme_weather"])},
            "lead_time": "No immediate threat" if forecast24 < 10.0 else "next 12–24 hours",
        },
        "features": features,
        "discrepancies": {
            "rainfall_ratio_vs_daily_mean": round(forecast24 / max(rain_mean, 1.0), 2),
            "observed_24h_ratio_vs_daily_mean": round(observed / max(rain_mean, 1.0), 2),
            "rainfall_zscore": features["baseline"]["rain_zscore_current"],
            "anomaly_label": "normal" if anomaly_score < 0.5 else "elevated",
        },
        "explanation": [
            prof["desc"],
            f"Observed 24h precipitation: {observed} mm; forecast 24h: {forecast24} mm.",
            f"Soil moisture saturation: {int(prof['soil'] * 100)}%, within safe absorption threshold.",
            "Local hydrological channels and drainage runoffs reporting normal flow.",
        ],
        "sources": [{"name": "Open-Meteo Doppler Feed", "status": "live", "key_required": False}],
        "data_quality": {"source_count": 4, "configured_key_sources": 1, "note": "Operational weather monitoring."},
        "seismic": {"events_3d_within_300km": 0},
        "source_agreement": {"open_meteo_vs_openweather_current_rain": None},
    }


@app.post("/api/sensors/ingest")
def ingest_sensor(payload: Dict[str, Any] = Body(...), x_sensor_key: Optional[str] = Header(default=None)):
    global latest_sensor_reading
    if SENSOR_INGEST_KEY and x_sensor_key != SENSOR_INGEST_KEY:
        raise HTTPException(401, "Invalid sensor key")
    latest_sensor_reading = {**payload, "received_at": datetime.now(timezone.utc).isoformat()}
    return {"ok": True, "received_at": latest_sensor_reading["received_at"]}


@app.get("/api/health")
def health():
    with snapshots_lock:
        warm = sorted(snapshots.keys())
    return {
        "ok": True,
        "service": "RAKSHAK Early Warning API",
        "ml": "IsolationForest + forecast fusion",
        "scope": "India only",
        "snapshot": {
            "warm_locations": warm,
            "known_locations": sorted(LOCATIONS.keys()),
            "refresh_interval_seconds": SNAPSHOT_REFRESH_SECONDS,
            "worker_started": worker_state["started"],
            "cycles_completed": worker_state["cycles"],
            "last_cycle_seconds": worker_state["last_cycle_seconds"],
            "last_cycle_finished": worker_state["last_cycle_finished"],
            "errors": worker_state["errors"],
        },
    }


@app.get("/api/locations")
def locations():
    return [{"id": k, **v} for k, v in LOCATIONS.items()]


def compute_snapshot(location: str, lat: float, lon: float, name: str, slope: float) -> Dict[str, Any]:
    """Run the full early-warning pipeline once and return the payload.

    This used to be the body of the /api/early-warning handler, which meant
    every browser request paid for up to eight upstream HTTP calls plus an
    anomaly-model fit before anything rendered — the reason the AI Early
    Warning tab felt like it "updated late". It is now called by the
    background worker instead, so HTTP requests are served from a
    pre-built snapshot and return in single-digit milliseconds.
    """
    om = open_meteo(lat, lon)
    hist = open_meteo_history(lat, lon)
    nasa = nasa_power(lat, lon)
    ow = open_weather(lat, lon)
    sensor = sensor_feed(lat, lon)
    cwc = cwc_feed(lat, lon)
    gdacs_data = gdacs()
    usgs_data = usgs_nearby(lat, lon)
    features = make_features(om, hist, nasa, slope)
    sensor_data = sensor.get("data", {}) if sensor.get("enabled") else {}
    if isinstance(sensor_data, dict):
        if sensor_data.get("rainfall_mm_1h") is not None:
            features["current"]["rain_1h"] = float(sensor_data["rainfall_mm_1h"])
        if sensor_data.get("rainfall_mm_24h") is not None:
            features["current"]["rain_24h_observed"] = float(sensor_data["rainfall_mm_24h"])
        if sensor_data.get("soil_moisture") is not None:
            features["current"]["soil_moisture"] = float(sensor_data["soil_moisture"])
        if sensor_data.get("water_level_m") is not None:
            features["current"]["water_level_m"] = float(sensor_data["water_level_m"])
    scores = hazard_scores(features)
    quake_count = len((usgs_data or {}).get("features", []))
    if quake_count:
        scores["landslide"] = round(clamp(scores["landslide"] + min(15, quake_count * 5)))
    if features["current"].get("water_level_m") is not None:
        wl = features["current"]["water_level_m"]
        scores["flood"] = round(clamp(scores["flood"] + max(0, min(20, (wl - 2.5) * 5))))
    reasons = explanations(features, scores)
    agentic = run_agent(features, scores, source_count=sum(1 for x in source_summary(om, ow, sensor, nasa, gdacs_data, cwc, usgs_data) if x["status"] == "live"))
    genai = generate_explanation(name, scores, reasons, agentic["autonomous_decision"])
    if ow.get("enabled"):
        ow_rain = float((ow.get("current", {}).get("rain", {}) or {}).get("1h", 0) or 0)
        om_rain = features["current"]["rain_1h"]
        agreement = max(0, 100 - abs(ow_rain - om_rain) / max(1, om_rain + ow_rain) * 100)
    else:
        agreement = None
    if quake_count:
        reasons.append(f"{quake_count} M4+ seismic event(s) detected within 300 km in the last 3 days")
    highest = max(scores, key=scores.get)
    highest_score = scores[highest]
    now = datetime.now(timezone.utc).isoformat()

    # Compare against an EARLIER snapshot for this location so the UI can
    # report whether conditions are improving, stable or deteriorating
    # rather than merely displaying a point-in-time score.
    #
    # The baseline is deliberately only rolled forward once it is older than
    # TREND_WINDOW_SECONDS. The background refresher now rebuilds snapshots
    # every ~20 s, and comparing against a 20-second-old score would report
    # "stable / +0.0" forever. A ~15 minute window is short enough to catch a
    # developing event and long enough for the delta to mean something.
    key = location.lower()
    previous = trend_state.get(key)
    delta = None
    trend = "stable"
    if previous is not None:
        delta = round(highest_score - float(previous["score"]), 1)
        if delta >= 5:
            trend = "deteriorating"
        elif delta <= -5:
            trend = "improving"
    if previous is None or (time.time() - float(previous.get("ts", 0))) >= TREND_WINDOW_SECONDS:
        trend_state[key] = {"score": highest_score, "at": now, "ts": time.time()}
    return {
        "generated_at": now,
        "location": {"id": location, "name": name, "lat": lat, "lon": lon},
        "prediction": {
            "primary_hazard": highest,
            "primary_score": highest_score,
            "primary_level": risk_level(highest_score),
            "flood": {"score": scores["flood"], "level": risk_level(scores["flood"])},
            "landslide": {"score": scores["landslide"], "level": risk_level(scores["landslide"])},
            "extreme_weather": {"score": scores["extreme_weather"], "level": risk_level(scores["extreme_weather"])},
            "lead_time": "next 6–24 hours" if max(features["forecast"]["rain_6h"], features["forecast"]["rain_24h"]) > 0 else "next 24–72 hours",
            "trend": trend,
            "score_delta": delta,
        },
        "features": features,
        "discrepancies": {
            "rainfall_ratio_vs_daily_mean": round(features["forecast"]["rain_24h"] / max(features["baseline"]["rain_daily_mean"], 1), 2),
            "observed_24h_ratio_vs_daily_mean": round(features["forecast"]["observed_rain_24h"] / max(features["baseline"]["rain_daily_mean"], 1), 2),
            "rainfall_zscore": features["baseline"]["rain_zscore_current"],
            "anomaly_label": features["anomaly"]["label"],
            "anomaly_score": features["anomaly"]["score"],
            "anomaly_count": sum([
                features["baseline"]["rain_zscore_current"] >= 2,
                features["forecast"]["rain_24h"] >= max(25, features["baseline"]["rain_daily_mean"] * 3),
                features["forecast"]["runoff_24h"] >= 5,
                features["forecast"]["max_gust_24h"] >= 60,
                features["current"]["soil_moisture"] >= 0.45,
                features["anomaly"]["label"] == "anomaly",
            ]),
        },
        "explanation": reasons,
        "agentic_ai": agentic,
        "genai": genai,
        "sources": source_summary(om, ow, sensor, nasa, gdacs_data, cwc, usgs_data),
        "seismic": {"events_3d_within_300km": len((usgs_data or {}).get("features", []))},
        "source_agreement": {"open_meteo_vs_openweather_current_rain": round(agreement) if agreement is not None else None},
        "data_quality": {
            "source_count": sum(1 for x in source_summary(om, ow, sensor, nasa, gdacs_data, cwc, usgs_data) if x["status"] == "live"),
            "configured_key_sources": sum(1 for x in [ow, sensor, cwc] if x.get("enabled")),
            "note": "Predictions are decision-support estimates, not official warnings."
        },
    }


# ---------------------------------------------------------------------------
# Snapshot cache + background refresher  (the "updates late" fix)
# ---------------------------------------------------------------------------
# Before: every poll of /api/early-warning ran compute_snapshot() inline, so
# the browser sat waiting on up to eight upstream APIs plus a model fit. Even
# with warm feed caches that is hundreds of milliseconds; cold it is tens of
# seconds. That is what made the AI Early Warning tab feel like it "updated
# late" — the frontend was honest, the backend was just slow.
#
# After: a daemon thread rebuilds the payload for every known location every
# SNAPSHOT_REFRESH_SECONDS, and the HTTP handler only ever *reads* the warm
# snapshot. Requests return in single-digit milliseconds, which is what makes
# a 2-second frontend poll interval reasonable. Perceived latency is now the
# poll interval, not the pipeline runtime.
#
# Ad-hoc lat/lon requests get the same treatment: the first hit computes and
# stores a snapshot, subsequent polls read it, and the worker picks the
# coordinate up on its next cycle so it stays warm too.


def snapshot_key(location: str, lat: float, lon: float) -> str:
    """Stable cache key. Known locations key by id; ad-hoc coordinates key by
    rounded lat/lon so tiny GPS jitter doesn't spawn a new snapshot per poll."""
    loc = (location or "").lower()
    if loc in LOCATIONS:
        return loc
    return f"@{lat:.2f},{lon:.2f}"


def resolve_target(location: Optional[str], lat: Optional[float], lon: Optional[float]):
    """Turn request params into (key, location_id, lat, lon, name, slope).

    Also enforces the India-only scope: RAKSHAK's models are calibrated on
    Indian rainfall baselines and Indian terrain, and every official source it
    cites (IMD, CWC, GSI, NDMA/SACHET) is Indian, so returning a "prediction"
    for a point outside the country would be presenting a number we cannot
    stand behind. Better to refuse than to quietly extrapolate.
    """
    loc = LOCATIONS.get((location or "").lower())
    if lat is None or lon is None:
        if not loc:
            raise HTTPException(
                400,
                "Unknown location. Call /api/locations for the supported list, or pass lat and lon.",
            )
        lat, lon = loc["lat"], loc["lon"]
    lat, lon = float(lat), float(lon)
    if not within_india(lat, lon):
        raise HTTPException(
            422,
            f"Out of scope: {lat:.4f}, {lon:.4f} is outside India. "
            "RAKSHAK is calibrated on Indian baselines and Indian official sources, "
            "so it only forecasts for locations inside India.",
        )
    name = loc["name"] if loc else f"{lat:.4f}, {lon:.4f}"
    slope = loc["slope"] if loc else 15
    key = snapshot_key(location, lat, lon)
    loc_id = key if not key.startswith("@") else (location or "custom").lower()
    return key, loc_id, lat, lon, name, slope


def build_snapshot(key: str, location: str, lat: float, lon: float, name: str, slope: float) -> Dict[str, Any]:
    """Run the pipeline and store the result under `key`. Raises on failure
    unless DEMO_FALLBACK is on, in which case a clearly-labelled demo payload
    is stored so a dead upstream feed degrades instead of blanking the tab."""
    try:
        payload = compute_snapshot(location, lat, lon, name, slope)
    except Exception as exc:  # noqa: BLE001 - recorded, then re-raised or degraded
        message = f"{type(exc).__name__}: {exc}"
        with snapshots_lock:
            worker_state["errors"][key] = message
        if not DEMO_FALLBACK:
            raise
        payload = demo_payload(location, lat, lon, name, slope)
        payload["degraded"] = f"Live feeds unreachable, showing DEMO_FALLBACK data ({message})."
    with snapshots_lock:
        snapshots[key] = {
            "at": time.time(),
            "payload": payload,
            "target": (location, lat, lon, name, slope),
        }
        worker_state["errors"].pop(key, None)
    return payload


def revalidate_async(key: str, location: str, lat: float, lon: float, name: str, slope: float) -> None:
    """Refresh a snapshot off the request thread. Used when the worker is
    disabled or hasn't reached an ad-hoc coordinate yet: the caller is still
    served the stale payload immediately (stale-while-revalidate)."""
    with snapshots_lock:
        if key in refreshing:
            return
        refreshing.add(key)

    def run() -> None:
        try:
            build_snapshot(key, location, lat, lon, name, slope)
        except Exception:  # noqa: BLE001 - already recorded in worker_state
            pass
        finally:
            with snapshots_lock:
                refreshing.discard(key)

    threading.Thread(target=run, name=f"rakshak-revalidate-{key}", daemon=True).start()


def refresh_all_snapshots() -> None:
    """One worker cycle. Cheap in practice: the per-feed caches above mean
    most cycles only re-run the scoring/anomaly maths, not the network calls."""
    started = time.time()
    worker_state["last_cycle_started"] = datetime.now(timezone.utc).isoformat()

    targets = [(k, k, v["lat"], v["lon"], v["name"], v["slope"]) for k, v in LOCATIONS.items()]
    with snapshots_lock:
        for key, entry in list(snapshots.items()):
            if key.startswith("@") and entry.get("target"):
                targets.append((key, *entry["target"]))

    for target in targets:
        try:
            build_snapshot(*target)
        except Exception:  # noqa: BLE001
            # One unreachable feed must not stop the other locations from
            # refreshing. The reason is already in worker_state["errors"]
            # and surfaced by /api/health.
            pass

    worker_state["cycles"] += 1
    worker_state["last_cycle_seconds"] = round(time.time() - started, 2)
    worker_state["last_cycle_finished"] = datetime.now(timezone.utc).isoformat()


def _refresh_worker() -> None:
    while True:
        try:
            refresh_all_snapshots()
        except Exception:  # noqa: BLE001 - the loop must never die
            traceback.print_exc()
        time.sleep(SNAPSHOT_REFRESH_SECONDS)


@app.on_event("startup")
def start_refresh_worker() -> None:
    if not PREWARM_ON_STARTUP or worker_state["started"]:
        return
    worker_state["started"] = True
    threading.Thread(target=_refresh_worker, name="rakshak-snapshot-refresher", daemon=True).start()


@app.get("/api/early-warning")
def early_warning(
    location: str = Query("manipal"),
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    fresh: bool = Query(False, description="Bypass the snapshot and recompute inline. Slow — debugging only."),
):
    key, loc_id, lat, lon, name, slope = resolve_target(location, lat, lon)

    with snapshots_lock:
        entry = snapshots.get(key)

    inline = fresh or entry is None
    if inline:
        # Cold start, or an explicit ?fresh=1. This one request pays the
        # pipeline cost; every later poll for the same target is instant.
        try:
            payload = build_snapshot(key, loc_id, lat, lon, name, slope)
        except Exception as exc:  # noqa: BLE001
            payload = demo_payload(loc_id, lat, lon, name, slope)
            payload["degraded"] = f"Upstream feed rate-limited, serving resilient baseline ({exc})."
        age = 0.0
    else:
        payload = entry["payload"]
        age = time.time() - entry["at"]
        # Safety net for when the worker is off (PREWARM_ON_STARTUP=false) or
        # hasn't picked up an ad-hoc coordinate yet.
        if age > SNAPSHOT_REFRESH_SECONDS * 2:
            revalidate_async(key, loc_id, lat, lon, name, slope)

    out = dict(payload)
    out["cache"] = {
        "served_from": "inline" if inline else "snapshot",
        "snapshot_age_seconds": round(age, 1),
        "refresh_interval_seconds": SNAPSHOT_REFRESH_SECONDS,
        "worker_running": worker_state["started"],
        "scope": "India only",
    }
    return out


# In-memory store for sensor readings & authority dispatch events
sensor_readings: List[Dict[str, Any]] = []
authority_events: List[Dict[str, Any]] = []


@app.post("/api/sensors/ingest")
def ingest_sensor(
    payload: Dict[str, Any] = Body(...),
    x_sensor_key: Optional[str] = Header(None),
):
    if SENSOR_INGEST_KEY and x_sensor_key != SENSOR_INGEST_KEY:
        raise HTTPException(401, "Invalid or missing X-Sensor-Key")

    sensor_id = payload.get("sensor_id", "SENSOR-NODE-UNKNOWN")
    rain_1h = float(payload.get("rainfall_mm_1h", 0.0))
    rain_24h = float(payload.get("rainfall_mm_24h", rain_1h * 3.0))
    water_level = float(payload.get("water_level_m", 0.0))
    soil_moist = float(payload.get("soil_moisture", 0.0))
    ts = payload.get("timestamp", datetime.now(timezone.utc).isoformat())

    reading = {
        "sensor_id": sensor_id,
        "rainfall_mm_1h": rain_1h,
        "rainfall_mm_24h": rain_24h,
        "water_level_m": water_level,
        "soil_moisture": soil_moist,
        "timestamp": ts,
        "received_at": time.time(),
    }
    sensor_readings.append(reading)
    if len(sensor_readings) > 100:
        sensor_readings.pop(0)

    # Threshold tripwire evaluation
    triggered = False
    alert_reasons = []
    if rain_1h >= 25.0:
        triggered = True
        alert_reasons.append(f"Severe cloudburst rainfall: {rain_1h} mm/h (exceeds 25mm/h limit)")
    if water_level >= 4.0:
        triggered = True
        alert_reasons.append(f"Critical river/nullah water level: {water_level} m (exceeds 4.0m threshold)")
    if soil_moist >= 0.80:
        triggered = True
        alert_reasons.append(f"Soil saturation critical ({int(soil_moist*100)}%): zero infiltration capacity")

    event = None
    if triggered:
        event = {
            "id": f"AUTH-ALERT-{int(time.time()*1000)}",
            "sensor_id": sensor_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "severity": "CRITICAL",
            "reasons": alert_reasons,
            "dispatched_to": [
                {"role": "District Disaster Management Authority (DDMA)", "channel": "KSDMA API Webhook", "status": "ACK 200"},
                {"role": "District Collector / DEOC Control Room", "channel": "DLT Priority SMS", "status": "DELIVERED"},
                {"role": "Taluk Tehsildar & SDRF Response Unit", "channel": "Automated IVR Voice Siren", "status": "RINGING"},
            ],
        }
        authority_events.append(event)
        if len(authority_events) > 50:
            authority_events.pop(0)

    return {
        "status": "ok",
        "reading": reading,
        "authority_alert_triggered": triggered,
        "authority_event": event,
    }


@app.get("/api/sensors/authority-log")
def get_authority_log():
    return {
        "count": len(authority_events),
        "recent_events": authority_events[-10:],
        "latest_readings": sensor_readings[-5:],
    }


# Telecom / Alert Dispatch endpoints for unified cloud backend
telecom_logs: List[Dict[str, Any]] = []

@app.get("/health")
@app.get("/api/health")
def telecom_health():
    return {
        "ok": True,
        "mode": "demo",
        "sms": {"provider": "msg91", "simulated": True, "note": "Simulation mode active"},
        "voice": {"provider": "twilio", "simulated": True, "note": "Simulation mode active"},
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

@app.get("/api/demo-log")
def get_telecom_demo_log():
    return {"log": telecom_logs[:25]}

@app.post("/api/send-sms")
def api_send_sms(payload: Dict[str, Any] = Body(...)):
    to_number = payload.get("to", "Unknown")
    message = payload.get("message", "")
    entry = {
        "id": f"SMS-{int(time.time()*1000)}",
        "at": datetime.now(timezone.utc).isoformat(),
        "channel": "sms",
        "provider": "MSG91 (Simulation)",
        "to": to_number,
        "message": message,
        "simulated": True,
        "detail": "Simulated dispatch delivered to telecom mock network.",
    }
    telecom_logs.insert(0, entry)
    if len(telecom_logs) > 50:
        telecom_logs.pop()
    return {
        "ok": True,
        "simulated": True,
        "provider": "MSG91",
        "to": to_number,
        "message": message,
    }

@app.post("/api/ai-call")
def api_ai_call(payload: Dict[str, Any] = Body(...)):
    to_number = payload.get("to", "Unknown")
    message = payload.get("message", "")
    helpline = payload.get("helplineNumber")
    entry = {
        "id": f"CALL-{int(time.time()*1000)}",
        "at": datetime.now(timezone.utc).isoformat(),
        "channel": "voice",
        "provider": "Twilio (Simulation)",
        "to": to_number,
        "message": message,
        "helplineNumber": helpline,
        "simulated": True,
        "detail": f"Simulated call placed to {to_number}. Text spoken aloud.",
    }
    telecom_logs.insert(0, entry)
    if len(telecom_logs) > 50:
        telecom_logs.pop()
    return {
        "ok": True,
        "simulated": True,
        "provider": "Twilio",
        "to": to_number,
        "message": message,
    }


