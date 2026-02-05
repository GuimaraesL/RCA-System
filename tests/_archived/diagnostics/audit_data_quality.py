import sqlite3
import json
import collections
import re

DB_PATH = 'server/data/rca.db'

def analyze_date(value):
    if not value: return 'NULL'
    val = str(value).strip()
    if val == '': return 'EMPTY'
    
    # Check ISO YYYY-MM-DD
    if re.match(r'^\d{4}-\d{2}-\d{2}$', val): return 'ISO_DATE'
    
    # Check BR DD/MM/YYYY
    if re.match(r'^\d{2}/\d{2}/\d{4}$', val): return 'BR_DATE'
    
    # Check Mixed/Multiple
    if len(val) > 10: return 'MULTIPLE/DIRTY'
    
    return 'UNKNOWN_FMT'

def analyze_time(value):
    if not value: return 'NULL'
    val = str(value).strip()
    if val == '': return 'EMPTY'
    
    # HH:MM:SS
    if re.match(r'^\d{2}:\d{2}:\d{2}$', val): return 'HH_MM_SS'
    
    # HH:MM
    if re.match(r'^\d{2}:\d{2}$', val): return 'HH_MM'
    
    return 'DIRTY/OTHER'

def analyze_number(value):
    if value is None: return 'NULL'
    if value == '': return 'EMPTY_STR'
    
    try:
        f = float(value)
        i = int(f)
        if f == i: return 'INTEGER'
        return 'FLOAT'
    except:
        return 'NAN_STRING'

def analyze_json_field(value, expected_type=list):
    if value is None: return 'NULL'
    if not isinstance(value, str): return 'WRONG_DB_TYPE' 
    if value.strip() == '': return 'EMPTY_STR'
    
    try:
        data = json.loads(value)
        if isinstance(data, expected_type):
            if len(data) == 0: return 'VALID_EMPTY'
            # Deep check for array of strings vs objects
            if expected_type == list and len(data) > 0:
                if isinstance(data[0], str): return 'VALID_ARRAY_STRING'
                if isinstance(data[0], dict): return 'VALID_ARRAY_OBJECT'
            return 'VALID_POPULATED'
        return 'WRONG_JSON_TYPE'
    except:
        return 'INVALID_JSON'

def audit_data_quality():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM rcas")
    rows = cursor.fetchall()
    
    total = len(rows)
    print(f"Total Records: {total}\n")
    
    stats = collections.defaultdict(lambda: collections.defaultdict(int))
    samples = collections.defaultdict(list)

    def add_sample(category, key, val, limit=3):
        if len(samples[f"{category}_{key}"]) < limit:
            samples[f"{category}_{key}"].append(str(val))

    for row in rows:
        # Dates
        fd_stat = analyze_date(row['failure_date'])
        stats['failure_date'][fd_stat] += 1
        if fd_stat in ['MULTIPLE/DIRTY', 'UNKNOWN_FMT']: add_sample('failure_date', fd_stat, row['failure_date'])

        sd_stat = analyze_date(row['start_date'])
        stats['start_date'][sd_stat] += 1
        
        cd_stat = analyze_date(row['completion_date'])
        stats['completion_date'][cd_stat] += 1

        # Times
        ft_stat = analyze_time(row['failure_time'])
        stats['failure_time'][ft_stat] += 1
        if ft_stat == 'DIRTY/OTHER': add_sample('failure_time', ft_stat, row['failure_time'])

        # Numbers
        dt_stat = analyze_number(row['downtime_minutes'])
        stats['downtime_minutes'][dt_stat] += 1
        
        fi_stat = analyze_number(row['financial_impact'])
        stats['financial_impact'][fi_stat] += 1
        if fi_stat == 'FLOAT': add_sample('financial_impact', fi_stat, row['financial_impact'])

        # Facilitator - check if it looks like JSON or Plain String
        fac = row['facilitator']
        if not fac: stats['facilitator']['NULL'] += 1
        elif fac.startswith('[') or fac.startswith('{'): 
            stats['facilitator']['POTENTIAL_JSON'] += 1
            add_sample('facilitator', 'POTENTIAL_JSON', fac)
        else: stats['facilitator']['PLAIN_STRING'] += 1

        # JSONs
        p_stat = analyze_json_field(row['participants'], list)
        stats['participants'][p_stat] += 1

    # Report
    print("--- COMPREHENSIVE DATA PROFILING ---\n")
    
    print("1. DATE FIELDS (Format Consistency)")
    print(f"   Failure Date: {dict(stats['failure_date'])}")
    print(f"   Start Date:   {dict(stats['start_date'])}")
    print(f"   End Date:     {dict(stats['completion_date'])}")
    if samples['failure_date_MULTIPLE/DIRTY']:
        print(f"   ! Samples (Dirty Failure Dates): {samples['failure_date_MULTIPLE/DIRTY']}")

    print("\n2. TIME FIELDS")
    print(f"   Failure Time: {dict(stats['failure_time'])}")
    if samples['failure_time_DIRTY/OTHER']:
         print(f"   ! Samples (Dirty Times): {samples['failure_time_DIRTY/OTHER']}")

    print("\n3. NUMERIC FIELDS")
    print(f"   Downtime: {dict(stats['downtime_minutes'])}")
    print(f"   Impact:   {dict(stats['financial_impact'])}")
    if samples['financial_impact_FLOAT']:
        print(f"   ! Samples (High Precision Impact): {samples['financial_impact_FLOAT']}")

    print("\n4. TEXT/JSON HYBRIDS")
    print(f"   Facilitator: {dict(stats['facilitator'])}")
    print(f"   Participants: {dict(stats['participants'])}")
    if samples['facilitator_POTENTIAL_JSON']:
        print(f"   ! Samples (Facilitator as JSON?): {samples['facilitator_POTENTIAL_JSON']}")

    conn.close()

if __name__ == "__main__":
    audit_data_quality()
