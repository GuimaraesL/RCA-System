"""
Teste: test_recurrence_info.py
Proposta: Validar a instanciação da classe RecurrenceInfo.
Ações: Cria objeto RecurrenceInfo e valida campos.
Execução: Backend Python
Fluxo: Import -> Instanciação -> Print campos.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.models import RecurrenceInfo

def test_recurrence_info_instantiation():
    try:
        info = RecurrenceInfo(
            rca_id="test-id",
            similarity=0.95,
            title="Test Title",
            level="subgroup",
            symptoms="Sample symptoms",
            root_causes="Sample causes",
            actions="Sample actions",
            equipment_name="Test Equip",
            subgroup_name="Test Subgroup",
            area_name="Test Area",
            raw_content="Raw content",
            failure_date="2024-03-15"
        )
        print("Successfully instantiated RecurrenceInfo with all fields.")
        print(f"Symptoms: {info.symptoms}")
        print(f"Subgroup Name: {info.subgroup_name}")
    except Exception as e:
        print(f"Failed to instantiate RecurrenceInfo: {e}")
        exit(1)

if __name__ == "__main__":
    test_recurrence_info_instantiation()
