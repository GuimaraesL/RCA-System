# Arquitetura do AI Service - Unified Agent

Esta documentação descreve o funcionamento do módulo de Inteligência Artificial do RCA System. O ai_service foi recentemente refatorado de um sistema Multi-Agente (com vários agentes especialistas e um coordenador) para um modelo de Agente Único Unificado, simplificando a base de código, reduzindo o consumo de tokens e melhorando a latência da comunicação.

## Visão Geral do main_agent.py

O coração da inteligência artificial reside no main_agent.py. Este agente atua como um Copiloto RCA centralizado, acumulando todas as responsabilidades que antes eram distribuídas: investigação histórica, validação técnica, formatação de diagramas/planos e diálogo conversacional.

### O Agente Unificado
- Nome: RCA_Unified_Copilot
- Modelo: gemini-2.5-flash
- Papel: Engenheiro Sênior de Confiabilidade e Copiloto RCA.
- Framework: Agno (agno.agent.Agent).

A unificação reduz a latência evitando handoffs (transferência de chamadas entre agentes), mitiga a diluição de contexto e soluciona problemas de vazamento de contexto indesejado (onde respostas entre o Super Agent e seus Workers poluíam o histórico).

## Análise Multimodal (Imagens e Vídeos)

O Agente Unificado é nativamente Multimodal. Ele utiliza as capacidades do motor Gemini 2.5 Flash para processar não apenas texto, mas também evidências visuais diretamente integradas à investigação.

### Protocolo de Engenharia para Mídias
O agente segue diretrizes rígidas (baseadas no sistema legado) para garantir a qualidade do diagnóstico visual:
1.  Objetividade Técnica: Descrição factual do que é visível, evitando especulações prematuras.
2.  Categorias de Observação:
    -   Evidências de Falha: Trincas, deformações, vazamentos, sinais de superaquecimento.
    -   Dinâmica (Vídeo): Vibrações, ruídos, variações de velocidade e movimentos anômalos.
    -   Comportamento Humano: Posturas, uso de EPIs e interações com o ativo.
    -   Contorno Ambiental: Contaminações, iluminação e obstruções.
3.  Abordagem de Laudo Visual: A IA gera primeiramente um "laudo visual" objetivo antes de cruzar os dados com o Histórico para propor a causa raiz final.

- Fluxo de Dados: Quando o usuário anexa fotos ou vídeos no Passo 7 do Editor RCA, o sistema envia as URLs das mídias para o ai_service. O serviço realiza o download assíncrono e repassa os binários para o framework Agno.
- Interação: O usuário pode perguntar diretamente no chat: "Baseado na foto que anexei, você concorda com o desgaste por abrasão?".

## Capacidades do Agente (Tools e Skills)

Para atuar de forma abrangente, o agente central conta com um array completo de recursos:

1. Ferramentas de Histórico (RAG):
   - search_historical_rcas_tool: Busca vetorial no banco de falhas anteriores.
   - get_historical_rca_summary: Extração de resumos de falhas passadas.
   - get_historical_rca_causes e get_historical_rca_action_plan: Extração direta de causas raízes e resoluções passadas.
   - get_historical_rca_triggers: Extrai as engatilhadores que iniciaram falhas passadas.

2. Engenharia e Técnicas:
   - get_asset_fmea_tool: Integração simulada (ou real) com banco de FMEA do Ativo.
   - DuckDuckGoTools(): Busca aberta na internet para manuais, componentes ou conceitos técnicos que não estão no banco interno.

3. Conhecimento Embutido (Knowledge Base):
   - O agente tem acesso imediato a duas Bases de Conhecimento Vetorizadas (knowledge parameter do Agno):
     - RCAs Históricas: Banco de dados vetorial de RCAs concluídas.
     - Metodologia (Knowledge Files): Arquivos MD (Markdown) que contêm a metodologia oficial RCA da empresa (ex: como fazer 5 Porquês, Ishikawa, etc).

## O Prompt Unificado (core/prompts.py)

O prompt que orquestra todo o comportamento deste Agente Único chama-se MAIN_AGENT_PROMPT. Ele foi desenhado sob o modelo de Classificação de Intenção Interna, exigindo que o agente decida como se portar baseado no input do usuário:

*   Comportamento Socrático: O agente é instruído a não "cuspir" a causa raiz imediatamente quando um problema vago é relatado. Ele pergunta progressivamente (aplicando os 5 Porquês) focando em relações de Causa e Efeito, como um facilitador de investigação humana faria.
*   Decisão de Ferramentas:
    *   Conversa Rápida: Responde direto (sem acionar ferramentas lentas).
    *   Insights de Histórico/FMEA: Aciona tools de RAG e formata uma resposta discursiva focada na história técnica.
    *   Artefatos Estruturados: Só aciona regras estritas de formatação Markdown ou Mermaid se o usuário requisitar (Ex: "Gere o Ishikawa").
*   Regras de Sintaxe Críticas: O prompt mantém as diretrizes de "Engenharia de Prompt" avançada (como bloqueio de escapes e quebras de linha em diagramas Mermaid) herdadas do antigo writer_agent para evitar que erros de renderização "quebrem" a visualização do frontend.

## API e Fluxo de Mensagens (api/routes.py)

A interação entre o Frontend e o Agente se dá pelo endpoint /analyze que responde com um stream SSE (Server-Sent Events) compatível com o streaming do framework Agno.

### 1. Injeção de Contexto Global (Shadow Prompting)

A requisição do usuário (ou a primeira análise automática quando a página carrega) chega ao endpoint. Antes de passar a mensagem para o Agente, o sistema constrói um "Contexto Global" injetando silenciosamente:
1.  Dados do Formulário (DADOS ATUAIS DA TELA): Dados da aba "Report" do Frontend (Ativo, Título da Falha, Descrição).
2.  Busca RAG Pré-Processada (HISTÓRICO ENCONTRADO): Uma busca hierárquica automática no RAG baseada no equipamento e área, injetando incidentes idênticos prévios como contexto de pano de fundo sem consumir turnos de pensamento do agente.

### 2. Streaming Direto
Por ser um único agente, o código percorre o evento assíncrono gerado por ai_engine.arun(stream=True). Diferente do antigo time de agentes que envolvia "Transferring" e eventos de Workflow complexos, o stream do agente isolado filtra a execução de tools (substituindo por avisos de "reasoning", e.g., "Consultando histórico...") e envia os deltas (pedaços da resposta textual gerada) puros para o Frontend com alta velocidade.

## Vantagens da Nova Estrutura

- Simplicidade: Não é necessário gerenciar estado nem permissões de Hand-Off entre múltiplos agentes.
- Robustez: Eliminação de bugs do framework Agno relacionados a times e context leaks cruzados.
- Rastreabilidade Simplificada: O histórico da sessão sqlite (session_messages) no /analyze/history reflete uma única trilha sequencial entre user e assistant.

Esta nova implementação alinha a inteligência conversacional a fluxos operacionais rápidos e transparentes para a ferramenta de RCA.
