import sqlite3
import json

DB_PATH = 'server/data/rca.db'

def check_field(value):
    return value is not None and str(value).strip() != ''

def check_array(value):
    if not value: return False
    try:
        arr = json.loads(value)
        return isinstance(arr, list) and len(arr) > 0
    except:
        return False

def audit_status():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM rcas")
    rows = cursor.fetchall()
    
    total = len(rows)
    eligible_count = 0
    in_progress_count = 0
    
    print(f"Total Records: {total}")
    print("-" * 40)

    for row in rows:
        # Mandatory fields from useRcaLogic.ts
        mandatory = [
            row['analysis_type'],
            row['what'],
            row['problem_description'],
            row['asset_name_display'],
            row['who'],
            row['when'],
            row['where_description'],
            row['specialty_id'],
            row['failure_mode_id'],
            row['failure_category_id'],
            row['component_type']
        ]
        
        participant_check = False
        parts = row['participants']
        if parts:
             try:
                 # It might be a JSON array string
                 p_arr = json.loads(parts)
                 if isinstance(p_arr, list) and len(p_arr) > 0: participant_check = True
             except:
                 # Or a simple string if legacy
                 if len(str(parts).strip()) > 0: participant_check = False # The logic requires array

        root_cause_check = check_array(row['root_causes'])
        
        strings_ok = all(check_field(f) for f in mandatory)
        impacts_ok = (row['financial_impact'] is not None) and (row['downtime_minutes'] is not None)
        
        is_complete = strings_ok and participant_check and root_cause_check and impacts_ok
        
        status = row['status']
        if status == 'STATUS-01':
            in_progress_count += 1
            if is_complete:
                eligible_count += 1
                # print(f"ELIGIBLE: ID {row['id']} - {row['what']}")
    
    print(f"Records with STATUS-01 (Em Andamento): {in_progress_count}")
    print(f"Eligible for STATUS-WAITING (All fields OK): {eligible_count}")
    
    if eligible_count > 0:
        print("\nCONCLUSION: Validation Logic is Frontend-Only. Imported data needs Batch Update.")
    else:
        print("\nCONCLUSION: No records meet the strict completion criteria.")
        print("\nSample Failures (First 10):")
        count = 0
        for row in rows:
            if count >= 10: break
            
            missing = []
            
            # Check mandatory strings
            mandatory_map = {
                'analysis_type': row['analysis_type'],
                'what': row['what'],
                'problem_description': row['problem_description'],
                'asset': row['asset_name_display'],
                'who': row['who'],
                'when': row['when'],
                'specialty': row['specialty_id'],
                'failure_mode': row['failure_mode_id']
            }
            
            for k, v in mandatory_map.items():
                if not check_field(v): missing.append(k)

            # Check Collections
            parts = row['participants']
            p_check = False
            if parts:
                 try:
                     p_arr = json.loads(parts)
                     if isinstance(p_arr, list) and len(p_arr) > 0: p_check = True
                 except: ps_check = False
            if not p_check: missing.append("participants (empty/invalid)")

            root_causes = row['root_causes']
            rc_check = check_array(root_causes)
            if not rc_check: missing.append("root_causes (empty)")
            
            impacts_ok = (row['financial_impact'] is not None) and (row['downtime_minutes'] is not None)
            if not impacts_ok: missing.append("impacts (null)")

            if len(missing) > 0:
                print(f"ID {row['id']} Failed: Missing {missing}")
                count += 1

    conn.close()

if __name__ == "__main__":
    audit_status()
