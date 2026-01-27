import requests
import uuid

BASE_URL = "http://localhost:3001/api"
HEADERS = {"Content-Type": "application/json"}
TIMEOUT = 30

def test_taxonomy_management_endpoints():
    # Helper functions
    def create_category(name, description=None):
        payload = {
            "name": name,
            "description": description or "Test category description"
        }
        r = requests.post(f"{BASE_URL}/taxonomy/categories", json=payload, headers=HEADERS, timeout=TIMEOUT)
        r.raise_for_status()
        return r.json()

    def get_category(category_id):
        r = requests.get(f"{BASE_URL}/taxonomy/categories/{category_id}", headers=HEADERS, timeout=TIMEOUT)
        return r

    def update_category(category_id, updates):
        r = requests.put(f"{BASE_URL}/taxonomy/categories/{category_id}", json=updates, headers=HEADERS, timeout=TIMEOUT)
        return r

    def delete_category(category_id):
        r = requests.delete(f"{BASE_URL}/taxonomy/categories/{category_id}", headers=HEADERS, timeout=TIMEOUT)
        return r

    def create_definition(term, meaning, category_id):
        payload = {
            "term": term,
            "meaning": meaning,
            "categoryId": category_id
        }
        r = requests.post(f"{BASE_URL}/taxonomy/definitions", json=payload, headers=HEADERS, timeout=TIMEOUT)
        r.raise_for_status()
        return r.json()

    def get_definition(definition_id):
        r = requests.get(f"{BASE_URL}/taxonomy/definitions/{definition_id}", headers=HEADERS, timeout=TIMEOUT)
        return r

    def update_definition(definition_id, updates):
        r = requests.put(f"{BASE_URL}/taxonomy/definitions/{definition_id}", json=updates, headers=HEADERS, timeout=TIMEOUT)
        return r

    def delete_definition(definition_id):
        r = requests.delete(f"{BASE_URL}/taxonomy/definitions/{definition_id}", headers=HEADERS, timeout=TIMEOUT)
        return r

    # Begin test
    # Create a new category
    category_name = f"TestCategory-{uuid.uuid4()}"
    category_desc = "Category for testing taxonomy endpoints"
    category = create_category(category_name, category_desc)
    category_id = category.get("id")
    assert category_id is not None, "Category creation failed, no ID returned"
    assert category["name"] == category_name
    assert category.get("description") == category_desc

    try:
        # Retrieve the created category
        r = get_category(category_id)
        assert r.status_code == 200
        category_data = r.json()
        assert category_data["id"] == category_id
        assert category_data["name"] == category_name

        # Attempt invalid category creation: missing name (validation)
        r_invalid = requests.post(f"{BASE_URL}/taxonomy/categories", json={"description": "No name"}, headers=HEADERS, timeout=TIMEOUT)
        assert r_invalid.status_code == 400 or r_invalid.status_code == 422

        # Update category
        new_desc = "Updated category description"
        r_update = update_category(category_id, {"description": new_desc})
        assert r_update.status_code == 200
        updated_category = r_update.json()
        assert updated_category["description"] == new_desc

        # Create a definition under the category
        term = f"Term-{uuid.uuid4()}"
        meaning = "Meaning of the term for testing"
        definition = create_definition(term, meaning, category_id)
        definition_id = definition.get("id")
        assert definition_id is not None
        assert definition["term"] == term
        assert definition["meaning"] == meaning
        assert definition["categoryId"] == category_id

        try:
            # Retrieve the definition
            r_def = get_definition(definition_id)
            assert r_def.status_code == 200
            def_data = r_def.json()
            assert def_data["id"] == definition_id
            assert def_data["term"] == term

            # Attempt invalid definition creation: missing term
            r_def_invalid = requests.post(f"{BASE_URL}/taxonomy/definitions", json={"meaning": "No term", "categoryId": category_id}, headers=HEADERS, timeout=TIMEOUT)
            assert r_def_invalid.status_code == 400 or r_def_invalid.status_code == 422

            # Update definition
            new_meaning = "Updated meaning"
            r_def_update = update_definition(definition_id, {"meaning": new_meaning})
            assert r_def_update.status_code == 200
            updated_def = r_def_update.json()
            assert updated_def["meaning"] == new_meaning
        finally:
            # Delete definition
            r_del_def = delete_definition(definition_id)
            assert r_del_def.status_code == 204 or r_del_def.status_code == 200

        # Delete category
        r_del_cat = delete_category(category_id)
        assert r_del_cat.status_code == 204 or r_del_cat.status_code == 200

        # Verify deletion category
        r_after_del = get_category(category_id)
        assert r_after_del.status_code == 404
    except Exception:
        # Ensure cleanup even on error
        try:
            if category_id:
                delete_category(category_id)
        except Exception:
            pass
        raise

test_taxonomy_management_endpoints()