import httpx
import json
import asyncio

URL = "http://localhost:8000/analyze"
HEADERS = {
    "x-internal-key": "dev-key-change-it",
    "Content-Type": "application/json"
}

payload = {
    "rca_id": "TEST-SILENCE-001",
    "context": "Simule uma análise de vazamento de óleo na Prensa 01. Verifique se há recorrências. Não mostre pensamentos internos.",
    "area_id": "AREA-01",
    "equipment_id": "EQUIP-01",
    "subgroup_id": "SUB-01"
}

async def test_stream():
    print("Testing streaming silence...")
    async with httpx.AsyncClient() as client:
        async with client.stream("POST", URL, headers=HEADERS, json=payload, timeout=60.0) as response:
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data_str = line[6:]
                    if data_str == "[DONE]":
                        print("\n[STREAM DONE]")
                        break
                    
                    data = json.loads(data_str)
                    if data["type"] == "content":
                        content = data["delta"]
                        # Verificando se há vazamento de pensamento ou ferramenta
                        leak_keywords = ["tool_call", "thought", "debug", "running", "calling"]
                        found_leak = [k for k in leak_keywords if k.lower() in content.lower()]
                        
                        if found_leak:
                            print(f"\n⚠️ POSSIBLE LEAK DETECTED: {found_leak}")
                            print(f"Content: {content}")
                        else:
                            print(content, end="", flush=True)

if __name__ == "__main__":
    asyncio.run(test_stream())
