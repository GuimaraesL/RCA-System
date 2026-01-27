
import re
import sys

def convert():
    try:
        with open('i18n/locales/pt.ts', 'r', encoding='utf-8') as f:
            lines = f.readlines()

        start_idx = -1
        for i, line in enumerate(lines):
            if 'export const pt' in line:
                start_idx = i
                break
        
        if start_idx == -1:
            print("Start not found")
            sys.exit(1)

        json_lines = ["{"]
        
        for line in lines[start_idx+1:]:
            original_line = line.rstrip()
            if original_line.strip() == '};':
                json_lines.append('}')
                break
            
            # Regex poderoso:
            # 1. Pega chave no início da linha (indentada): ^\s*(\w+):
            # 2. OU Pega chave precedida por { ou , ou espaço: (?<=[\s,\{])(\w+):
            # Mas wait, (?<=) requer tamanho fixo no python antigo? \s é 1 char? \s é char set. Sim, funciona.
            # Vamos aplicar regex global.
            
            # Padrão: (\w+): mas deve ter lookbehind positivo de delimitador seguro.
            # Delimitadores seguros fora de string: espaço, tab, vírgula, chave aberta.
            
            processed_line = re.sub(r'(?<=[\s,\{])(\w+):', r'"\1":', original_line)
            
            # Caso especial: Início de linha sem nada antes (além da indentação que o regex acima pega se \s incluir o indent)
            # Se a linha for "    key:", o \s pega os espaços.
            
            json_lines.append(processed_line)

        full_json = '\n'.join(json_lines)
        
        # Cleanup final: Trailing commas
        full_json = re.sub(r',(\s*\})', r'\1', full_json)

        with open('i18n/locales/pt_temp.json', 'w', encoding='utf-8') as f:
            f.write(full_json)
        
        print("Converted successfully")

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    convert()
