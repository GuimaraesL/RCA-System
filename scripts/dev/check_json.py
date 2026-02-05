import json
import os

filepath = os.path.join('tests', 'data', 'rca_migration_v17_consolidated.json')

try:
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    records = data.get('records', [])
    actions = data.get('actions', [])
    
    print(f"Records: {len(records)}")
    print(f"Top-level Actions: {len(actions)}")
    
    if len(actions) == 0:
        print("⚠️ No top-level actions found. Checking embedded actions in records...")
        embedded_count = 0
        for r in records:
            if 'containment_actions' in r:
                embedded_count += len(r['containment_actions'])
        print(f"Embedded 'containment_actions': {embedded_count}")
        
    # Check ID match
    rca_ids = set(r['id'] for r in records)
    
    orphans = 0
    sample_orphan_rca_id = None
    
    for a in actions:
        if 'rca_id' in a:
            if a['rca_id'] not in rca_ids:
                orphans += 1
                if not sample_orphan_rca_id:
                    sample_orphan_rca_id = a['rca_id']
                    
    print(f"Orphan Actions (if top-level): {orphans}")
    if sample_orphan_rca_id:
        print(f"Sample Orphan RCA ID: {sample_orphan_rca_id}")
        
    # Check if records have IDs that look like "RCA-..."
    rca_generated_ids = [r['id'] for r in records if r['id'].startswith('RCA-')]
    print(f"Records with 'RCA-' prefix: {len(rca_generated_ids)}")
    if len(rca_generated_ids) > 0:
        print(f"Sample: {rca_generated_ids[0]}")

except Exception as e:
    print(f"Error: {e}")
