import requests

BASE_URL = "http://localhost:3001/api"
TIMEOUT = 30
HEADERS = {"Accept": "application/json"}


def test_database_connection_and_initialization():
    try:
        # Test database connection and initialization status endpoint
        # Assuming there's an endpoint to check DB status or init status
        response = requests.get(f"{BASE_URL}/db/status", headers=HEADERS, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected status code 200 but got {response.status_code}"
        json_resp = response.json()

        # Validate required keys that indicate proper initialization and backup setup
        assert isinstance(json_resp, dict), "Response is not a JSON object"
        assert "initialized" in json_resp, "'initialized' key not in response"
        assert "backupConfigured" in json_resp, "'backupConfigured' key not in response"
        assert json_resp["initialized"] is True, "Database is not initialized properly"
        assert json_resp["backupConfigured"] is True, "Database backup is not configured properly"

    except requests.RequestException as e:
        assert False, f"Request to check database status failed: {e}"

    except ValueError:
        assert False, "Response content is not JSON"


test_database_connection_and_initialization()