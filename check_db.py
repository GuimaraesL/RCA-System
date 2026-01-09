import sqlite3
import os

db_path = r'c:\Users\GuimaraesL\OneDrive - Novelis Inc\Documents\01_PYTHON\GuimaraesL\RCA-System\server\data\rca.db'

if not os.path.exists(db_path):
    print(f"DB not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("--- Checking for Duplicates in Actions ---")
# Check if IDs are duplicated (should be PK, so impossible if schema is correct, but let's check count)
cursor.execute("SELECT count(*) FROM actions")
total_actions = cursor.fetchone()[0]
print(f"Total Actions: {total_actions}")

# Check duplicates by ID (PK check)
cursor.execute("SELECT id, count(*) FROM actions GROUP BY id HAVING count(*) > 1")
dup_ids = cursor.fetchall()
if dup_ids:
    print(f"FAILED: Found {len(dup_ids)} duplicated IDs!")
else:
    print("OK: No duplicated IDs (PK constraint holds).")

# Check duplicates by Content (action + rca_id) - assuming user means same content appears twice with different IDs
cursor.execute("""
    SELECT rca_id, action, count(*) 
    FROM actions 
    GROUP BY rca_id, action 
    HAVING count(*) > 1
""")
dup_content = cursor.fetchall()
print(f"Found {len(dup_content)} actions with exact same content (potential imports ignoring existence):")
for rca_id, action_txt, count in dup_content[:5]: # Show max 5
    print(f"- RCA {rca_id}: '{action_txt[:30]}...' (Count: {count})")

print("-" * 30)
conn.close()
