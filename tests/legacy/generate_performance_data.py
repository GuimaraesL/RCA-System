# Gerador de Dados de Teste para Performance
# Cria um JSON com volume alto de dados para testar limites do sistema
# Objetivo: Task #21 - Verificação de Desempenho

import json
import random
import uuid
from datetime import datetime, timedelta
from pathlib import Path

# --- Configuração de Volume ---
NUM_RCAS = 500
NUM_TRIGGERS = 1000
NUM_ASSETS = 200  # ~50 Áreas, ~100 Equipamentos, ~50 Subgrupos
NUM_ACTIONS = 2000

# --- Helpers ---
def gen_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8].upper()}"

def random_date(start_year: int = 2020, end_year: int = 2025) -> str:
    start = datetime(start_year, 1, 1)
    end = datetime(end_year, 12, 31)
    delta = end - start
    random_days = random.randint(0, delta.days)
    return (start + timedelta(days=random_days)).strftime("%Y-%m-%d")

def random_participants() -> list:
    names = ["João Silva", "Maria Santos", "Carlos Oliveira", "Ana Costa", "Pedro Lima", "Fernanda Reis"]
    return random.sample(names, k=random.randint(1, 4))

# --- Gerar Assets (Hierarquia) ---
assets = []
area_ids = []
equip_ids = []

# Gerar Áreas
for i in range(50):
    area_id = gen_id("AREA")
    area_ids.append(area_id)
    assets.append({
        "id": area_id,
        "name": f"Área de Produção {i+1:02d}",
        "type": "AREA",
        "children": []
    })

# Gerar Equipamentos (filhos de áreas)
for i in range(100):
    equip_id = gen_id("EQUIP")
    equip_ids.append(equip_id)
    parent_area = random.choice(assets)
    parent_area["children"].append({
        "id": equip_id,
        "name": f"Equipamento {i+1:03d} - Motor",
        "type": "EQUIPMENT",
        "children": []
    })

# Gerar Subgrupos (filhos de equipamentos)
for i in range(50):
    sub_id = gen_id("SUB")
    # Escolher um equipamento aleatório
    parent_area = random.choice(assets)
    if parent_area["children"]:
        parent_equip = random.choice(parent_area["children"])
        parent_equip["children"].append({
            "id": sub_id,
            "name": f"Subconjunto {i+1:02d}",
            "type": "SUBGROUP",
            "children": []
        })

# --- Gerar RCAs ---
records = []
for i in range(NUM_RCAS):
    rca_id = gen_id("RCA")
    records.append({
        "id": rca_id,
        "version": "17.0",
        "analysis_date": random_date(),
        "analysis_duration_minutes": random.randint(30, 480),
        "analysis_type": random.choice(["Mini RCA", "RCA Completo", "A3 Melhoria"]),
        "status": random.choice(["STATUS-001", "STATUS-002", "STATUS-003"]),
        "participants": random_participants(),
        "facilitator": random.choice(["Engenheiro A", "Engenheiro B", "Técnico C"]),
        "failure_date": random_date(),
        "failure_time": f"{random.randint(0,23):02d}:{random.randint(0,59):02d}",
        "downtime_minutes": random.randint(5, 1200),
        "financial_impact": random.randint(1000, 500000),
        "os_number": f"OS-{random.randint(10000, 99999)}",
        "area_id": random.choice(area_ids),
        "equipment_id": random.choice(equip_ids) if equip_ids else "",
        "subgroup_id": "",
        "component_type": random.choice(["Motor", "Bomba", "Válvula", "Sensor", "Rolamento"]),
        "specialty_id": f"SPEC-{random.randint(1, 5):02d}",
        "failure_mode_id": f"FM-{random.randint(1, 10):02d}",
        "failure_category_id": f"FC-{random.randint(1, 5):02d}",
        "who": "Operador " + random.choice(["A", "B", "C", "D"]),
        "what": f"Falha crítica no componente #{i+1} durante operação normal",
        "when": f"Durante turno {random.choice(['manhã', 'tarde', 'noite'])}",
        "where_description": "Na linha de produção principal",
        "problem_description": f"O equipamento apresentou falha catastrófica levando à parada da linha. Análise #{i+1}.",
        "potential_impacts": "Perda de produção, custo de reparo, impacto na qualidade",
        "five_whys": [
            {"id": gen_id("WHY"), "why_question": "Por que falhou?", "answer": "Desgaste excessivo"},
            {"id": gen_id("WHY"), "why_question": "Por que desgastou?", "answer": "Falta de lubrificação"},
        ],
        "ishikawa": {"method": [], "machine": [], "material": [], "manpower": [], "measurement": [], "environment": []},
        "root_causes": [{"id": gen_id("RC"), "root_cause_m_id": "M1", "cause": "Falta de manutenção preventiva"}],
        "precision_maintenance": [],
        "containment_actions": [],
        "lessons_learned": ["Implementar checklist de manutenção", "Treinar operadores"]
    })

# --- Gerar Triggers ---
triggers = []
for i in range(NUM_TRIGGERS):
    triggers.append({
        "id": gen_id("TRG"),
        "area_id": random.choice(area_ids),
        "equipment_id": random.choice(equip_ids) if equip_ids else "",
        "subgroup_id": "",
        "start_date": random_date() + "T" + f"{random.randint(0,23):02d}:{random.randint(0,59):02d}",
        "end_date": random_date() + "T" + f"{random.randint(0,23):02d}:{random.randint(0,59):02d}",
        "duration_minutes": random.randint(5, 480),
        "stop_type": random.choice(["Programada", "Não Programada", "Emergência"]),
        "stop_reason": f"Parada para manutenção #{i+1}",
        "comments": "Comentário gerado automaticamente para teste de performance",
        "analysis_type_id": random.choice(["TYPE-001", "TYPE-002"]),
        "status": random.choice(["TRG-ST-01", "TRG-ST-02", "TRG-ST-03"]),
        "responsible": random.choice(["João", "Maria", "Carlos", "Ana"]),
        "rca_id": random.choice([r["id"] for r in records]) if random.random() > 0.5 else ""
    })

# --- Gerar Actions ---
actions = []
for i in range(NUM_ACTIONS):
    actions.append({
        "id": gen_id("ACT"),
        "rca_id": random.choice([r["id"] for r in records]),
        "action": f"Ação corretiva #{i+1}: Implementar melhoria no processo",
        "responsible": random.choice(["Técnico A", "Engenheiro B", "Supervisor C"]),
        "date": random_date(),
        "status": random.choice(["1", "2", "3", "4"]),
        "moc_number": f"MOC-{random.randint(1000, 9999)}" if random.random() > 0.7 else ""
    })

# --- Gerar Taxonomy ---
taxonomy = {
    "analysisTypes": [{"id": f"TYPE-00{i}", "name": f"Tipo de Análise {i}"} for i in range(1, 6)],
    "analysisStatuses": [{"id": f"STATUS-00{i}", "name": f"Status {i}"} for i in range(1, 5)],
    "specialties": [{"id": f"SPEC-0{i}", "name": f"Especialidade {i}"} for i in range(1, 10)],
    "failureModes": [{"id": f"FM-0{i}", "name": f"Modo de Falha {i}"} for i in range(1, 15)],
    "failureCategories": [{"id": f"FC-0{i}", "name": f"Categoria {i}"} for i in range(1, 8)],
    "componentTypes": [{"id": f"COMP-0{i}", "name": f"Componente {i}"} for i in range(1, 12)],
    "rootCauseMs": [{"id": f"M{i}", "name": m} for i, m in enumerate(["Máquina", "Mão de Obra", "Método", "Material", "Meio Ambiente", "Medição"], 1)],
    "triggerStatuses": [{"id": f"TRG-ST-0{i}", "name": f"Status Trigger {i}"} for i in range(1, 5)]
}

# --- Montar JSON Final ---
migration_data = {
    "metadata": {
        "exportDate": datetime.now().isoformat(),
        "systemVersion": "17.0",
        "recordCount": len(records),
        "description": f"Performance Test Dataset: {NUM_RCAS} RCAs, {NUM_TRIGGERS} Triggers, {NUM_ACTIONS} Actions"
    },
    "assets": assets,
    "taxonomy": taxonomy,
    "records": records,
    "actions": actions,
    "triggers": triggers
}

# --- Salvar ---
output_path = Path(__file__).parent / "performance_test_data.json"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(migration_data, f, ensure_ascii=False, indent=2)

print(f"✅ Arquivo gerado: {output_path}")
print(f"   - RCAs: {len(records)}")
print(f"   - Triggers: {len(triggers)}")
print(f"   - Actions: {len(actions)}")
print(f"   - Assets: {len(assets)} áreas (com equipamentos/subgrupos aninhados)")
print(f"   - Tamanho estimado: {output_path.stat().st_size / (1024*1024):.2f} MB")
