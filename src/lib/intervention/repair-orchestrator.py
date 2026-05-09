import sys
import json

def analyze_intent(intent_data, state_data):
    intent = intent_data.get('intent', 'UNKNOWN')
    target = intent_data.get('target', 'UNKNOWN')
    
    # Analyze the institutional state to formulate a strategy
    strategy = {
        "status": "ANALYZED",
        "action": "NONE",
        "affected_nodes": [],
        "risk_assessment": "LOW",
        "proposed_solution": "No action needed."
    }
    
    if intent == 'EMERGENCY_SUBSTITUTION':
        strategy["action"] = "SUBSTITUTE_TEACHER"
        strategy["affected_nodes"] = [f"teacher_{target}"]
        strategy["risk_assessment"] = "HIGH"
        strategy["proposed_solution"] = f"Identify available fallback teacher for '{target}' and reassign periods for today. Relax soft constraints."
    elif intent == 'LOCALIZED_REPAIR':
        strategy["action"] = "MICRO_ADJUSTMENT"
        strategy["risk_assessment"] = "MEDIUM"
        strategy["proposed_solution"] = "Execute localized heuristic shift on conflicted slots without re-optimizing the entire matrix."

    return strategy

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Missing intent or state payload"}))
        sys.exit(1)
        
    try:
        intent_data = json.loads(sys.argv[1])
        state_data = json.loads(sys.argv[2])
        
        strategy = analyze_intent(intent_data, state_data)
        print(json.dumps(strategy))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
