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

        # 3. Busca Hierárquica de Recorrências (Acumulativa)
        recurrences = []
        levels = [
            ("subgroup", subgroup_id),
            ("equipment", equipment_id),
            ("area", area_id)
        ]

        if query_text:
            seen_ids = set()
            for level_name, level_id in levels:
                if not level_id: continue
                search_filter = {f"{level_name}_id": str(level_id)}
                results = knowledge_base.vector_db.search(
                    query=query_text,
                    limit=3,
                    filters=search_filter
                )
                if results:
                    for doc in results:
                        rid = doc.meta_data.get("rca_id", "unknown")
                        if rid not in seen_ids and rid != request.rca_id:
                            # Extrair causas e ações do conteúdo formatado no documento
                            content_lines = doc.content.split("\n")
                            causes = "N/A"
                            actions = "N/A"
                            for line in content_lines:
                                if line.startswith("CAUSAS RAIZ:"): causes = line.replace("CAUSAS RAIZ: ", "")
                                if line.startswith("AÇÕES TOMADAS:"): actions = line.replace("AÇÕES TOMADAS: ", "")

                            recurrences.append(RecurrenceInfo(
                                rca_id=rid,
                                similarity=1.0,
                                title=content_lines[0].replace("TÍTULO DA Falha: ", "").replace("TÍTULO DA FALHA: ", ""),
                                level=level_name,
                                root_causes=causes,
                                actions=actions
                            ))
                            seen_ids.add(rid)

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

        # Fase 3: Motor de IA Unificado para consistência de memória
        # 1. Constrói o Contexto Global (Formulário + Recorrências)
        context_block = ""
        # Os DADOS ATUAIS DA TELA devem ir em todo request para manter o LLM ciente se o usuário alterou títulos/causas no input
        if request.context:
            context_block += f"\n[DADOS ATUAIS DA TELA]:\nAtivo: {asset_info}\n{request.context}\n"

        # OTIMIZAÇÃO: Injeta histórico pesado do RAG (RCA) apenas na primeira mensagem. Evita bloat de prompt.
        if recurrences and is_initial_analysis:
            recurr_items = []
            for r in recurrences:
                item = f"- [RCA {r.rca_id[:8]}...](#/rca/{r.rca_id}): {r.title} (Nível: {r.level})"
                if r.root_causes and r.root_causes != "N/A":
                    item += f"\n  - Causa Raiz: {r.root_causes}"
                if r.actions and r.actions != "N/A":
                    item += f"\n  - Ações anteriores: {r.actions}"
                recurr_items.append(item)
            context_block += f"\n[HISTÓRICO ENCONTRADO]:\n" + "\n".join(recurr_items) + "\n"

        if (images or videos) and is_initial_analysis:
            context_block += f"\n[EVIDÊNCIAS VISUAIS]: Existem {len(images)} imagens e {len(videos)} vídeos anexados para sua análise técnica.\n"

        # Injetamos o contexto no agente via instructions para evitar repetição no DB de chat
        from agents.main_agent import get_rca_agent
        ai_engine = get_rca_agent(str(request.rca_id), language=ui_lang, rca_context=context_block)

        # 2. Monta o prompt final
        if not is_initial_analysis:
            logger.info(f"📡 ROTA: Mensagem de chat recebida -> Unified Agent Mode. (Multimodal: {len(images)} imgs, {len(videos)} vids)")
            prompt = request.user_prompt
        else:
            logger.info(f"📡 ROTA: Análise inicial automática -> Unified Agent Mode. (Multimodal: {len(images)} imgs, {len(videos)} vids)")
            prompt = f"Realize a análise completa de causa raiz para a RCA ID: {request.rca_id} baseando-se nos dados fornecidos e nas evidências visuais."
        logger.info(f"🔍 ROTA: Motor={type(ai_engine).__name__}, Prompt ({len(prompt)} chars)")

        # 4. Gerador de Streaming para SSE compatível com Agno 2.x e o Frontend
        async def stream_output():
            logger.debug(f"📡 DEBUG: Iniciando stream ASYNC para RCA {request.rca_id}")
            # Alertas de recorrência imediatos via metadata (apenas na análise inicial)
            if recurrences and not request.user_prompt:
                yield f"data: {json.dumps({'type': 'metadata', 'recurrences': [r.dict() for r in recurrences]})}\n\n"

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
                        elif content_str.startswith("Transferring") or content_str.startswith("Running"):
                            yield f"data: {json.dumps({'type': 'reasoning', 'text': 'Coordenando especialistas...'})}\n\n"
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

