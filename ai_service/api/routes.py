# AI Service - Rotas da API
# Endpoints de saúde e análise de causa raiz assistida por IA.

from fastapi import APIRouter, Header, HTTPException, File, UploadFile
from fastapi.responses import StreamingResponse
import os
import glob
import shutil
from .models import AnalysisRequest, AnalysisResponse, RecurrenceInfo, MediaItem
from core.knowledge import get_rca_history_knowledge, index_fmea_documents
from core.config import INTERNAL_AUTH_KEY, AGENT_MEMORY_PATH, BACKEND_URL
from agno.utils.log import logger
from agno.media import Image, Video
import json
import asyncio
import httpx

router = APIRouter()

@router.get("/health")
async def health_check():
    return {"status": "ok"}

@router.get("/fmea/files")
async def list_fmea_files(x_internal_key: str = Header(None)):
    if x_internal_key != INTERNAL_AUTH_KEY:
        raise HTTPException(status_code=403, detail="Invalid Internal Key")
    
    base_dir = os.path.dirname(os.path.dirname(__file__))
    fmea_path = os.path.join(base_dir, "data", "fmea")
    
    if not os.path.exists(fmea_path):
        return {"files": []}
    
    files = []
    # Busca tanto .md quanto .pdf
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

@router.post("/fmea/upload")
async def upload_fmea_file(file: UploadFile = File(...), x_internal_key: str = Header(None)):
    if x_internal_key != INTERNAL_AUTH_KEY:
        raise HTTPException(status_code=403, detail="Invalid Internal Key")
    
    allowed_extensions = {".md", ".pdf"}
    file_ext = os.path.splitext(file.filename)[1].lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Apenas arquivos .md e .pdf são permitidos.")
    
    base_dir = os.path.dirname(os.path.dirname(__file__))
    fmea_path = os.path.join(base_dir, "data", "fmea")
    os.makedirs(fmea_path, exist_ok=True)
    
    file_path = os.path.join(fmea_path, file.filename)
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Re-indexa a biblioteca FMEA para incluir o novo arquivo no RAG
        index_fmea_documents()
        
        return {"status": "success", "filename": file.filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao salvar arquivo: {str(e)}")

@router.post("/extract-fmea")
async def extract_fmea_endpoint(payload: dict, x_internal_key: str = Header(None)):
    """
    Extrai modos de falha (FMEA) estruturados a partir de um texto descritivo.
    """
    if x_internal_key != INTERNAL_AUTH_KEY:
        raise HTTPException(status_code=403, detail="Invalid Internal Key")
    
    text = payload.get("text")
    if not text:
        raise HTTPException(status_code=400, detail="O campo 'text' é obrigatório.")

    from agents.fmea_agent import get_fmea_agent
    agent = get_fmea_agent()
    
    prompt = (
        f"Analise o seguinte texto e extraia os modos de falha em formato JSON:\n\n"
        f"TEXTO: {text}\n\n"
        "Retorne APENAS um array JSON de objetos com os campos: "
        "failure_mode, potential_effects, severity, potential_causes, occurrence, current_controls, detection, recommended_actions."
    )
    
    try:
        response = agent.run(prompt)
        content = response.content
        
        # Extração de JSON do bloco Markdown
        import re
        json_match = re.search(r'```json\s*(.*?)\s*```', content, re.DOTALL)
        if json_match:
            content = json_match.group(1)
        
        # Limpeza de possíveis comentários ou ruídos
        content = content.strip()
        
        try:
            parsed_json = json.loads(content)
            # O teste espera que a lista venha envelopada em uma chave "modes"
            if isinstance(parsed_json, list):
                return {"modes": parsed_json}
            return parsed_json
        except:
            # Fallback se a IA falhar na formatação mas retornar texto
            raise HTTPException(status_code=500, detail="A IA gerou um formato de dados inválido.")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/fmea/files/{filename}")
async def delete_fmea_file(filename: str, x_internal_key: str = Header(None)):
    if x_internal_key != INTERNAL_AUTH_KEY:
        raise HTTPException(status_code=403, detail="Invalid Internal Key")
    
    base_dir = os.path.dirname(os.path.dirname(__file__))
    fmea_path = os.path.join(base_dir, "data", "fmea")
    file_path = os.path.join(fmea_path, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Arquivo não encontrado.")
    
    try:
        os.remove(file_path)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao deletar arquivo: {str(e)}")

@router.delete("/analyze/history/{rca_id}")
async def clear_chat_history(rca_id: str, x_internal_key: str = Header(None)):
    """Limpa o histórico de chat de uma sessão do banco SQLite do agente (Limpeza Profunda)."""
    if x_internal_key != INTERNAL_AUTH_KEY:
        raise HTTPException(status_code=403, detail="Invalid Internal Key")

    from agents.main_agent import get_rca_agent
    import sqlite3
    
    # Obtém o agente para ter acesso ao session_id correto (geralmente rca_id)
    agent = get_rca_agent(rca_id)
    sid = agent.session_id
    
    try:
        # 1. Limpeza nativa do Agno (agno_sessions e agno_memories)
        agent.delete_session(sid)
        
        # 2. Limpeza Manual Profunda (Telemetria e Tabelas Customizadas)
        # Como o Agno não limpa traces/spans por padrão, fazemos manualmente para economizar espaço
        conn = sqlite3.connect(AGENT_MEMORY_PATH)
        cursor = conn.cursor()
        
        # Lista de tabelas para limpeza baseada no session_id
        tables_to_clean = ["rca_sessions", "agno_traces"]
        
        for table in tables_to_clean:
            cursor.execute(f"DELETE FROM {table} WHERE session_id = ?", (sid,))
            
        # Limpeza de spans (vinculados ao trace_id que por sua vez vincula ao session_id)
        # Deletamos spans cujos traces foram (ou seriam) deletados
        cursor.execute("""
            DELETE FROM agno_spans 
            WHERE trace_id IN (SELECT trace_id FROM agno_traces WHERE session_id = ?)
        """, (sid,))
        
        # Deletamos os traces novamente após limpar os spans (garantia de integridade)
        cursor.execute("DELETE FROM agno_traces WHERE session_id = ?", (sid,))
        
        conn.commit()
        conn.close()
        
        logger.info(f"🧹 Limpeza profunda concluída para a sessão: {sid}")
        return {"status": "success", "message": "Histórico e telemetria limpos com sucesso"}
        
    except Exception as e:
        logger.error(f"❌ Erro ao realizar limpeza profunda na RCA {rca_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao limpar banco: {e}")

@router.get("/analyze/history/{rca_id}")
async def get_chat_history(rca_id: str, x_internal_key: str = Header(None)):
    """
    Recupera o histórico de chat da sessão do RCA diretamente do banco SQLite do agente.
    Isso permite repovoar o frontend se a sidebar for fechada e aberta.
    """
    if x_internal_key != INTERNAL_AUTH_KEY:
        raise HTTPException(status_code=403, detail="Invalid Internal Key")

    from agents.main_agent import get_rca_agent
    agent = get_rca_agent(rca_id)

    messages = []
    try:
        session_msgs = agent.get_session_messages(rca_id)
    except Exception:
        session_msgs = []

    if session_msgs:
        for msg in session_msgs:
            if msg.role in ['user', 'assistant']:
                content = msg.content

                # Agno pode retornar 'content' como None se for apenas uma chamada de ferramenta (tool_call) sem resposta textual
                if not content or not isinstance(content, str):
                    continue

                # --- LÓGICA DE LIMPEZA DE MEMÓRIA (ROBUSTA) ---
                # 1. Se a mensagem for do Assistente mas contiver tags de Sistema, é um "Leak" do Agno (Bug do framework)
                if msg.role == 'assistant' and ("<!-- RCA_SYSTEM_CONTEXT -->" in content or "<!-- INITIAL_ANALYSIS_REQUEST -->" in content):
                    continue

                # 2. Extrai apenas a mensagem real do usuário escondendo o contexto de sistema
                if "<!-- USER_MESSAGE -->" in content:
                    content = content.split("<!-- USER_MESSAGE -->")[-1].strip()
                elif "<!-- INITIAL_ANALYSIS_REQUEST -->" in content:
                    content = "Solicitei uma análise baseada nos dados atuais do formulário."
                elif "<!-- RCA_SYSTEM_CONTEXT -->" in content:
                    # Caso raro onde sobrou apenas o contexto
                    content = "Dados contextuais enviados ao assistente."

                # 3. Filtra mensagens redundantes de status
                if content.strip() in ["IO", "Analisando...", "Consultando...", "Analizando..."]:
                    if msg.role == 'assistant': continue

                messages.append({
                    "role": msg.role,
                    "content": content,
                })

    return {"messages": messages}

@router.post("/analyze")
async def analyze_rca(request: AnalysisRequest, x_internal_key: str = Header(None)):
    """
    Realiza a análise da RCA usando o agente unificado.
    Retorna um StreamingResponse (SSE) para uma UX fluida.
    Suporta entrada multimodal (imagens e vídeos).
    """
    if x_internal_key != INTERNAL_AUTH_KEY:
        raise HTTPException(status_code=403, detail="Invalid Internal Key")

    try:
        # Garante que o diretório de storage existe
        import os
        from core.config import AGENT_MEMORY_PATH
        os.makedirs(os.path.dirname(AGENT_MEMORY_PATH), exist_ok=True)

        # --- NOVA LÓGICA DE CAPTURA DE ATIVO ---
        area_id = request.area_id
        equipment_id = request.equipment_id
        subgroup_id = request.subgroup_id
        asset_info = "Ativo não identificado explicitamente"

        # 2. Se for uma análise nova (não salva ainda), capturar do contexto
        query_text = ""
        if request.context:
            try:
                ctx = json.loads(request.context)
                query_text = f"{ctx.get('title', '')} {ctx.get('description', '')}"
                # Prioriza o asset_display do contexto se os IDs ainda forem nulos (novo RCA)
                if asset_info == "Ativo não identificado explicitamente":
                    asset_info = ctx.get('asset_display', asset_info)

                # Captura IDs do contexto se vierem da interface (Novo RCA)
                area_id = area_id or ctx.get('area_id')
                equipment_id = equipment_id or ctx.get('equipment_id')
                subgroup_id = subgroup_id or ctx.get('subgroup_id')
            except:
                query_text = request.context

        from core.knowledge import get_rca_history_knowledge
        knowledge_base = get_rca_history_knowledge()

        # 3. Busca Hierárquica de Recorrências (SEPARADA por nível)
        subgroup_matches = []
        equipment_matches = []
        area_matches = []

        import re
        def clean_title(content: str) -> str:
            """Extrai o título limpo via Regex ignorando IDs e campos vizinhos."""
            # Novo Formato (RESUMO DO PROBLEMA)
            match = re.search(r'RESUMO DO PROBLEMA:\s*(.*?)(?=\n\n|$|DESCRIÇÃO)', content, flags=re.DOTALL)
            if match:
                return match.group(1).replace('\n', ' ').strip()
            
            # Fallback Legacy
            match_legacy = re.search(r'TÍTULO/O QUE \(What\):\s*(.+?)(?=\s*QUEM \(Who\):|\Z)', content, flags=re.DOTALL)
            if match_legacy:
                return match_legacy.group(1).replace('\n', ' ').strip()
            
            lines = content.split('\n')
            return lines[0][:100] if lines else "Sem título"

        def clean_root_causes(content: str) -> str:
            match = re.search(r'CAUSAS RAIZ:\s*(.*?)(?=\n\n|$|AÇÕES DO PLANO:)', content, flags=re.DOTALL)
            if match:
                causes = match.group(1).strip()
                return causes.replace(" | ", "\n")
            return ""

        def extract_recurrence(doc, level_name: str, rank: int) -> RecurrenceInfo:
            """Extrai RecurrenceInfo de um documento do VectorDB."""
            content = doc.content
            
            # Pega as chaves reais que salvamos na indexação
            area_val = doc.meta_data.get("area_id", "")
            equip_val = doc.meta_data.get("equipment_id", "")
            subg_val = doc.meta_data.get("subgroup_id", "")

            title = clean_title(doc.content)
            root_causes = clean_root_causes(doc.content)
            
            # Buscar data da falha (pode estar no conteudo via regex, metadados futuros ou via fetch real-time)
            fail_date = doc.meta_data.get("failure_date", "")
            if not fail_date:
                match_dt = re.search(r'DATA DA FALHA:\s*([^\n]+)', doc.content)
                if match_dt:
                    fail_date = match_dt.group(1).strip()
            
            # Backup: fetch real-time from server since we just added support and old chromadb doesn't have it
            if not fail_date:
                rca_i = doc.meta_data.get("rca_id", "unknown")
                if rca_i != "unknown":
                    try:
                        base_url = BACKEND_URL.rstrip('/')
                        # Autenticação interna via key configurada
                        headers = {"x-internal-key": INTERNAL_AUTH_KEY}
                        resp = httpx.get(f"{base_url}/api/rcas/{rca_i}", timeout=3.0, headers=headers)
                        if resp.status_code == 200:
                            j_resp = resp.json()
                            if 'failure_date' in j_resp and j_resp['failure_date']:
                                fail_date = j_resp['failure_date']
                    except Exception as e:
                        pass # Silently fail fetch and keep doing things

            return RecurrenceInfo(
                rca_id=doc.meta_data.get("rca_id", "unknown"),
                similarity=0.0,
                title=title,
                level=level_name,
                symptoms="N/A", # Não precisamos mais espelhar sintoma a sintoma no pydantic
                root_causes=root_causes, 
                failure_date=fail_date,
                equipment_name=f"Área: {area_val} > Equip: {equip_val} > Subgrupo: {subg_val}",
                area_name=area_val,
                subgroup_name=subg_val,
                actions="N/A",
                raw_content=content # Injetamos toda a riqueza do texto original aqui
            )

        if query_text:
            seen_ids = set()

            # Nível 1: Mesmo Subgrupo (filtro rigoroso: subgroup + equipment + area)
            if subgroup_id and equipment_id and area_id:
                filters = {
                    "$and": [
                        {"subgroup_id": str(subgroup_id)},
                        {"equipment_id": str(equipment_id)},
                        {"area_id": str(area_id)}
                    ]
                }
                results = knowledge_base.vector_db.search(
                    query=query_text, limit=10,
                    filters=filters
                )
                if results:
                    for rank, doc in enumerate(results):
                        rid = doc.meta_data.get("rca_id", "unknown")
                        if rid not in seen_ids and rid != request.rca_id:
                            subgroup_matches.append(extract_recurrence(doc, "subgroup", rank))
                            seen_ids.add(rid)

            # Nível 2: Mesmo Equipamento (exclui os já encontrados no subgrupo)
            if equipment_id and area_id:
                filters = {
                    "$and": [
                        {"equipment_id": str(equipment_id)},
                        {"area_id": str(area_id)}
                    ]
                }
                results = knowledge_base.vector_db.search(
                    query=query_text, limit=10,
                    filters=filters
                )
                if results:
                    for rank, doc in enumerate(results):
                        rid = doc.meta_data.get("rca_id", "unknown")
                        doc_subg_id = str(doc.meta_data.get("subgroup_id", ""))
                        # Se for o mesmo subgrupo do incidente atual, já foi pego no nível 1!
                        if rid not in seen_ids and rid != request.rca_id and doc_subg_id != str(subgroup_id):
                            equipment_matches.append(extract_recurrence(doc, "equipment", rank))
                            seen_ids.add(rid)

            # Nível 3: Equipamentos Diferentes (Mesma Área/Manufatura)
            if area_id:
                results = knowledge_base.vector_db.search(
                    query=query_text, limit=15,
                    filters={"area_id": str(area_id)}
                )
                if results:
                    for rank, doc in enumerate(results):
                        rid = doc.meta_data.get("rca_id", "unknown")
                        doc_equip_id = str(doc.meta_data.get("equipment_id", ""))
                        # Se for o mesmo equipamento, já foi pego no nível 1 ou 2!
                        if rid not in seen_ids and rid != request.rca_id and doc_equip_id != str(equipment_id):
                            area_matches.append(extract_recurrence(doc, "area", rank))
                            seen_ids.add(rid)

        # Se for apenas para buscar os metadados (persistência de estado do banner) e pular o Agent
        if request.metadata_only:
            return {
                "subgroup_matches": [m.dict() for m in subgroup_matches],
                "equipment_matches": [m.dict() for m in equipment_matches],
                "area_matches": [m.dict() for m in area_matches]
            }

        # Lista unificada para injeção no contexto do LLM (concat das 3)
        recurrences = subgroup_matches + equipment_matches + area_matches

        ui_lang = request.ui_language or "Português-BR"
        is_initial_analysis = not (request.user_prompt and str(request.user_prompt).strip())

        # Processamento de Mídia (Multimodal)
        images = []
        videos = []
        # OTIMIZAÇÃO: Baixa e envia mídias apenas na análise inicial para poupar milhares de tokens no chat
        if request.attachments and is_initial_analysis:
            async with httpx.AsyncClient() as client:
                for att in request.attachments:
                    # Constrói URL absoluta se for relativa
                    media_url = att.url
                    if media_url.startswith('/'):
                        # Remove barra final do BACKEND_URL para evitar //
                        base = BACKEND_URL.rstrip('/')
                        media_url = f"{base}{media_url}"

                    try:
                        logger.info(f"[Media] Baixando midia para analise: {media_url}")
                        # Header de autenticação service-to-service (mesmo padrão do backend Node)
                        resp = await client.get(
                            media_url,
                            headers={"x-internal-key": INTERNAL_AUTH_KEY},
                            timeout=30.0
                        )
                        if resp.status_code == 200:
                            if att.type == 'image':
                                images.append(Image(content=resp.content))
                                logger.info(f"[Media] Imagem carregada: {att.filename} ({len(resp.content)} bytes)")
                            elif att.type == 'video':
                                videos.append(Video(content=resp.content))
                                logger.info(f"[Media] Video carregado: {att.filename} ({len(resp.content)} bytes)")
                        else:
                            logger.error(f"[Media] Falha HTTP {resp.status_code} ao baixar {media_url}")
                    except Exception as media_err:
                        logger.error(f"[Media] Falha ao baixar midia {media_url}: {media_err}")

        # ============================================================
        # ESTÁGIO 2: VALIDAÇÃO LLM DAS RECORRÊNCIAS (Pipeline 2-Stage RAG)
        # ============================================================
        validated_recurrences_text = None
        if recurrences and is_initial_analysis:
            try:
                from agents.rag_validator import get_rag_validator
                validator = get_rag_validator()
                
                # Monta o prompt de validação com os candidatos BRUTOS (Toda a história)
                candidate_texts = []
                for r in recurrences:
                    # Aqui formatamos a exibição real para o LLM injetando raw_content
                    item = f"ID_RCA: {r.rca_id} | Hierarquia do Incidente: {r.equipment_name} | Algoritmo do RAG (Nível): {r.level}\n"
                    item += f"--- CONTEÚDO INTEGRAL DA ANÁLISE ---\n{r.raw_content}\n------------------------------------"
                    candidate_texts.append(item)
                
                validation_prompt = (
                    f"PROBLEMA ATUAL:\n{query_text}\n"
                    f"Ativo Atual: {asset_info}\n\n"
                    f"CANDIDATOS DO RAG (ChromaDB):\n" + "\n\n".join(candidate_texts)
                )
                
                logger.info(f"[RAG-VALIDATOR] Validando {len(recurrences)} candidatos (Texto Bruto Injetado)...")
                validation_response = validator.run(validation_prompt)
                validated_recurrences_text = validation_response.content
                logger.info(f"[RAG-VALIDATOR] Resultado: {validated_recurrences_text[:200]}...")
            except Exception as val_err:
                logger.error(f"[RAG-VALIDATOR] Erro na validação: {val_err}")
                # Fallback: se o validador falhar, injeta tudo como antes
                validated_recurrences_text = "\n".join([f"- RCA {r.rca_id}: {r.raw_content[:200]}..." for r in recurrences])

        # ============================================================
        # ESTÁGIO 3: COPILOTO RCA (Agente Principal)
        # ============================================================
        # Contexto do incidente (dados da tela + evidencias visuais)
        context_block = ""
        if request.context:
            context_block += f"\n[DADOS ATUAIS DA TELA]:\nAtivo: {asset_info}\n{request.context}\n"

        if (images or videos) and is_initial_analysis:
            context_block += f"\n[EVIDÊNCIAS VISUAIS]: Existem {len(images)} imagens e {len(videos)} vídeos anexados para sua análise técnica.\n"

        from agents.main_agent import get_rca_agent
        ai_engine = get_rca_agent(str(request.rca_id), language=ui_lang)

        # 2. Monta o prompt final (Contexto Risco-Zero)
        # Verifica se o histórico está vazio para saber se é a primeira mensagem de chat real
        try:
            session_messages = ai_engine.get_session_messages(str(request.rca_id))
            is_new_session = len(session_messages) == 0
        except Exception:
            # Agno lança erro se a sessão não existir no banco ainda
            is_new_session = True

        if not is_initial_analysis:
            logger.info(f"📡 ROTA: Mensagem de chat recebida -> Unified Agent Mode.")
            prompt = request.user_prompt
            
            # Se for sessão nova e o usuário responder de forma afirmativa à saudação do frontend
            is_brief_affirmative = str(prompt).lower().strip() in ["sim", "ok", "pode ser", "claro", "analisar", "fazer", "bora", "com certeza"]
            
            if is_new_session:
                if is_brief_affirmative:
                    prompt = f"O usuário confirmou a análise sugerida. Realize a análise completa de causa raiz para a RCA ID: {request.rca_id} baseando-se no contexto abaixo:\n"
                else:
                    prompt = f"Contexto inicial da RCA:\n{context_block}\n\nPergunta do Usuário: {prompt}"
                
                # Injeta context_block e recurrences se for a primeira vez que o Agente atua
                if context_block and "Contexto inicial" not in prompt: prompt = f"{context_block}\n" + prompt
                if validated_recurrences_text: prompt += f"\n### RECORRÊNCIAS VALIDADAS:\n{validated_recurrences_text}\n"
        else:
            logger.info(f"📡 ROTA: Análise inicial automática -> Unified Agent Mode.")
            prompt = f"Realize a análise completa de causa raiz para a RCA ID: {request.rca_id} baseando-se nos dados abaixo:\n"
            if context_block: prompt += f"{context_block}\n"
            if validated_recurrences_text: prompt += f"\n### RECORRÊNCIAS VALIDADAS:\n{validated_recurrences_text}\n"
        logger.info(f"🔍 ROTA: Motor={type(ai_engine).__name__}, Prompt ({len(prompt)} chars)")

        # 4. Gerador de Streaming para SSE compatível com Agno 2.x e o Frontend
        async def stream_output():
            logger.debug(f"📡 DEBUG: Iniciando stream ASYNC para RCA {request.rca_id}")
            # Alertas de recorrência imediatos via metadata (apenas na análise inicial)
            if recurrences and not request.user_prompt:
                yield f"data: {json.dumps({'type': 'metadata', 'subgroup_matches': [r.dict() for r in subgroup_matches], 'equipment_matches': [r.dict() for r in equipment_matches], 'area_matches': [r.dict() for r in area_matches]})}\n\n"

            full_response_content = ""
            is_inside_suggestions = False
            try:
                logger.info(f"📡 DEBUG: Chamando motor de IA para prompt de {len(prompt)} chars")

                # ai_engine.arun(stream=True) retorna AsyncIterator nativo
                async for event in ai_engine.arun(prompt, stream=True, stream_intermediate_steps=True, images=images or None, videos=videos or None):
                    logger.debug(f"📡 DEBUG: Evento Agent: {type(event)}")

                    event_type = type(event).__name__
                    if event_type in ("WorkflowCompletedEvent", "WorkflowAgentCompletedEvent", "RunCompletedEvent"):
                        continue

                    content = ""
                    if hasattr(event, "content") and event.content:
                        content = event.content
                    elif isinstance(event, str):
                        content = event

                    if content:
                        content_str = str(content)
                        full_response_content += content_str

                        # --- SANITIZAÇÃO DE MERMAID (ANTI-ALUCINAÇÃO) ---
                        # Remove escapes de quebra de linha literais (\n) que o modelo insiste em colocar
                        if "graph LR" in content_str or "subgraph" in content_str:
                            content_str = content_str.replace("\\n", "\n").replace("\\\"", "\"")

                        if content_str.startswith("search_historical_rcas_tool"):
                            yield f"data: {json.dumps({'type': 'reasoning', 'text': 'Consultando o histórico de falhas e arquivos mortos...'})}\n\n"
                            continue
                        elif content_str.startswith("get_asset_fmea_tool"):
                            yield f"data: {json.dumps({'type': 'reasoning', 'text': 'Analisando banco de FMEA do ativo...'})}\n\n"
                            continue
                        elif "FMEA_Technical_Specialist" in content_str:
                            yield f"data: {json.dumps({'type': 'reasoning', 'text': 'Consultando Especialista em FMEA...'})}\n\n"
                            continue
                        elif "Media_Failure_Analyst" in content_str:
                            yield f"data: {json.dumps({'type': 'reasoning', 'text': 'Analisando evidências visuais (fotos/vídeos)...'})}\n\n"
                            continue
                        elif "Human_Factors_Investigator" in content_str:
                            yield f"data: {json.dumps({'type': 'reasoning', 'text': 'Investigando fatores humanos e organizacionais...'})}\n\n"
                            continue
                        elif "get_deterministic_fmea_tool" in content_str:
                            yield f"data: {json.dumps({'type': 'reasoning', 'text': 'Acessando modos de falha determinísticos no banco FMEA...'})}\n\n"
                            continue
                        elif "calculate_reliability_metrics_tool" in content_str:
                            yield f"data: {json.dumps({'type': 'reasoning', 'text': 'Calculando indicadores de confiabilidade (MTBF/MTTR)...'})}\n\n"
                            continue
                        elif content_str.startswith("get_full_rca_detail_tool"):
                            yield f"data: {json.dumps({'type': 'reasoning', 'text': 'Acessando conteúdo integral e triggers da RCA selecionada...'})}\n\n"
                            continue
                        elif "completed in" in content_str and ("tool" in content_str or "Tool" in content_str):
                            continue
                        elif content_str.startswith("get_rca_context_tool"):
                            continue
                        elif content_str.startswith("Transferring"):
                            yield f"data: {json.dumps({'type': 'reasoning', 'text': 'Coordenando fluxo de trabalho...'})}\n\n"
                            continue
                        elif content_str.startswith("Running"):
                            # Extrai o nome real da ferramenta que o Agno loga (ex: "Running tool get_skill_reference")
                            tool_name = content_str.replace("Running tool", "").strip() or "especializada"
                            if "DuckDuckGo" in tool_name or tool_name == "duckduckgo": tool_name = "Busca Web Livre"
                            yield f"data: {json.dumps({'type': 'reasoning', 'text': f'Acionando habilidade: {tool_name}...'})}\n\n"
                            continue

                        # --- LÓGICA DE SUPRESSÃO DE SUGESTÕES (SSE) ---
                        if not is_inside_suggestions:
                            if "<suggestions>" in content_str:
                                is_inside_suggestions = True
                                # Envia apenas o que veio ANTES da tag no mesmo chunk
                                parts = content_str.split("<suggestions>")
                                if parts[0]:
                                    yield f"data: {json.dumps({'type': 'content', 'delta': parts[0]})}\n\n"
                            else:
                                # Proteção contra tags quebradas entre chunks (ex: <sugg... estions>)
                                # Se o final do full_content indicar que uma tag está começando, paramos de enviar
                                if "<suggestions" in full_response_content and "<suggestions>" not in full_response_content:
                                    # Aguardamos a tag completar para decidir
                                    pass 
                                elif "<suggestions>" in full_response_content:
                                    is_inside_suggestions = True
                                else:
                                    yield f"data: {json.dumps({'type': 'content', 'delta': content_str})}\n\n"
                        else:
                            # Se já estamos dentro, verificamos se a tag fechou (raro vir texto após)
                            if "</suggestions>" in content_str:
                                is_inside_suggestions = False
                                # Se houver texto após a tag de fechamento, podemos enviar (opcional)
                                parts = content_str.split("</suggestions>")
                                if len(parts) > 1 and parts[1]:
                                    yield f"data: {json.dumps({'type': 'content', 'delta': parts[1]})}\n\n"

                # Extração Final de Sugestões (do conteúdo acumulado completo)
                import re
                suggestions_match = re.search(r'<suggestions>(.*?)</suggestions>', full_response_content, re.DOTALL)
                if suggestions_match:
                    suggestions_text = suggestions_match.group(1).strip()
                    suggestions_list = [s.strip() for s in suggestions_text.split('|') if s.strip()]
                    if suggestions_list:
                        yield f"data: {json.dumps({'type': 'suggestions', 'suggestions': suggestions_list})}\n\n"

            except Exception as stream_e:
                print(f"ERROR no streaming: {stream_e}")
                yield f"data: {json.dumps({'type': 'error', 'text': str(stream_e)})}\n\n"

            print("DEBUG: Stream finalizado.")
            yield "data: [DONE]\n\n"


        return StreamingResponse(stream_output(), media_type="text/event-stream")

    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

