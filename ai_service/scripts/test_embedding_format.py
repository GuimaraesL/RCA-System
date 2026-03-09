import httpx
import json
import random
import asyncio

async def test_mass_parsing(sample_size=50):
    print(f"Iniciando Teste Exaustivo de Parsing - Amostra: {sample_size} RCAs (Custo ZERO)")
    
    # 1. Busca RCAs da API
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get("http://localhost:3001/api/rcas")
            data = resp.json()
            if isinstance(data, dict):
                rcas = data.get('data', [])
            else:
                rcas = data
    except Exception as e:
        print(f"Erro ao buscar RCAs: {e}")
        return

    # Pular rascunhos vazios
    valid_rcas = [rca for rca in rcas if rca.get('what') or rca.get('description')]
    print(f"Total RCAs válidas encontradas: {len(valid_rcas)}")
    
    if not valid_rcas:
        return
        
    sample = random.sample(valid_rcas, min(sample_size, len(valid_rcas)))
    
    sucesso = 0
    falhas = 0
    warnings = 0
    amostras_para_imprimir = []

    for idx, rca in enumerate(sample):
        try:
            # LÓGICA EXATA DO KNOWLEDGE.PY
            rca_id = str(rca.get('id', 'unknown'))
            if rca_id == 'unknown': continue
            
            area_id = rca.get('area_id', "")
            equip_id = rca.get('equipment_id', "")
            subg_id = rca.get('subgroup_id', "")
            
            asset_dict = rca.get('asset', {})
            area_name = asset_dict.get('area_name') if isinstance(asset_dict, dict) else None
            equip_name = asset_dict.get('equipment_name') if isinstance(asset_dict, dict) else None
            subg_name = asset_dict.get('subgroup_name') if isinstance(asset_dict, dict) else None
            comp_type = rca.get('component_type')
            
            area_label = area_name or area_id
            equip_label = equip_name or equip_id
            subg_label = subg_name or subg_id

            location_parts = []
            if area_label: location_parts.append(f"na área {area_label}")
            if equip_label: location_parts.append(f"afetando o equipamento {equip_label}")
            if subg_label: location_parts.append(f"com impacto focado no subgrupo {subg_label}")
            if comp_type: location_parts.append(f"no componente {comp_type}")

            content_parts = []
            if location_parts:
                content_parts.append(f"LOCALIZAÇÃO DO ATIVO: O incidente ocorreu {', '.join(location_parts)}.")
            
            what_desc = rca.get('what')
            if what_desc: content_parts.append(f"RESUMO DO PROBLEMA: {what_desc}")
            
            problem_desc = rca.get('problem_description', rca.get('description'))
            if problem_desc: content_parts.append(f"DESCRIÇÃO TÉCNICA (SINTOMAS): {problem_desc}")
            
            causes = [c.get('cause', '') for c in rca.get('root_causes', [])]
            if causes: content_parts.append(f"CAUSAS RAIZ: " + " | ".join(causes))
                
            actions = [a.get('action_title', '') for a in rca.get('action_plans', [])]
            if actions: content_parts.append(f"AÇÕES DO PLANO: " + " | ".join(actions))
            
            content = "\n\n".join(content_parts).strip()
            
            # --- VERIFICAÇÕES DE SANIDADE ---
            if "Ativo em rascunho" in content:
                print(f"[AVISO] RCA {rca_id} contém placeholder 'Ativo em rascunho'")
                warnings += 1
                
            if not content.strip():
                print(f"[FALHA] RCA {rca_id} gerou conteúdo vazio.")
                falhas += 1
                continue
                
            metadata = {
                "rca_id": rca_id,
                "status": rca.get('status'),
                "area_id": str(area_id or ""),
                "equipment_id": str(equip_id or ""),
                "subgroup_id": str(subg_id or "")
            }
            
            sucesso += 1
            if len(amostras_para_imprimir) < 3: # Salva 3 exemplos para mostrar ao usuário
                amostras_para_imprimir.append((rca_id, content, metadata))
                
        except Exception as e:
            print(f"[ERRO CRÍTICO] RCA {rca.get('id')} falhou no parser: {e}")
            falhas += 1

    with open("mass_test_result.txt", "w", encoding="utf-8") as f:
        f.write("\n" + "="*50 + "\n")
        f.write("📊 RESULTADOS DO TESTE DE MASSA\n")
        f.write("="*50 + "\n")
        f.write(f"Total Processado: {len(sample)}\n")
        f.write(f"✅ SUCESSOS:      {sucesso}\n")
        f.write(f"❌ FALHAS CRIT:   {falhas}\n")
        f.write(f"⚠️ AVISOS:        {warnings}\n")
        f.write("="*50 + "\n")
        
        if falhas == 0:
            f.write("\n🏆 CÓDIGO APROVADO! NENHUMA EXCEÇÃO GERADA NAS ATÉ 50 RCAS TESTADAS.\n")
            f.write("Aqui estão até 3 exemplos aleatórios de como o texto e metadados ficaram:\n\n")
            
            for i, (rid, txt, meta) in enumerate(amostras_para_imprimir):
                f.write(f"--- AMOSTRA {i+1} (ID: {rid}) ---\n")
                f.write(f"METADATA: {json.dumps(meta, indent=2)}\n")
                f.write("-" * 30 + "\n")
                f.write(f"{txt}\n")
                f.write("=" * 60 + "\n\n")

    print("\nTeste concluído com sucesso. Resultados salvos em mass_test_result.txt")

if __name__ == "__main__":
    asyncio.run(test_mass_parsing(50))
