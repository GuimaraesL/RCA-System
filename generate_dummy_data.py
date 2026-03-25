import json
import uuid
from datetime import datetime, timedelta
import random

def generate_rca_data(count=100):
    # 1. Assets Structure (Using real IDs from database for stability)
    # Area: MANUFATURA_SUL (AREA-855B3208), MANUFATURA_NORTE (AREA-C772F387)
    assets = [
        {
            "id": "AREA-855B3208", "name": "MANUFATURA_SUL", "type": "AREA",
            "children": [
                {
                    "id": "EQP-0878EEA3", "name": "PRENSA_01", "type": "EQUIPMENT", "parent_id": "AREA-855B3208",
                    "children": [
                        {"id": "SUB-622770C6", "name": "SISTEMA_HIDRAULICO", "type": "SUBGROUP", "parent_id": "EQP-0878EEA3"},
                        {"id": "SUB-11C98735", "name": "MATRIZ", "type": "SUBGROUP", "parent_id": "EQP-0878EEA3"},
                        {"id": "SUB-EED76059", "name": "PAINEL_ELETRICO", "type": "SUBGROUP", "parent_id": "EQP-0878EEA3"}
                    ]
                },
                {
                    "id": "EQP-A32D7DCF", "name": "PRENSA_02", "type": "EQUIPMENT", "parent_id": "AREA-855B3208",
                    "children": [
                        {"id": "SUB-EC701BD3", "name": "SISTEMA_HIDRAULICO", "type": "SUBGROUP", "parent_id": "EQP-A32D7DCF"},
                        {"id": "SUB-82CCC46F", "name": "PROTECAO_SEGURANCA", "type": "SUBGROUP", "parent_id": "EQP-A32D7DCF"}
                    ]
                },
                {
                    "id": "EQP-939F1105", "name": "ROBO_PALETIZADOR", "type": "EQUIPMENT", "parent_id": "AREA-855B3208",
                    "children": [
                        {"id": "SUB-FE0D1C41", "name": "GARRA", "type": "SUBGROUP", "parent_id": "EQP-939F1105"},
                        {"id": "SUB-D52C0E8A", "name": "EIXO_PRINCIPAL", "type": "SUBGROUP", "parent_id": "EQP-939F1105"},
                        {"id": "SUB-BF18C5A3", "name": "LOGICA_PLC", "type": "SUBGROUP", "parent_id": "EQP-939F1105"}
                    ]
                },
                {
                    "id": "EQP-644F3B9B", "name": "ESTRUDORA_05", "type": "EQUIPMENT", "parent_id": "AREA-855B3208",
                    "children": [
                        {"id": "SUB-30BFF4A0", "name": "MOTOR_PRINCIPAL", "type": "SUBGROUP", "parent_id": "EQP-644F3B9B"},
                        {"id": "SUB-D8651898", "name": "ROLO_SAIDA", "type": "SUBGROUP", "parent_id": "EQP-644F3B9B"}
                    ]
                }
            ]
        },
        {
            "id": "AREA-C772F387", "name": "MANUFATURA_NORTE", "type": "AREA",
            "children": [
                {
                    "id": "EQP-43479CCF", "name": "FORNO_01", "type": "EQUIPMENT", "parent_id": "AREA-C772F387",
                    "children": [
                        {"id": "SUB-B13A24D6", "name": "QUEMADORES", "type": "SUBGROUP", "parent_id": "EQP-43479CCF"},
                        {"id": "SUB-B8807554", "name": "ESTEIRA_TRANSPORTE", "type": "SUBGROUP", "parent_id": "EQP-43479CCF"},
                        {"id": "SUB-C7DF60B7", "name": "TERMOPAR", "type": "SUBGROUP", "parent_id": "EQP-43479CCF"}
                    ]
                },
                {
                    "id": "EQP-ECDC7EEB", "name": "FORNO_02", "type": "EQUIPMENT", "parent_id": "AREA-C772F387",
                    "children": [
                        {"id": "SUB-C41DB2B2", "name": "QUEMADORES", "type": "SUBGROUP", "parent_id": "EQP-ECDC7EEB"},
                        {"id": "SUB-1A675F6B", "name": "SISTEMA_EXAUSTAO", "type": "SUBGROUP", "parent_id": "EQP-ECDC7EEB"}
                    ]
                },
                {
                    "id": "EQP-4ECA2DB2", "name": "LINHA_PINTURA", "type": "EQUIPMENT", "parent_id": "AREA-C772F387",
                    "children": [
                        {"id": "SUB-BAFB0901", "name": "TANQUE_IMERSAO", "type": "SUBGROUP", "parent_id": "EQP-4ECA2DB2"},
                        {"id": "SUB-3B73C33B", "name": "CABINE_SPRAY", "type": "SUBGROUP", "parent_id": "EQP-4ECA2DB2"}
                    ]
                },
                {
                    "id": "EQP-B0F652B0", "name": "GUINDASTE_G1", "type": "EQUIPMENT", "parent_id": "AREA-C772F387",
                    "children": [
                        {"id": "SUB-6A6E7D8C", "name": "CABO_ACO", "type": "SUBGROUP", "parent_id": "EQP-B0F652B0"},
                        {"id": "SUB-AED17B25", "name": "MOTOR_IÇAMENTO", "type": "SUBGROUP", "parent_id": "EQP-B0F652B0"}
                    ]
                }
            ]
        }
    ]

    # Map subgroup to area/equip
    asset_lookup = {}
    for area in assets:
        for equip in area["children"]:
            for sub in equip["children"]:
                asset_lookup[sub["id"]] = (area["id"], equip["id"], sub["id"], f"{area['name']} > {equip['name']} > {sub['name']}")

    # 2. Taxonomy
    taxonomy = {
        "analysisTypes": [
            {"id": "TYP-MN3CAYYZ-487", "name": "Análise de Evento"},
            {"id": "TYP-MN3CAYYZ-654", "name": "RCA-Express"},
            {"id": "TYP-MN3CAYYZ-830", "name": "RCA-Padrão"}
        ],
        "analysisStatuses": [
            {"id": "STATUS-01", "name": "Em Andamento"},
            {"id": "STATUS-02", "name": "Aguardando Verificação"},
            {"id": "STATUS-03", "name": "Concluída"},
            {"id": "STATUS-04", "name": "Cancelada"}
        ],
        "rootCauseMs": [
            {"id": "M1", "name": "Mão de Obra"},
            {"id": "M2", "name": "Método"},
            {"id": "M3", "name": "Material"},
            {"id": "M4", "name": "Máquina"},
            {"id": "M5", "name": "Meio Ambiente"},
            {"id": "M6", "name": "Medida"}
        ],
        "triggerStatuses": [
            {"id": "T-STATUS-01", "name": "Novo"},
            {"id": "T-STATUS-02", "name": "Em Análise"},
            {"id": "T-STATUS-03", "name": "Convertido em RCA"},
            {"id": "T-STATUS-04", "name": "Arquivado"}
        ]
    }

    # 3. Precision Checklist
    checklist_defs = [
        ("chk_clean", "checklists.precision.chk_clean"),
        ("chk_tol", "checklists.precision.chk_tol"),
        ("chk_lube", "checklists.precision.chk_lube"),
        ("chk_belt", "checklists.precision.chk_belt"),
        ("chk_load", "checklists.precision.chk_load"),
        ("chk_align", "checklists.precision.chk_align"),
        ("chk_bal", "checklists.precision.chk_bal"),
        ("chk_torque", "checklists.precision.chk_torque"),
        ("chk_parts", "checklists.precision.chk_parts"),
        ("chk_func", "checklists.precision.chk_func"),
        ("chk_doc", "checklists.precision.chk_doc")
    ]

    clusters = [
        {"what": "Vazamento de fluido hidráulico", "problem": "Vazamento de óleo constante no cilindro principal", "root_cause": "O-ring ressecado devido a alta temperatura", "component": "Cilindro Hidráulico"},
        {"what": "Vazamento de óleo no retentor", "problem": "Presença de óleo na base do equipamento", "root_cause": "Vedação danificada por contaminação", "component": "Retentor"},
        {"what": "Desarme por superaquecimento", "problem": "Motor parou por alta temperatura", "root_cause": "Ventilação obstruída por poeira", "component": "Motor"},
        {"what": "Motor quente acima do limite", "problem": "Alarme de temperatura no painel", "root_cause": "Falta de lubrificação nos rolamentos", "component": "Motor"},
        {"what": "Quebra de rolamento", "problem": "Ruído metálico e travamento", "root_cause": "Sobrecarga mecânica contínua", "component": "Rolamento"},
        {"what": "Vibração excessiva no mancal", "problem": "Trepidação detectada pela inspeção sensitiva", "root_cause": "Desalinhamento do eixo", "component": "Mancal"}
    ]

    records = []
    actions = []
    triggers = []
    start_date = datetime(2024, 1, 1)
    sub_ids = list(asset_lookup.keys())

    for i in range(count):
        s_id = random.choice(sub_ids)
        a_id, e_id, sub_id, display_name = asset_lookup[s_id]
        
        if random.random() < 0.6:
            cluster = random.choice(clusters)
            what = cluster["what"]
            problem = cluster["problem"]
            root_cause_desc = cluster["root_cause"]
            component = cluster["component"]
        else:
            what = f"Falha aleatória {i}"
            problem = f"Descrição do problema aleatório número {i}"
            root_cause_desc = "Causa raiz a ser determinada"
            component = "Geral"

        analysis_date = start_date + timedelta(days=random.randint(0, 365))
        failure_date = analysis_date - timedelta(days=random.randint(1, 10))
        
        rca_id = f"RCA-{uuid.uuid4().hex[:8].upper()}"
        status_id = random.choice(["STATUS-01", "STATUS-02", "STATUS-03"])
        analysis_type_name = random.choice(["RCA-Padrão", "RCA-Express", "Análise de Evento"])
        type_id_map = {
            "Análise de Evento": "TYP-MN3CAYYZ-487",
            "RCA-Express": "TYP-MN3CAYYZ-654",
            "RCA-Padrão": "TYP-MN3CAYYZ-830"
        }
        type_id = type_id_map[analysis_type_name]

        precision_maintenance = []
        for c_id, c_key in checklist_defs:
            precision_maintenance.append({
                "id": c_id,
                "activity": c_key,
                "question_snapshot": c_key,
                "status": random.choice(["EXECUTED", "NOT_APPLICABLE", ""]),
                "comment": ""
            })

        record = {
            "id": rca_id,
            "version": "1.0",
            "analysis_date": analysis_date.strftime("%Y-%m-%d"),
            "analysis_duration_minutes": random.randint(60, 240),
            "analysis_type": analysis_type_name,
            "status": status_id,
            "participants": ["Participante A", "Participante B"],
            "facilitator": "Facilitador Simulado",
            "start_date": failure_date.strftime("%Y-%m-%d"),
            "completion_date": analysis_date.strftime("%Y-%m-%d"),
            "failure_date": failure_date.strftime("%Y-%m-%d"),
            "failure_time": f"{random.randint(0,23):02d}:{random.randint(0,59):02d}",
            "downtime_minutes": random.randint(30, 600),
            "area_id": a_id,
            "equipment_id": e_id,
            "subgroup_id": sub_id,
            "component_type": component,
            "asset_name_display": display_name,
            "who": "Operador Dummy",
            "what": what,
            "when": failure_date.strftime("%Y-%m-%dT%H:%M"),
            "where_description": display_name,
            "problem_description": problem,
            "potential_impacts": "Parada de produção",
            "precision_maintenance": precision_maintenance,
            "containment_actions": [
                {
                    "id": f"ACT-C-{uuid.uuid4().hex[:12].upper()}",
                    "action": "Contenção imediata e limpeza",
                    "responsible": "Equipe A",
                    "date": failure_date.strftime("%Y-%m-%d"),
                    "status": "EXECUTED"
                }
            ],
            "five_whys_chains": [
                {
                    "chain_id": str(uuid.uuid4()),
                    "cause_effect": what,
                    "root_node": {
                        "id": str(uuid.uuid4()),
                        "level": 0,
                        "row": 7,
                        "children": [],
                        "cause_effect": what,
                        "whys": [
                            {"level": 1, "answer": problem},
                            {"level": 2, "answer": "Falta de ação preventiva"},
                            {"level": 3, "answer": "Plano de manutenção incompleto"},
                            {"level": 4, "answer": root_cause_desc}
                        ]
                    }
                }
            ],
            "root_causes": [
                {
                    "id": str(uuid.uuid4()),
                    "root_cause_m_id": random.choice(["M1", "M2", "M3", "M4"]),
                    "cause": root_cause_desc
                }
            ],
            "ishikawa": {"machine": [root_cause_desc], "method": [], "material": [], "manpower": [], "measurement": [], "environment": []},
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        records.append(record)

        # 4. Action Plan (Actions Separate List)
        actions.append({
            "id": f"ACT-{uuid.uuid4().hex[:8].upper()}",
            "rca_id": rca_id,
            "action": f"Melhoria de confiabilidade para {what}",
            "responsible": "Engenharia",
            "date": (analysis_date + timedelta(days=15)).strftime("%Y-%m-%d"),
            "status": "1",
            "moc_number": None,
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        })

        # 5. Trigger (Triggers Separate List)
        is_linked = random.random() < 0.7
        t_status = random.choice(["T-STATUS-01", "T-STATUS-02"]) if not is_linked else random.choice(["T-STATUS-03", "T-STATUS-04"])
        link_id = rca_id if is_linked else None
        
        triggers.append({
            "id": f"TRG-{uuid.uuid4().hex[:8].upper()}",
            "area_id": a_id,
            "equipment_id": e_id,
            "subgroup_id": sub_id,
            "start_date": failure_date.strftime("%Y-%m-%dT%H:%M"),
            "end_date": (failure_date + timedelta(minutes=record["downtime_minutes"])).strftime("%Y-%m-%dT%H:%M"),
            "duration_minutes": record["downtime_minutes"],
            "stop_type": "Falha de Equipamento",
            "stop_reason": what,
            "comments": "Gatilho automático gerado",
            "analysis_type_id": type_id,
            "status": t_status,
            "responsible": "Operador Dummy",
            "rca_id": link_id,
            "file_path": None,
            "created_at": failure_date.strftime("%Y-%m-%d %H:%M:%S"),
            "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        })

    return {
        "metadata": {
            "systemVersion": "17.0-DEMO",
            "exportDate": datetime.now().isoformat(),
            "recordCount": len(records),
            "description": "Backup Simulado para Apresentação - Estrutura V17"
        },
        "assets": assets,
        "records": records,
        "actions": actions,
        "triggers": triggers,
        "taxonomy": taxonomy
    }

if __name__ == "__main__":
    data = generate_rca_data(100)
    with open(r'c:\Users\GuimaraesL\OneDrive - Novelis Inc\Documents\01_PYTHON\GuimaraesL\RCA-System\tests\data\rca_presentation_dummy.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print("Arquivo V17 Estável gerado com sucesso em rca_presentation_dummy.json")
