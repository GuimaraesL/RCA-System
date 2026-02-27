import json
from typing import List, Dict, Any

def format_action_plan_table(rca_data: Dict[str, Any]) -> str:
    """
    Extrai ações de todas as fontes da RCA (Contenção, Causa Raiz, Confiabilidade Humana)
    e as transforma em uma única tabela Markdown.
    """
    all_actions = []
    
    # 1. Extrai Contenção
    containment = rca_data.get("containment_actions", [])
    if isinstance(containment, list):
        for a in containment:
            a["type"] = "Contenção"
            all_actions.append(a)
            
    # 2. Extrai Causas Raiz -> Ações
    root_causes = rca_data.get("root_causes", [])
    if isinstance(root_causes, list):
        for rc in root_causes:
            actions = rc.get("actions", [])
            for a in actions:
                a["type"] = "Corretiva"
                all_actions.append(a)

    # 3. Extrai Confiabilidade Humana -> Ações
    human_rel = rca_data.get("human_reliability", [])
    if isinstance(human_rel, list):
        for hr in human_rel:
            actions = hr.get("actions", [])
            for a in actions:
                a["type"] = "Huma-Rel"
                all_actions.append(a)

    if not all_actions:
        return "Nenhum plano de ação encontrado nos dados desta RCA."

    header = "| Tipo | Descrição da Ação | Responsável | Prazo | Status |\n"
    separator = "| :--- | :--- | :--- | :--- | :--- |\n"
    
    rows = []
    for act in all_actions:
        desc = act.get("action") or act.get("description") or "N/A"
        resp = act.get("responsible") or "A definir"
        prazo = act.get("date") or act.get("deadline") or "N/A"
        status = act.get("status") or "Pendente"
        tipo = act.get("type", "Corretiva")
        
        rows.append(f"| {tipo} | **{desc}** | {resp} | {prazo} | {status} |")
    
    return header + separator + "\n".join(rows)
