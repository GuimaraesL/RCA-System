import httpx
import json

URL = "http://localhost:8000/analyze"
HEADERS = {
    "x-internal-key": "dev-key-change-it",
    "Content-Type": "application/json"
}

payload = {
    "rca_id": "RCA-DEBUG-001",
    "context": json.dumps({
        "title": "Falha no motor",
        "description": "Superaquecimento detectado",
        "asset_display": "Motor Principal do Conveyor 01 (Rascunho)",
        "date": "2026-02-22",
        "current_causes": "Causa preliminar"
    }),
    "area_id": "AREA-01",
    "equipment_id": "EQUIP-01",
    "subgroup_id": "SUB-01"
}

try:
    response = httpx.post(URL, headers=HEADERS, json=payload, timeout=30.0)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {str(e)}")
