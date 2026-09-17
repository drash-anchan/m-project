"""Agentic AI decision workflow.

This is an orchestration layer: it chooses which checks/actions to perform
based on incoming evidence instead of making a single static prediction.
"""

def run_agent(features, scores, source_count=0):
    actions = ["collect_live_data", "compare_with_historical_baseline", "run_anomaly_detection"]
    reasons = []
    highest = max(scores, key=scores.get)
    high = scores[highest] >= 65
    if features.get("anomaly", {}).get("label") == "anomaly":
        actions += ["cross_check_independent_sources", "inspect_forecast_window"]
        reasons.append("Anomaly detected; independent-source verification requested")
    if high:
        actions += ["estimate_lead_time", "prepare_response_recommendation"]
        reasons.append(f"{highest} risk is {scores[highest]}%, so response preparation is warranted")
    if source_count < 3:
        reasons.append("Limited source coverage; confidence should be treated cautiously")
    return {"agent": "RAKSHA Agentic AI", "actions": actions, "reasons": reasons,
            "next_step": actions[-1], "autonomous_decision": "verify_and_prepare" if high else "continue_monitoring"}
