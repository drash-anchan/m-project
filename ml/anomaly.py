from typing import List, Dict
from sklearn.ensemble import IsolationForest


def detect_anomaly(history: List[List[float]], current: List[float]) -> Dict:
    """Learn the local normal pattern and score the new observation."""
    if len(history) < 30:
        return {"score": 0.0, "label": "normal", "model": "insufficient-history"}
    model = IsolationForest(n_estimators=150, contamination=0.05, random_state=42)
    model.fit(history)
    raw = float(model.decision_function([current])[0])
    pred = int(model.predict([current])[0])
    anomaly = max(0.0, min(1.0, 0.5 - raw)) * 2.0
    return {"score": round(anomaly, 3), "label": "anomaly" if pred == -1 else "normal", "model": "IsolationForest"}
