def clamp(x):
    return max(0, min(100, float(x)))


def risk_level(score):
    if score >= 85: return "EXTREME"
    if score >= 65: return "HIGH"
    if score >= 40: return "MODERATE"
    return "LOW"


def hazard_scores(features):
    c, b, f = features["current"], features["baseline"], features["forecast"]
    slope = features["terrain"]["slope_degrees"]
    anomaly = features["anomaly"]["score"] * 100
    rain_ratio = f["rain_24h"] / max(b["rain_daily_mean"], 1.0)
    rain_p95_ratio = f["rain_24h"] / max(b["rain_daily_p95"], 1.0)
    flood = clamp(0.32*min(100,rain_ratio*25)+0.25*min(100,rain_p95_ratio*35)+0.18*min(100,f["runoff_24h"]*10)+0.15*min(100,c["soil_moisture"]*100)+0.10*anomaly)
    landslide = clamp(0.28*min(100,rain_ratio*25)+0.20*min(100,rain_p95_ratio*35)+0.20*min(100,slope/35*100)+0.17*min(100,c["soil_moisture"]*100)+0.15*anomaly)
    extreme = clamp(0.25*min(100,f["max_gust_24h"]/90*100)+0.20*min(100,f["max_cape_24h"]/2500*100)+0.20*min(100,max(0,1015-f["min_pressure_24h"])/30*100)+0.20*min(100,f["max_temp_72h"]/45*100)+0.15*min(100,rain_ratio*20))
    return {"flood": round(flood), "landslide": round(landslide), "extreme_weather": round(extreme)}
