"""
Teste simples para verificar se todas as importações principais da nova estrutura de diretórios do ai_service estão funcionando.
"""
import sys
import os

def check_import(module_name):
    try:
        __import__(module_name)
        print(f"✅ {module_name} importado com sucesso.")
        return True
    except ImportError as e:
        print(f"❌ Falha ao importar {module_name}: {e}")
        return False
    except Exception as e:
        print(f"⚠️ Erro inesperado ao importar {module_name}: {e}")
        return False

if __name__ == "__main__":
    # Adiciona o diretório atual ao sys.path para garantir que os módulos locais sejam encontrados
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))

    print("--- Testando Importações do AI Service ---")
    
    modules_to_test = [
        "core.config",
        "core.memory",
        "core.prompts",
        "core.tools",
        "core.knowledge",
        "agents.super_agent",
        "agents.chat_agent",
        "api.routes",
        "api.models",
    ]
    
    all_passed = True
    for mod in modules_to_test:
        if not check_import(mod):
            all_passed = False
            
    print("-" * 40)
    if all_passed:
        print("🎉 TODOS OS TESTES DE IMPORTAÇÃO PASSARAM!")
        sys.exit(0)
    else:
        print("🚨 ALGUNS TESTES FALHARAM. Verifique os caminhos.")
        sys.exit(1)
