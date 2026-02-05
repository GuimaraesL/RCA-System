import sqlite3
import os

db_path = os.path.join('server', 'data', 'rca.db')
try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM actions")
    a = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM rcas")
    r = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM actions a LEFT JOIN rcas r ON a.rca_id = r.id WHERE r.id IS NULL")
    o = cursor.fetchone()[0]
    print(f"ACTIONS:{a}")
    print(f"RCAS:{r}")
    print(f"ORPHANS:{o}")
    conn.close()
except Exception as e:
    print(f"ERROR:{e}")
