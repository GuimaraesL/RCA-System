import requests
import time

BASE_URL = "http://localhost:3001/api"
HEADERS = {"Content-Type": "application/json"}
TIMEOUT = 30

def test_trigger_event_creation_and_retrieval():
    # Sample valid trigger event payload
    valid_trigger = {
        "title": "Test Trigger Event",
        "description": "This is a test trigger event for validation.",
        "timestamp": int(time.time()),
        "machine_id": "machine-123",
        "event_type": "stop",
        "severity": "high",
        "metadata": {
            "operator": "test_operator",
            "shift": "day"
        }
    }
    # Sample invalid trigger event payload (missing required fields or invalid data)
    invalid_trigger = {
        "title": "",  # empty title, assuming title required non-empty
        "timestamp": "not-a-timestamp",
        "severity": "unknown_severity"
    }

    created_trigger_id = None

    try:
        # 1. Test creation of valid trigger event
        resp_create_valid = requests.post(
            f"{BASE_URL}/triggers",
            json=valid_trigger,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert resp_create_valid.status_code == 201, f"Expected 201 on valid creation but got {resp_create_valid.status_code}"
        created_data = resp_create_valid.json()
        assert "id" in created_data, "Response JSON must contain 'id' for created trigger event"
        created_trigger_id = created_data["id"]

        # 2. Retrieve the created trigger event by ID
        resp_get = requests.get(
            f"{BASE_URL}/triggers/{created_trigger_id}",
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert resp_get.status_code == 200, f"Expected 200 retrieving created trigger but got {resp_get.status_code}"
        retrieved = resp_get.json()
        for key in valid_trigger:
            # Only compare keys present in the creation payload
            if key in retrieved:
                assert retrieved[key] == valid_trigger[key], f"Mismatch in field '{key}' on retrieved trigger"

        # 3. Test creation of invalid trigger event - expect HTTP 400 or 422
        resp_create_invalid = requests.post(
            f"{BASE_URL}/triggers",
            json=invalid_trigger,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert resp_create_invalid.status_code in (400, 422), f"Expected 400 or 422 on invalid creation but got {resp_create_invalid.status_code}"

        # 4. Performance test: create and list 2000 trigger events and validate no latency issues
        bulk_triggers = []
        base_epoch = int(time.time())
        for i in range(2000):
            bulk_triggers.append({
                "title": f"Bulk Trigger {i}",
                "description": "Performance test trigger event",
                "timestamp": base_epoch + i,
                "machine_id": f"machine-{i%50}",
                "event_type": "stop",
                "severity": "medium",
                "metadata": {"index": i}
            })
        # Create in batches to avoid overwhelming server in one request if endpoint does not support bulk create
        # We assume only single create endpoint, so create individually but measure timing
        start_time = time.time()
        created_ids = []
        for trig in bulk_triggers:
            r = requests.post(
                f"{BASE_URL}/triggers",
                json=trig,
                headers=HEADERS,
                timeout=TIMEOUT
            )
            assert r.status_code == 201, f"Bulk create trigger failed with status {r.status_code}"
            created_ids.append(r.json()["id"])
        duration_create = time.time() - start_time

        # Retrieve list of triggers and verify performance and data count
        start_time = time.time()
        resp_list = requests.get(
            f"{BASE_URL}/triggers",
            headers=HEADERS,
            timeout=TIMEOUT
        )
        duration_list = time.time() - start_time
        assert resp_list.status_code == 200, f"Expected 200 getting trigger list but got {resp_list.status_code}"
        triggers_list = resp_list.json()
        assert isinstance(triggers_list, list), "Trigger list response must be a list"
        # Ensure at least 2000 triggers present
        assert len(triggers_list) >= 2000, f"Expected at least 2000 triggers but got {len(triggers_list)}"

        # Assert performance is reasonable (arbitrary: creation for all < 120s, listing < 10s)
        assert duration_create < 120, f"Bulk creation took too long: {duration_create} seconds"
        assert duration_list < 10, f"Trigger listing took too long: {duration_list} seconds"

    finally:
        # Cleanup all created triggers if possible
        if created_trigger_id:
            try:
                requests.delete(
                    f"{BASE_URL}/triggers/{created_trigger_id}",
                    headers=HEADERS,
                    timeout=TIMEOUT
                )
            except Exception:
                pass
        if 'created_ids' in locals():
            for tid in created_ids:
                try:
                    requests.delete(
                        f"{BASE_URL}/triggers/{tid}",
                        headers=HEADERS,
                        timeout=TIMEOUT
                    )
                except Exception:
                    pass

test_trigger_event_creation_and_retrieval()