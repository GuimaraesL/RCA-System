
import re
import json
import sys

def convert():
    try:
        with open('i18n/locales/pt.ts', 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Remove imports and exports
        # Find the start of the object
        start = content.find('{')
        end = content.rfind('};')
        
        if start == -1 or end == -1:
            print("Could not find object boundaries")
            sys.exit(1)
            
        obj_content = content[start:end+1]
        
        # Add quotes to keys
        # Simple regex: word characters followed by colon, ignoring generic colons in strings?
        # This is fragile but works for well-formatted files like the one viewed
        # Pattern: matches "key:" and replaces with ""key":"
        # Capture strictly alphanumeric keys at start of line or after space/brace
        json_str = re.sub(r'(?<=[\{\s,])(\w+):', r'"\1":', obj_content)
        
        # Fix trailing commas (JSON does not allow them)
        json_str = re.sub(r',(\s*[\}\]])', r'\1', json_str)
        
        # Save
        with open('i18n/locales/pt_temp.json', 'w', encoding='utf-8') as f:
            f.write(json_str)
            
        print("Converted successfully to i18n/locales/pt_temp.json")
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    convert()
