# Agentes Especialistas (Team Members)

O RCA System utiliza uma abordagem de **Time de Especialistas** (Multi-Agent Orchestration via Agno Team) para decompor problemas complexos de engenharia em diagnósticos específicos.

---

## 1. Media Failure Analyst (`Media_Failure_Analyst`)
Este agente atua como um **Perito Digital** em Engenharia de Materiais.

- **Tecnologia:** Gemini 2.0 Flash (Multimodal).
- **Missão:** Transformar evidências visuais (fotos e vídeos) em laudos técnicos baseados em evidências físicas.
- **Especialidades:**
    - **Padrões de Fratura:** Identificação de falhas dúcteis, frágeis ou por fadiga (marcas de praia).
    - **Degradação Química:** Detecção de corrosão uniforme, pite ou galvânica.
    - **Sinais de Manutenção:** Identificação de superaquecimento (mudança de cor metálica), falta de lubrificação ou desalinhamento de polias/correias.
- **Output:** Fornece um "Laudo Visual" objetivo que serve de evidência para a conclusão da causa raiz.

---

## 2. FMEA Technical Specialist (`FMEA_Technical_Specialist`)
Responsável pela ponte entre a **Teoria de Engenharia** e a realidade do ativo.

- **Missão:** Cruzar o modo de falha relatado com os dados históricos e os manuais técnicos.
- **Capacidades:**
    - Consulta o **VectorDB** de manuais técnicos (Markdown/PDF).
    - Acessa o **Banco de Dados SQL** (`fmea_modes`) para obter o RPN real.
    - Confronta sintomas atuais com modos de falha previstos em projeto.
- **Output:** Gera um parecer técnico comparativo (Teoria vs. Realidade).

---

## 3. Human Factors Investigator (`Human_Factors_Investigator`)
Especializado na metodologia **HFACS** (Human Factors Analysis and Classification System).

- **Missão:** Analisar as falhas de barreira humana e organizacional, evitando a culpabilização individual.
- **Categorias de Análise:**
    - **Atos Inseguros:** Erros de julgamento ou violações.
    - **Condições Precursoras:** Fadiga, comunicação falha ou treinamento inadequado.
    - **Supervisão Insegura:** Falhas de planejamento ou omissão em correções conhecidas.
    - **Influências Organizacionais:** Clima, processos operacionais e gestão de recursos.
- **Output:** Identifica as raízes sistêmicas que permitiram o erro humano.

---

## 4. RAG Validator (`RAG_Validator`)
Agente de triagem que atua no **Estágio 2** do pipeline (antes da orquestração principal).

- **Missão:** Filtrar os resultados brutos da busca vetorial (ChromaDB).
- **Função:** Analisa o conteúdo integral das RCAs candidatas e decide quais são "Recorrências Reais" e quais são "Falsos Positivos".
- **Benefício:** Evita que o Time de especialistas perca tempo analisando falhas que só compartilham palavras-chave irrelevantes.

---
*Atualizado em: 11/03/2026 - Pós-Issue 127*
