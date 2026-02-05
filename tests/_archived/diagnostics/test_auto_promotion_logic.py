import json

def test_logic():
    # Load JSON
    with open('tests/data/rca_migration_v17_consolidated.json', encoding='utf-8') as f:
        data = json.load(f)
    
    # Target Record
    target_id = 'c02a20e2-8186-4541-ad9a-d4ad1ce10264'
    rec = next((r for r in data['records'] if r.get('id') == target_id), None)
    
    if not rec:
        print("Record not found")
        return

    with open('tests/output/test_logic_result_final.txt', 'w', encoding='utf-8') as log_file:
        def log(msg):
            print(msg)
            log_file.write(msg + '\n')

        log(f"Testing Record: {target_id}")
        log("-" * 30)

        # --- REPLICATING TYPESCRIPT LOGIC ---
        
        # 1. Mandatory Strings (Updated)
        # TS Logic: newRec.equipment_id || newRec.subgroup_id
        asset_id_check = rec.get('equipment_id') or rec.get('subgroup_id')
        
        mandatoryStrings = [
            rec.get('analysis_type'),
            rec.get('what'),
            rec.get('problem_description'),
            asset_id_check, # REPLACED asset_name_display
            rec.get('who'),
            rec.get('when'),
            rec.get('where_description'),
            rec.get('specialty_id'),
            rec.get('failure_mode_id'),
            rec.get('failure_category_id'),
            rec.get('component_type')
        ]
        
        # Logic: s && String(s).trim().length > 0
        stringsOk = True
        for i, s in enumerate(mandatoryStrings):
            is_ok = s is not None and str(s).strip() != ''
            if not is_ok:
                 stringsOk = False
                 log(f"FAILED FIELD Index {i}: '{s}' (Raw value)")

        log(f"Strings OK: {stringsOk}")

        # 2. Check Array Import Logic
        def checkArrayImport(val):
            if isinstance(val, list): return len(val) > 0
            if isinstance(val, str) and val.strip() != '':
                try:
                    parsed = json.loads(val)
                    return isinstance(parsed, list) and len(parsed) > 0
                except:
                    return False
            return False

        participantsOk = checkArrayImport(rec.get('participants'))
        rootCausesOk = checkArrayImport(rec.get('root_causes'))
        
        # 3. Impacts
        dt = rec.get('downtime_minutes')
        impactsOk = dt is not None
        
        # 4. Actions Check (Containment OR Main)
        hasContainment = checkArrayImport(rec.get('containment_actions'))
        
        # Mock Main Actions Check (since we loaded full json)
        target_id = rec.get('id')
        main_actions = [a for a in data.get('actions', []) if a.get('rca_id') == target_id]
        hasMainActions = len(main_actions) > 0
        
        actionsOk = hasContainment or hasMainActions
        
        log(f"Participants OK: {participantsOk}")
        log(f"Root Causes OK: {rootCausesOk}")
        log(f"Downtime OK: {impactsOk}")
        log(f"hasContainment: {hasContainment}")
        log(f"hasMainActions: {hasMainActions}")
        log(f"Actions OK: {actionsOk}")

        # Final Result
        isComplete = stringsOk and participantsOk and rootCausesOk and impactsOk and actionsOk
        log(f"\nIS COMPLETE: {isComplete}")
        
        status = rec.get('status')
        log(f"Original Status: '{status}'")
        
        # Status Logic
        # let currentStatus = ... || newRec.status
        currentStatus = status
        
        # const isOpenStatus = !currentStatus || currentStatus === '' || ...
        isOpenStatus = not currentStatus or currentStatus == '' or currentStatus == 'STATUS-01' or currentStatus == 'Em Andamento'
        
        log(f"Is Open Status? {isOpenStatus}")
        
        final_status = 'STATUS-WAITING' if isComplete else 'STATUS-01'
        if not isOpenStatus: final_status = currentStatus
        
        log(f"FINAL CALCULATED STATUS: {final_status}")

if __name__ == "__main__":
    test_logic()
