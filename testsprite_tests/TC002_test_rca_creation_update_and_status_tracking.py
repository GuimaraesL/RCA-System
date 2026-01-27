import requests
import time

BASE_URL = "http://localhost:3001/api"
HEADERS = {"Content-Type": "application/json"}
TIMEOUT = 30

def test_rca_creation_update_and_status_tracking():
    rca_id = None
    try:
        # Step 1: Create a new RCA with minimal required fields
        create_payload = {
            "title": "Test RCA creation",
            "description": "Initial RCA creation for testing status calculation",
            "author": "tester",
            "root_causes": [],
            "corrective_actions": []
        }
        create_resp = requests.post(f"{BASE_URL}/rcas", json=create_payload, headers=HEADERS, timeout=TIMEOUT)
        assert create_resp.status_code == 201, f"Expected 201 Created, got {create_resp.status_code}"
        rca = create_resp.json()
        rca_id = rca.get("id")
        assert rca_id is not None, "Created RCA ID is None"
        
        # After creation, check status field automatically calculated
        status = rca.get("status")
        assert status is not None, "Status field missing after RCA creation"

        # Step 2: Update the RCA to add required fields to change status
        update_payload = {
            "description": "Updated RCA with all required fields filled",
            "root_causes": ["Cause A", "Cause B"],
            "corrective_actions": ["Action 1"]
        }
        update_resp = requests.put(f"{BASE_URL}/rcas/{rca_id}", json=update_payload, headers=HEADERS, timeout=TIMEOUT)
        assert update_resp.status_code == 200, f"Expected 200 OK on update, got {update_resp.status_code}"
        updated_rca = update_resp.json()

        # Step 3: Verify automatic status calculation after update
        updated_status = updated_rca.get("status")
        assert updated_status is not None, "Status missing after RCA update"
        assert updated_status != status, "Status did not update automatically after required fields changed"

        # Step 4: Retrieve the RCA and verify status consistency
        get_resp = requests.get(f"{BASE_URL}/rcas/{rca_id}", headers=HEADERS, timeout=TIMEOUT)
        assert get_resp.status_code == 200, f"Expected 200 OK on get, got {get_resp.status_code}"
        rca_data = get_resp.json()
        assert rca_data.get("status") == updated_status, "Status mismatch on retrieval"

        # Step 5: Test error handling - update with invalid payload
        invalid_payload = {
            "title": ""
        }
        invalid_resp = requests.put(f"{BASE_URL}/rcas/{rca_id}", json=invalid_payload, headers=HEADERS, timeout=TIMEOUT)
        assert invalid_resp.status_code in (400, 422), f"Expected client error on invalid update, got {invalid_resp.status_code}"

    finally:
        if rca_id:
            try:
                del_resp = requests.delete(f"{BASE_URL}/rcas/{rca_id}", headers=HEADERS, timeout=TIMEOUT)
                assert del_resp.status_code in (200, 204), f"Failed to delete RCA with id {rca_id}"
            except Exception:
                pass

test_rca_creation_update_and_status_tracking()
