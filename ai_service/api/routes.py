# AI Service - Rotas da API
# Endpoints de saúde e análise de causa raiz assistida por IA.

from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import StreamingResponse
from .models import AnalysisRequest, AnalysisResponse, RecurrenceInfo, FmeaExtractionRequest, FmeaExtractionResponse, MediaItem
from core.knowledge import get_rca_history_knowledge
from core.config import INTERNAL_AUTH_KEY, AGENT_MEMORY_PATH, BACKEND_URL
from core.prompts import GLOBAL_RULES, FMEA_EXTRACTION_PROMPT
from agno.utils.log import logger
from agno.media import Image, Video
import json
import asyncio
import httpx

router = APIRouter()

@router.get("/health")
async def health_check():
    return {"status": "ok"}

@router.post("/extract-fmea")
async def extract_fmea(request: FmeaExtractionRequest, x_internal_key: str = Header(None)):
    """
    Extrai modos de falha estruturados de um texto bruto (manual ou OCR).
    Retorna uma lista de objetos FmeaItem.
    """
    if x_internal_key != INTERNAL_AUTH_KEY:
        raise HTTPException(status_code=403, detail="Invalid Internal Key")

    try:
        from agno.agent import Agent
        from agno.models.google import Gemini

        # Criamos um agente temporário especialista em extração
        extractor = Agent(
            name="FMEA_Extractor",
            model=Gemini(id="gemini-2.0-flash"), # Usamos o 2.0 flash para extração rápida e barata
            instructions=[
                GLOBAL_RULES.replace("{idioma}", request.ui_language),
                FMEA_EXTRACTION_PROMPT.replace("{idioma}", request.ui_language)
            ],
            markdown=True
        )

        response = extractor.run(request.text)
        content = response.content

        # Tenta limpar o conteúdo se vier com blocos de código markdown
        if "```json" in content:
            content = content.split("```json")[-1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[-1].split("```")[0].strip()

        # Parseia o JSON
        try:
            data = json.loads(content)
            # Retorna no modelo esperado
            return FmeaExtractionResponse(modes=data)
        except json.JSONDecodeError:
            logger.error(f"Erro ao parsear JSON da IA: {content}")
            raise HTTPException(status_code=500, detail="A IA gerou um formato de dados inválido.")

    except Exception as e:
        logger.error(f"Erro na extração FMEA: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/analyze/history/{rca_id}")
async def clear_chat_history(rca_id: str, x_internal_key: str = Header(None)):
    """Limpa o histórico de chat de uma sessão do banco SQLite do agente."""
    if x_internal_key != INTERNAL_AUTH_KEY:
        raise HTTPException(status_code=403, detail="Invalid Internal Key")

    from agents.main_agent import get_rca_agent
    agent = get_rca_agent(rca_id)
    
    try:
        agent.delete_session(agent.session_id)
        return {"status": "success", "message": "Histórico limpo"}
    except Exception as e:
        logger.error(f"Erro ao limpar histórico {rca_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao limpar banco: {e}")
            
    return {"status": "ok", "message": "Nenhum histórico ativo encontrado."}

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
    session_msgs = agent.get_session_messages(rca_id)

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

        # 2. Monta o prompt final (Contexto Risco-Zero: só gasta tokens 1 vez na vida da sessao)
        if not is_initial_analysis:
            logger.info(f"📡 ROTA: Mensagem de chat recebida -> Unified Agent Mode. (Multimodal: {len(images)} imgs, {len(videos)} vids)")
            prompt = request.user_prompt
        else:
            logger.info(f"📡 ROTA: Análise inicial automática -> Unified Agent Mode. (Multimodal: {len(images)} imgs, {len(videos)} vids)")
            
            # Constrói o blocão da Análise Inicial (DADOS DA TELA + VALIDAÇÕES)
            prompt = f"Realize a análise completa de causa raiz para a RCA ID: {request.rca_id} baseando-se nos dados abaixo:\n"
            if context_block:
                prompt += f"{context_block}\n"
            if validated_recurrences_text:
                prompt += f"\n### RECORRÊNCIAS VALIDADAS:\n{validated_recurrences_text}\n"
        logger.info(f"🔍 ROTA: Motor={type(ai_engine).__name__}, Prompt ({len(prompt)} chars)")

        # 4. Gerador de Streaming para SSE compatível com Agno 2.x e o Frontend
        async def stream_output():
            logger.debug(f"📡 DEBUG: Iniciando stream ASYNC para RCA {request.rca_id}")
            # Alertas de recorrência imediatos via metadata (apenas na análise inicial)
            if recurrences and not request.user_prompt:
                yield f"data: {json.dumps({'type': 'metadata', 'subgroup_matches': [r.dict() for r in subgroup_matches], 'equipment_matches': [r.dict() for r in equipment_matches], 'area_matches': [r.dict() for r in area_matches]})}\n\n"

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

                        yield f"data: {json.dumps({'type': 'content', 'delta': content_str})}\n\n"
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

