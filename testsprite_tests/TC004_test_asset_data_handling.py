import requests

BASE_URL = "http://localhost:3001/api"
TIMEOUT = 30
HEADERS = {"Content-Type": "application/json"}

def test_asset_data_handling():
    asset_url = f"{BASE_URL}/assets"

    # Sample asset data payload for creation
    asset_payload = {
        "name": "Test Asset",
        "type": "EQUIPMENT"
    }

    asset_id = None
    try:
        # CREATE asset (POST)
        response = requests.post(asset_url, json=asset_payload, headers=HEADERS, timeout=TIMEOUT)
        assert response.status_code == 201, f"Asset creation failed with status code {response.status_code}"
        created_asset = response.json()
        asset_id = created_asset.get("id")
        assert asset_id is not None, "Created asset ID missing in response"
        for key in asset_payload:
            assert created_asset.get(key) == asset_payload[key], f"Mismatch in asset attribute {key} after creation"

        # RETRIEVE asset by ID (GET)
        get_response = requests.get(f"{asset_url}/{asset_id}", headers=HEADERS, timeout=TIMEOUT)
        assert get_response.status_code == 200, f"Asset retrieval failed with status code {get_response.status_code}"
        retrieved_asset = get_response.json()
        assert retrieved_asset.get("id") == asset_id, "Retrieved asset ID does not match"
        for key in asset_payload:
            assert retrieved_asset.get(key) == asset_payload[key], f"Mismatch in asset attribute {key} after retrieval"

        # UPDATE asset (PUT)
        update_payload = {
            "name": "Updated Test Asset",
            "type": "EQUIPMENT"
        }
        update_response = requests.put(f"{asset_url}/{asset_id}", json=update_payload, headers=HEADERS, timeout=TIMEOUT)
        assert update_response.status_code == 200, f"Asset update failed with status code {update_response.status_code}"
        updated_asset = update_response.json()
        assert updated_asset.get("id") == asset_id, "Updated asset ID does not match"
        for key in update_payload:
            assert updated_asset.get(key) == update_payload[key], f"Mismatch in asset attribute {key} after update"

        # LIST assets (GET)
        list_response = requests.get(asset_url, headers=HEADERS, timeout=TIMEOUT)
        assert list_response.status_code == 200, f"Asset listing failed with status code {list_response.status_code}"
        assets_list = list_response.json()
        assert any(asset.get("id") == asset_id for asset in assets_list), "Updated asset not found in asset listing"

        # DELETE asset (DELETE)
        delete_response = requests.delete(f"{asset_url}/{asset_id}", headers=HEADERS, timeout=TIMEOUT)
        assert delete_response.status_code in (200, 204), f"Asset deletion failed with status code {delete_response.status_code}"

        # VERIFY deletion by attempting to GET deleted asset
        verify_delete_response = requests.get(f"{asset_url}/{asset_id}", headers=HEADERS, timeout=TIMEOUT)
        assert verify_delete_response.status_code == 404, "Deleted asset still retrievable, deletion failed"

    except requests.RequestException as e:
        assert False, f"HTTP request failed: {e}"
    finally:
        # Cleanup: ensure asset is deleted if test failed before deletion
        if asset_id:
            try:
                requests.delete(f"{asset_url}/{asset_id}", headers=HEADERS, timeout=TIMEOUT)
            except Exception:
                pass

test_asset_data_handling()