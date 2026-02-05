import sqlite3
import os

db_path = os.path.join('server', 'data', 'rca.db')
target_id = 'a6712796-ebb7-4ee1-b4d3-08697e1b5e20'

print(f"🔌 Connecting to database at: {db_path}")

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 1. Check Tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print(f"📊 Tables found: {[t[0] for t in tables]}")

    # 2. Check for the Ghost ID in RCAs
    print(f"\n🔍 Searching for ID {target_id} in 'rcas'...")
    cursor.execute("SELECT id, problem_description, file_path FROM rcas WHERE id = ?", (target_id,))
    rca = cursor.fetchone()
    
    if rca:
        print(f"✅ FOUND in RCAs: {rca}")
    else:
        print(f"❌ NOT FOUND in RCAs table.")

    # 3. Check for the Ghost ID in Triggers
    print(f"\n🔍 Searching for ID {target_id} in 'triggers'...")
    cursor.execute("SELECT id, stop_reason FROM triggers WHERE id = ?", (target_id,))
    trigger = cursor.fetchone()

    if trigger:
        print(f"✅ FOUND in Triggers: {trigger}")
    else:
        print(f"❌ NOT FOUND in Triggers table.")

    conn.close()

except Exception as e:
    print(f"❌ Error: {e}")
