import sqlite3
import os

db_path = os.path.join('server', 'data', 'rca.db')
try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("\n--- ACTION SAMPLES (id, rca_id) ---")
    cursor.execute("SELECT id, rca_id FROM actions LIMIT 3")
    for row in cursor.fetchall():
        print(row)
        
    print("\n--- RCA SAMPLES (id) ---")
    cursor.execute("SELECT id FROM rcas LIMIT 3")
    for row in cursor.fetchall():
        print(row)
        
    conn.close()
except Exception as e:
    print(f"ERROR:{e}")
