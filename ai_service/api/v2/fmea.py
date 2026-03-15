"""
Proposta: Gerenciar o upload, deleção e extração de base de conhecimento FMEA.
Fluxo: Recebe arquivos manuais FMEA, persiste em disco, e solicita indexação ao VectorDB. Também realiza a extração inteligente usando um agente especialista FMEA.
"""
from fastapi import APIRouter, Header, HTTPException, File, UploadFile
import os
import secrets
import glob
import shutil
import json

from core.config import INTERNAL_AUTH_KEY
from core.knowledge import index_fmea_documents

router = APIRouter()

@router.get("/files")
async def list_fmea_files(x_internal_key: str = Header(None)):
    if not secrets.compare_digest(x_internal_key or '', INTERNAL_AUTH_KEY):
        raise HTTPException(status_code=403, detail="Invalid Internal Key")
    
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    fmea_path = os.path.join(base_dir, "data", "fmea")
    
    if not os.path.exists(fmea_path):
        return {"files": []}
    
    files = []
    pattern_md = os.path.join(fmea_path, "*.md")
    pattern_pdf = os.path.join(fmea_path, "*.pdf")
    
    all_files = glob.glob(pattern_md) + glob.glob(pattern_pdf)
    
    for f in all_files:
        stats = os.stat(f)
        files.append({
            "name": os.path.basename(f),
            "size": stats.st_size,
            "modified": stats.st_mtime
        })
    return {"files": files}

@router.post("/upload")
async def upload_fmea_file(file: UploadFile = File(...), x_internal_key: str = Header(None)):
    if not secrets.compare_digest(x_internal_key or '', INTERNAL_AUTH_KEY):
        raise HTTPException(status_code=403, detail="Invalid Internal Key")
    
    allowed_extensions = {".md", ".pdf"}
    file_ext = os.path.splitext(file.filename)[1].lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Apenas arquivos .md e .pdf são permitidos.")
    
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    fmea_path = os.path.join(base_dir, "data", "fmea")
    os.makedirs(fmea_path, exist_ok=True)
    
    file_path = os.path.join(fmea_path, file.filename)
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        index_fmea_documents()
        return {"status": "success", "filename": file.filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao salvar arquivo: {str(e)}")

@router.post("/extract-fmea")
async def extract_fmea_endpoint(payload: dict, x_internal_key: str = Header(None)):
    if not secrets.compare_digest(x_internal_key or '', INTERNAL_AUTH_KEY):
        raise HTTPException(status_code=403, detail="Invalid Internal Key")
    
    text = payload.get("text")
    if not text:
        raise HTTPException(status_code=400, detail="O campo 'text' é obrigatório.")

    from agents.fmea_agent import get_fmea_agent
    agent = get_fmea_agent()
    
    prompt = (
        f"Analise o seguinte texto e extraia os modos de falha em formato JSON:\\n\\n"
        f"TEXTO: {text}\\n\\n"
        "Retorne APENAS um array JSON de objetos com os campos: "
        "failure_mode, potential_effects, severity, potential_causes, occurrence, current_controls, detection, recommended_actions."
    )
    
    try:
        response = agent.run(prompt)
        content = response.content
        
        import re
        json_match = re.search(r'```json\s*(.*?)\s*```', content, re.DOTALL)
        if json_match:
            content = json_match.group(1)
        
        content = content.strip()
        
        try:
            parsed_json = json.loads(content)
            if isinstance(parsed_json, list):
                return {"modes": parsed_json}
            return parsed_json
        except:
            raise HTTPException(status_code=500, detail="A IA gerou um formato de dados inválido.")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/files/{filename}")
async def delete_fmea_file(filename: str, x_internal_key: str = Header(None)):
    if not secrets.compare_digest(x_internal_key or '', INTERNAL_AUTH_KEY):
        raise HTTPException(status_code=403, detail="Invalid Internal Key")
    
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    fmea_path = os.path.join(base_dir, "data", "fmea")
    file_path = os.path.join(fmea_path, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Arquivo não encontrado.")
    
    try:
        os.remove(file_path)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao deletar arquivo: {str(e)}")
