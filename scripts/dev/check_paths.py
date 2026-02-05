import sqlite3
import os

db_path = os.path.join('server', 'data', 'rca.db')
print(f"🔌 Connecting to database at: {db_path}")

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    print(f"\n🔍 Listing first 5 RCAs file_paths to check format:")
    cursor.execute("SELECT id, file_path FROM rcas LIMIT 5")
    rows = cursor.fetchall()
    
    for row in rows:
        print(f"ID: {row[0]} | Path: {row[1]}")

    conn.close()

except Exception as e:
    print(f"❌ Error: {e}")
