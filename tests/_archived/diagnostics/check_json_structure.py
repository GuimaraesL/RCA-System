import json

def check():
    with open('tests/data/rca_migration_v17_consolidated.json', encoding='utf-8') as f:
        data = json.load(f)
    
    target_id = 'c02a20e2-8186-4541-ad9a-d4ad1ce10264'
    rec = next((r for r in data['records'] if r.get('id') == target_id), None)
    
    if rec:
        print(f"Top Level equipment_id: {rec.get('equipment_id')}")
        print(f"Top Level subgroup_id: {rec.get('subgroup_id')}")
        print(f"Location object: {rec.get('location')}")
        
        if 'location' in rec and rec['location']:
            print(f"Nested equipment_id: {rec['location'].get('equipment_id')}")

if __name__ == "__main__":
    check()
