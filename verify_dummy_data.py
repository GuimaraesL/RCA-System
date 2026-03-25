import json
import os

def verify_json(file_path):
    if not os.path.exists(file_path):
        print(f"Erro: Arquivo {file_path} não encontrado.")
        return False
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Check Top Level Structure
        required_top_keys = ["metadata", "assets", "records", "actions", "triggers", "taxonomy"]
        missing_top = [k for k in required_top_keys if k not in data]
        if missing_top:
            print(f"Erro: Chaves de topo ausentes: {missing_top}")
            return False
        print("Estrutura de topo validada (V17).")

        # Check Metadata
        print(f"Metadados: {data['metadata']}")

        records = data.get("records", [])
        actions = data.get("actions", [])
        triggers = data.get("triggers", [])

        if len(records) != 100:
            print(f"Aviso: Esperado 100 registros, encontrado {len(records)}.")

        if records:
            first_rca = records[0]
            rca_id = first_rca["id"]
            
            # Check linking
            linked_actions = [a for a in actions if a["rca_id"] == rca_id]
            linked_triggers = [t for t in triggers if t["rca_id"] == rca_id]
            
            if not linked_actions:
                print(f"Erro: Nenhuma ação vinculada à RCA {rca_id}")
                return False
            if not linked_triggers:
                print(f"Erro: Nenhum gatilho vinculado à RCA {rca_id}")
                return False
            print(f"Vínculos validados: RCA {rca_id} possui {len(linked_actions)} ações e {len(linked_triggers)} gatilhos.")

            # Check Precision Checklist Keys
            chk_item = first_rca["precision_maintenance"][0]
            if "checklists.precision." not in chk_item["activity"]:
                print(f"Erro: Checklist não utiliza chaves de tradução: {chk_item['activity']}")
                return False
            print("Checklist utiliza chaves de tradução corretamente.")

            # Check 5 Whys Chain
            if not first_rca.get("five_whys_chains"):
                print("Erro: Modo Chain não encontrado.")
                return False
            print("Modo Chain validado.")

        print("Validação V17 concluída com sucesso.")
        return True

    except Exception as e:
        print(f"Erro ao validar JSON: {str(e)}")
        return False

if __name__ == "__main__":
    verify_json(r'c:\Users\GuimaraesL\OneDrive - Novelis Inc\Documents\01_PYTHON\GuimaraesL\RCA-System\tests\data\rca_presentation_dummy.json')
