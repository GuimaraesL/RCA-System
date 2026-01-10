import sqlite3

c = sqlite3.connect('server/data/rca.db')
r = c.execute('''
    SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN root_causes IS NULL OR root_causes = '' OR root_causes = '[]' THEN 1 ELSE 0 END) as missing_rc,
        SUM(CASE WHEN participants IS NULL OR participants = '' OR participants = '[]' THEN 1 ELSE 0 END) as missing_p,
        SUM(CASE WHEN specialty_id IS NULL OR specialty_id = '' THEN 1 ELSE 0 END) as missing_spec,
        SUM(CASE WHEN failure_mode_id IS NULL OR failure_mode_id = '' THEN 1 ELSE 0 END) as missing_fm,
        SUM(CASE WHEN failure_category_id IS NULL OR failure_category_id = '' THEN 1 ELSE 0 END) as missing_fc,
        SUM(CASE WHEN component_type IS NULL OR component_type = '' THEN 1 ELSE 0 END) as missing_ct,
        SUM(CASE WHEN what IS NULL OR what = '' THEN 1 ELSE 0 END) as missing_what,
        SUM(CASE WHEN who IS NULL OR who = '' THEN 1 ELSE 0 END) as missing_who,
        SUM(CASE WHEN "when" IS NULL OR "when" = '' THEN 1 ELSE 0 END) as missing_when,
        SUM(CASE WHEN where_description IS NULL OR where_description = '' THEN 1 ELSE 0 END) as missing_where
    FROM rcas 
    WHERE status = 'STATUS-01'
''').fetchone()

print(f"Total: {r[0]}")
print(f"Missing root_causes: {r[1]} ({r[1]/r[0]*100:.1f}%)")
print(f"Missing participants: {r[2]} ({r[2]/r[0]*100:.1f}%)")
print(f"Missing specialty_id: {r[3]} ({r[3]/r[0]*100:.1f}%)")
print(f"Missing failure_mode_id: {r[4]} ({r[4]/r[0]*100:.1f}%)")
print(f"Missing failure_category_id: {r[5]} ({r[5]/r[0]*100:.1f}%)")
print(f"Missing component_type: {r[6]} ({r[6]/r[0]*100:.1f}%)")
print(f"Missing what: {r[7]} ({r[7]/r[0]*100:.1f}%)")
print(f"Missing who: {r[8]} ({r[8]/r[0]*100:.1f}%)")
print(f"Missing when: {r[9]} ({r[9]/r[0]*100:.1f}%)")
print(f"Missing where_description: {r[10]} ({r[10]/r[0]*100:.1f}%)")

c.close()
