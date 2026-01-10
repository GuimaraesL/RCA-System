import sqlite3
import json

c = sqlite3.connect('server/data/rca.db')
c.row_factory = sqlite3.Row
r = c.execute("SELECT * FROM rcas WHERE id = 'c02a20e2-8186-4541-ad9a-d4ad1ce10264'").fetchone()

if r:
    print("=== RECORD ANALYSIS ===\n")
    
    # Mandatory Strings
    mandatory = [
        ('analysis_type', r['analysis_type']),
        ('what', r['what']),
        ('problem_description', r['problem_description']),
        ('asset_name_display', r['asset_name_display']),
        ('who', r['who']),
        ('when', r['when']),
        ('where_description', r['where_description']),
        ('specialty_id', r['specialty_id']),
        ('failure_mode_id', r['failure_mode_id']),
        ('failure_category_id', r['failure_category_id']),
        ('component_type', r['component_type']),
    ]
    
    print("1. MANDATORY STRINGS:")
    for name, val in mandatory:
        status = "OK" if val and str(val).strip() else "MISSING"
        print(f"   {name:<25}: {status:<8} | Value: {str(val)[:50] if val else 'NULL'}")
    
    print("\n2. ARRAYS:")
    parts = r['participants']
    try:
        p_arr = json.loads(parts) if parts else []
        p_status = "OK" if len(p_arr) > 0 else "EMPTY"
    except:
        p_status = "INVALID_JSON"
        p_arr = []
    print(f"   participants: {p_status} | Count: {len(p_arr)}")
    
    rcs = r['root_causes']
    try:
        rc_arr = json.loads(rcs) if rcs else []
        rc_status = "OK" if len(rc_arr) > 0 else "EMPTY"
    except:
        rc_status = "INVALID_JSON"
        rc_arr = []
    print(f"   root_causes:  {rc_status} | Count: {len(rc_arr)}")
    
    print("\n3. NUMBERS:")
    print(f"   financial_impact:  {r['financial_impact']}")
    print(f"   downtime_minutes:  {r['downtime_minutes']}")
    
    print("\n4. STATUS:")
    print(f"   Current status: {r['status']}")
    
else:
    print("Record not found!")

c.close()
