import requests
import uuid

BASE_URL = "http://localhost:3001/api"
TIMEOUT = 30

def test_corrective_action_plan_management():
    headers = {"Content-Type": "application/json"}
    
    # Step 1: Create a Root Cause Analysis (RCA) to link the corrective action plan
    rca_payload = {
        "title": "Test RCA for corrective action",
        "description": "Root cause analysis created for testing corrective action plans.",
        "status": "open"
    }
    rca_response = requests.post(f"{BASE_URL}/rcas", json=rca_payload, headers=headers, timeout=TIMEOUT)
    assert rca_response.status_code == 201, f"Failed to create RCA: {rca_response.text}"
    rca = rca_response.json()
    rca_id = rca.get("id")
    assert rca_id, "RCA ID not found in creation response"

    try:
        # Step 2: Create a corrective action plan linked to the RCA
        action_plan_payload = {
            "rcaId": rca_id,
            "title": "Test Corrective Action Plan",
            "description": "This is a test corrective action plan linked to an RCA.",
            "deadline": "2026-12-31T23:59:59Z",
            "status": "open",
            "responsible": "test_user"
        }
        create_response = requests.post(f"{BASE_URL}/actions", json=action_plan_payload, headers=headers, timeout=TIMEOUT)
        assert create_response.status_code == 201, f"Failed to create corrective action plan: {create_response.text}"
        action_plan = create_response.json()
        action_id = action_plan.get("id")
        assert action_id, "Corrective action plan ID missing in creation response"

        # Step 3: Retrieve the created corrective action plan to verify creation
        get_response = requests.get(f"{BASE_URL}/actions/{action_id}", headers=headers, timeout=TIMEOUT)
        assert get_response.status_code == 200, f"Failed to retrieve corrective action plan: {get_response.text}"
        retrieved_action = get_response.json()
        assert retrieved_action["id"] == action_id, "Retrieved corrective action plan ID mismatch"
        assert retrieved_action["rcaId"] == rca_id, "RCA ID mismatch in corrective action plan"
        assert retrieved_action["title"] == action_plan_payload["title"], "Title mismatch in corrective action plan"
        assert retrieved_action["status"] == action_plan_payload["status"], "Status mismatch in corrective action plan"
        
        # Step 4: Update the corrective action plan's status and responsible user
        update_payload = {
            "status": "in_progress",
            "responsible": "updated_user"
        }
        update_response = requests.put(f"{BASE_URL}/actions/{action_id}", json=update_payload, headers=headers, timeout=TIMEOUT)
        assert update_response.status_code == 200, f"Failed to update corrective action plan: {update_response.text}"
        updated_action = update_response.json()
        assert updated_action["status"] == update_payload["status"], "Update of status failed"
        assert updated_action["responsible"] == update_payload["responsible"], "Update of responsible user failed"

        # Step 5: Retrieve audit trail for the corrective action plan to check for recorded changes
        audit_response = requests.get(f"{BASE_URL}/actions/{action_id}/audit", headers=headers, timeout=TIMEOUT)
        assert audit_response.status_code == 200, f"Failed to retrieve audit trail: {audit_response.text}"
        audit_trail = audit_response.json()
        assert isinstance(audit_trail, list), "Audit trail should be a list"
        assert any("status" in entry.get("changes", {}) for entry in audit_trail), "Audit trail missing status changes"
        assert any("responsible" in entry.get("changes", {}) for entry in audit_trail), "Audit trail missing responsible changes"

    finally:
        # Cleanup: Delete the corrective action plan if it was created
        if 'action_id' in locals():
            requests.delete(f"{BASE_URL}/actions/{action_id}", headers=headers, timeout=TIMEOUT)
        # Cleanup: Delete the RCA
        if rca_id:
            requests.delete(f"{BASE_URL}/rcas/{rca_id}", headers=headers, timeout=TIMEOUT)

test_corrective_action_plan_management()