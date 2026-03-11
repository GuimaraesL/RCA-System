import os

def get_skill_reference(skill_name: str, file_path: str = "SKILL.md") -> str:
    """
    Lê uma referência metodológica ou diretriz de uma Skill específica.
    Utilize esta ferramenta para consultar regras de preenchimento (ex: Ishikawa, 5 Porquês),
    padrões técnicos ou documentação de apoio de uma habilidade.

    Args:
        skill_name (str): O nome da pasta da skill (ex: 'rca-methodology', 'fmea', 'reliability').
        file_path (str): O caminho do arquivo dentro da pasta da skill (default: 'SKILL.md').
                         Ex: 'references/02_5_whys.md'.
    """
    # Sobe um nível para acessar a raiz das skills
    base_dir = os.path.dirname(os.path.dirname(__file__))
    target_path = os.path.join(base_dir, skill_name, file_path)
    
    # Sanitização básica para evitar path traversal
    real_base = os.path.abspath(base_dir)
    real_target = os.path.abspath(target_path)
    if not real_target.startswith(real_base):
        return "Erro: Acesso não autorizado fora do diretório de skills."

    if not os.path.exists(target_path):
        return f"Erro: Referência '{file_path}' não encontrada na skill '{skill_name}'."

    try:
        with open(target_path, "r", encoding="utf-8") as f:
            content = f.read()
        return f"--- REFERÊNCIA: {skill_name}/{file_path} ---\n\n{content}"
    except Exception as e:
        return f"Erro ao ler referência: {str(e)}"
