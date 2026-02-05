import os
import re
import sys

# DiretÃ³rios para ignorar
IGNORE_DIRS = ['node_modules', 'dist', '.git', 'server/node_modules', 'server/dist', 'tests']
# ExtensÃµes para analisar
EXTENSIONS = ['.tsx', '.ts']

# PadrÃµes para detectar potenciais hardcoded strings
# 1. Texto entre tags JSX: >Texto< (com cuidado para nÃ£o pegar tags de fechamento)
JSX_TEXT_PATTERN = re.compile(r'>\s*([A-Z\u00C0-\u00FF][^<>{}\n\r]*)\s*<')

# 2. Atributos comuns com strings literais: placeholder="Texto", title="Texto", label="Texto"
ATTR_PATTERN = re.compile(r'\b(placeholder|title|label|header|subtitle|buttonText|message|confirmText|cancelText)\s*=\s*["\']([^"{}\n\r]+)["\']')

# 3. Strings literais em cÃ³digo TSX que parecem UI (comeÃ§am com maiÃºscula e tÃªm mais de 3 chars)
CODE_STRING_PATTERN = re.compile(r'["\']([A-Z\u00C0-\u00FF][^"\']{3,})["\']')

# Palavras para ignorar (falsos positivos comuns)
IGNORE_WORDS = {
    'UTF-8', 'Content-Type', 'application/json', 'sql.js', 'BEGIN TRANSACTION', 'COMMIT', 
    'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'FROM', 'WHERE', 'ORDER BY', 'datetime',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
}

def analyze_file(file_path):
    hardcoded = []
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
            # Remover comentÃ¡rios para evitar falsos positivos
            content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
            content = re.sub(r'//.*', '', content)

            # 1. Buscar texto JSX
            for match in JSX_TEXT_PATTERN.finditer(content):
                text = match.group(1).strip()
                if text and len(text) > 1 and text not in IGNORE_WORDS:
                    line_num = content.count('\n', 0, match.start()) + 1
                    hardcoded.append((line_num, 'JSX Text', text))

            # 2. Buscar atributos
            for match in ATTR_PATTERN.finditer(content):
                attr = match.group(1)
                text = match.group(2).strip()
                if text and text not in IGNORE_WORDS:
                    line_num = content.count('\n', 0, match.start()) + 1
                    hardcoded.append((line_num, f'Attribute ({attr})', text))

            # 3. Buscar strings em cÃ³digo (mais agressivo, filtramos mais)
            for match in CODE_STRING_PATTERN.finditer(content):
                text = match.group(1).strip()
                # Ignorar se estiver dentro de uma chamada t() ou se for apenas uma chave de traduÃ§Ã£o (ex: dashboard.title)
                context_before = content[max(0, match.start()-5):match.start()]
                if 't(' in context_before or '.' in text or '/' in text or text in IGNORE_WORDS:
                    continue
                
                # Se a string contÃ©m muitos caracteres nÃ£o-alfanumÃ©ricos, provavelmente nÃ£o Ã© UI
                if len(re.findall(r'[a-zA-Z\u00C0-\u00FF]', text)) < len(text) * 0.5:
                    continue

                line_num = content.count('\n', 0, match.start()) + 1
                hardcoded.append((line_num, 'Code String', text))

    except Exception as e:
        print(f"Erro ao ler {file_path}: {e}")
    
    return hardcoded

def main():
    print("# RELATÃ“RIO DE AUDITORIA I18N (Hardcoded Strings)")
    print("Analisando arquivos...\n")
    
    total_found = 0
    files_with_issues = 0

    for root, dirs, files in os.walk('.'):
        # Filtrar diretÃ³rios
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        
        for file in files:
            if any(file.endswith(ext) for ext in EXTENSIONS):
                file_path = os.path.join(root, file)
                results = analyze_file(file_path)
                
                if results:
                    files_with_issues += 1
                    print(f"## Arquivo: {file_path}")
                    for line, type_info, text in results:
                        total_found += 1
                        print(f"- [L{line}] [{type_info}]: \"{text}\"")
                    print()

    print("---")
    print(f"Resumo: {total_found} strings hardcoded encontradas em {files_with_issues} arquivos.")

if __name__ == "__main__":
    main()
