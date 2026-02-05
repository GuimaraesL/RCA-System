import sqlite3
import os

db_path = os.path.join('server', 'data', 'rca.db')
print(f"🔌 Connecting to database at: {db_path}")

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 1. Counts
    cursor.execute("SELECT COUNT(*) FROM actions")
    total_actions = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM rcas")
    total_rcas = cursor.fetchone()[0]

    print(f"\n📊 Stats:")
    print(f"- Actions: {total_actions}")
    print(f"- RCAs:    {total_rcas}")

    # 2. Orphans
    cursor.execute("""
        SELECT a.id, a.rca_id 
        FROM actions a 
        LEFT JOIN rcas r ON a.rca_id = r.id 
        WHERE r.id IS NULL
    """)
    orphans = cursor.fetchall()
    
    print(f"\n👻 Orphan Actions: {len(orphans)}")
    if len(orphans) > 0:
    # print(f"Sample orphans: {orphans[:5]}")
        print("\nThese actions refer to rca_ids that do not exist in the RCAs table.")
    else:
        print("\n✅ Integrity OK: All actions link to existing RCAs.")

    # 3. Mismatched IDs (Case Sensitivity check)
    # Check if any join fails only due to case sensitivity
    # (SQLite is usually case-sensitive for text = comparison depending on collation, but UUIDs should match exactly)
    
    conn.close()

except Exception as e:
    print(f"❌ Error: {e}")
