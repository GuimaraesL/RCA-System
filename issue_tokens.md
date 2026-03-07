## Contexto

Durante uma interacao com o Agente de RCA, foi observado um consumo excessivo de tokens de input em chamadas secundarias de chat. Uma pergunta curta como *"qual a conclusao?"* gerou um input de ~32.000 tokens. Esse comportamento impacta diretamente na lentidao das respostas, estouro de limites de contexto da API e custo das chamadas LLM e Multimodais.

## Analise do Problema (Root Cause para o Consumo Alto)

### 1. Re-envio e Re-processamento Constante de Midias
Em `api/routes.py`, sempre que o frontend (`aiStreamingService.ts`) envia a payload com arquivos (attachments), o backend baixa todas as imagens e videos via HTTP e repassa via paramentros `images` e `videos` na funcao `ai_engine.arun()`.
Isso significa que, a cada mensagem no chat, 7 imagens de alta resolucao e 1 video sao enviados DE NOVO para o Gemini processar a visao computacional. Midias consomem milhares de tokens.

### 2. Injecao Duplicada de Shadow Prompts (Historico Encontrado)
A cada interacao, o endpoint repete a busca no RAG (LanceDB), encontra as 3 RCAs antigas mais parecidas e as anexa ao instrucion sheet oculto. O LLM acaba recebendo o texto das recorrencias vezes sem conta. Como o Agno mantem historico SQLite, ele ja sabe dessas recorrencias a partir da primeira iteracao.

### 3. Bloat no Historico do Agente
Somados os fatos acima, o DB do Agno guarda as interacoes. Ao ler o historico passado (com textos massivos) e receber um novo system instruction gigante com midias, os tokens sobem exponencialmente.

## Criterios de Aceite
- [ ] **Manejo Inteligente de Midias:** Imagens e Videos devem ser enviados para a API do Gemini APENAS na **analise inicial automatica** ou mediante comando explicito (ex: se o usuario disser "analise a midia novamente"). Retirar a sobrecarga continua no chat.
- [ ] **Desacoplamento do Shadow Context no Chat:** O RAG com as RCAs similares (`recurr_items`) so deve ser injetado no prompt / `rca_context` quando for a `is_initial_analysis == True`. No modo chat, assume-se que as recorrencias repousam na memoria de sessoes (historico).
- [ ] **Reducao Comprovada de Tokens:** Apos implantacao, testes no terminal devem mostrar drop drastico (ex: voltar para a faixa < 8k) em mensagens subsequentes curtas.

## Tarefas
- [ ] Em `api/routes.py`, envolver a linha de processamento de midia e download (httpx.get) com uma condicional `if is_initial_analysis:` ou rastrear midias com hash para checar repetição.
- [ ] Em `api/routes.py`, envolver o bloco de codigo que injeta o "[HISTORICO ENCONTRADO]" (`if recurrences:`) ativando-o apenas na `is_initial_analysis`.
- [ ] Avaliar limitacao no parametro `num_history_runs` do `main_agent.py` para reter as maximas X mensagens se precisar de pruning.
