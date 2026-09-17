import os
import requests


def generate_explanation(location_name, scores, reasons, agent_decision):
    """Generate a human-readable incident brief.

    Uses an OpenAI-compatible API when GENAI_API_KEY and GENAI_API_URL are
    configured. Otherwise returns a deterministic local explanation, so the
    demo still works without a paid LLM key.
    """
    api_key = os.getenv("GENAI_API_KEY", "").strip()
    api_url = os.getenv("GENAI_API_URL", "").strip()
    model = os.getenv("GENAI_MODEL", "gpt-4o-mini").strip()
    if api_key and api_url:
        prompt = (f"Create a concise emergency intelligence brief for {location_name}. "
                  f"Hazard scores: {scores}. Evidence: {reasons}. Agent decision: {agent_decision}. "
                  "State what changed, likely hazard, lead-time implication and recommended verification/action. "
                  "Do not claim certainty or issue an official warning.")
        try:
            r = requests.post(api_url, headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                              json={"model": model, "messages": [{"role": "user", "content": prompt}], "temperature": 0.2}, timeout=12)
            r.raise_for_status()
            content = r.json()["choices"][0]["message"]["content"]
            return {"mode": "live-genai", "model": model, "brief": content}
        except Exception:
            pass
    primary = max(scores, key=scores.get)
    return {"mode": "local-fallback", "model": "rule-based-demo",
            "brief": f"{location_name}: {primary.replace('_',' ')} conditions are being monitored. "
                     + (reasons[0] if reasons else "No major anomaly has been detected.") +
                     " Continue verification across independent sources before issuing an official warning."}
