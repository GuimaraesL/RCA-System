"""
Diagnóstico de Validação de Status.
Replica a lógica de useRcaLogic.ts para identificar por que registros não avançam de status.
"""
import sqlite3
import json
import collections

DB_PATH = 'server/data/rca.db'

def check_str(value):
    """Retorna True se o valor é uma string não vazia."""
    return value is not None and str(value).strip() != ''

def check_array(value, min_len=1):
    """Retorna True se o valor é um JSON array com pelo menos min_len elementos."""
    if not value: return False
    try:
        arr = json.loads(value)
        return isinstance(arr, list) and len(arr) >= min_len
    except:
        return False

def diagnose():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM rcas WHERE status = 'STATUS-01'")
    rows = cursor.fetchall()
    
    total = len(rows)
    print(f"Total Registros com STATUS-01: {total}\n")
    
    # Contagem de campos faltantes
    missing_counts = collections.defaultdict(int)
    
    # Campos obrigatórios (espelhando useRcaLogic.ts)
    mandatory_fields = [
        'analysis_type',
        'what',
        'problem_description',
        'asset_name_display',
        'who',
        'when',
        'where_description',
        'specialty_id',
        'failure_mode_id',
        'failure_category_id',
        'component_type'
    ]

    for row in rows:
        # 1. Checar strings obrigatórias
        for field in mandatory_fields:
            if not check_str(row[field]):
                missing_counts[field] += 1
        
        # 2. Checar participants (array não vazio)
        if not check_array(row['participants'], min_len=1):
            missing_counts['participants'] += 1
        
        # 3. Checar root_causes (array não vazio)
        if not check_array(row['root_causes'], min_len=1):
            missing_counts['root_causes'] += 1
        
        # 4. Checar impacts (não null)
        if row['financial_impact'] is None:
            missing_counts['financial_impact'] += 1
        if row['downtime_minutes'] is None:
            missing_counts['downtime_minutes'] += 1

    # Ordenar por frequência
    sorted_missing = sorted(missing_counts.items(), key=lambda x: -x[1])
    
    print("--- CAMPOS FALTANTES (Bloqueadores de Status) ---\n")
    print(f"{'Campo':<25} | {'Registros Faltando':<20} | {'%':<8}")
    print("-" * 60)
    for field, count in sorted_missing:
        pct = (count / total) * 100 if total > 0 else 0
        print(f"{field:<25} | {count:<20} | {pct:.1f}%")
    
    # Calcular quantos registros têm TUDO preenchido
    complete_count = 0
    for row in rows:
        is_complete = True
        for field in mandatory_fields:
            if not check_str(row[field]):
                is_complete = False
                break
        if is_complete:
            if not check_array(row['participants'], 1): is_complete = False
            if not check_array(row['root_causes'], 1): is_complete = False
            if row['financial_impact'] is None: is_complete = False
            if row['downtime_minutes'] is None: is_complete = False
        
        if is_complete:
            complete_count += 1

    print(f"\n{'='*60}")
    print(f"REGISTROS COMPLETOS (Elegíveis para STATUS-WAITING): {complete_count} ({(complete_count/total)*100:.1f}%)")
    print(f"{'='*60}")

    conn.close()

    # Write to file for easier reading
    with open('tests/output/diagnose_results.txt', 'w', encoding='utf-8') as f:
        f.write(f"Total Registros com STATUS-01: {total}\n\n")
        f.write("--- CAMPOS FALTANTES (Bloqueadores de Status) ---\n\n")
        f.write(f"{'Campo':<25} | {'Registros':<12} | {'%':<8}\n")
        f.write("-" * 50 + "\n")
        for field, count in sorted_missing:
            pct = (count / total) * 100 if total > 0 else 0
            f.write(f"{field:<25} | {count:<12} | {pct:.1f}%\n")
        f.write(f"\n{'='*50}\n")
        f.write(f"COMPLETOS (Elegíveis): {complete_count} ({(complete_count/total)*100:.1f}%)\n")
        f.write(f"{'='*50}\n")
    
    print("Resultados gravados em tests/output/diagnose_results.txt")

if __name__ == "__main__":
    diagnose()
