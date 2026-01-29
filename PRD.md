# Documento de Requisitos do Produto (PRD) - RCA System

Status: **Aprovado**  
Versão: **2.2.0 (Integrity Sprint)**  
Data: **27/01/2026**  
Autor: **Time de Excelência Operacional & Antigravity AI**

---

## 1. Visão Geral

O **RCA System** é uma plataforma corporativa de **Gestão do Ciclo de Vida de Falhas (Failure Lifecycle Management)**. Seu objetivo é unificar, em uma única interface de alta performance, o registro de paradas operacionais (Triggers), a execução de análises de causa raiz (RCA) e o acompanhamento de planos de ação corretiva.

O diferencial estratégico do produto é a **Performance Extrema** e a **UX Premium**, garantindo que engenheiros e gestores possam manipular datasets com milhares de registros sem latência, promovendo uma cultura de agilidade na resolução de problemas.

### 1.1 O Problema
Sistemas legados de gestão de falhas sofrem com:
- Lentidão excessiva ao carregar históricos de paradas.
- Desconexão entre o evento (Trigger) e a análise (RCA).
- Falta de padronização nos dados (datas inválidas, campos livres sujos).
- Interfaces arcaicas que desestimulam o preenchimento correto.

### 1.2 A Solução
Um sistema web moderno (React + Node) focado em:
- **Zero Lag:** Renderização otimizada para datasets massivos.
- **Integridade:** Validação estrita de dados na entrada.
- **Inteligência:** Vínculos automáticos e sugestões de status.

---

## 2. Personas e Casos de Uso

| Persona | Perfil | Principais Casos de Uso |
| :--- | :--- | :--- |
| **Operador / Técnico** | Focado no chão de fábrica. | - Registrar "Triggers" (eventos de parada). <br> - Verificar status de paradas pendentes. |
| **Engenheiro / Analista** | Responsável pela melhoria contínua. | - Realizar RCAs usando metodologia 6M. <br> - Criar planos de ação. <br> - Vincular Triggers a Análises. |
| **Gerente de Área** | Focado em KPIs e prazos. | - Visualizar Dashboards (Pareto, Tendências). <br> - Monitorar "Auto-Status" das análises. <br> - Auditar a eficácia das ações. |

---

## 3. Requisitos Funcionais (RF)

### 3.1 Módulo de Triggers (Eventos)
- **RF-001 (Importação):** O sistema deve permitir a importação de eventos via CSV/JSON com validação estrita de schema (datas, floats).
- **RF-002 (Listagem):** Exibição tabular de eventos de parada com performance O(1) para renderização.
- **RF-003 (Vínculo):** Permitir associar um ou mais Triggers a uma RCA nova ou existente.

### 3.2 Módulo de RCA (Root Cause Analysis)
- **RF-004 (Metodologia 6M):** Interface interativa para classificação de causas nas 6 categorias (Mão de obra, Método, Máquina, Material, Meio ambiente, Medida).
- **RF-005 (Herança de Dados):** Ao criar uma RCA a partir de um Trigger, herdar automaticamente: Data, Equipamento, Área e Descrição preliminar.
- **RF-006 (Auto-Status):** O sistema deve calcular automaticamente o status da análise (`Em Andamento`, `Aguardando Validação`, `Concluído`) baseado no preenchimento dos campos obrigatórios e planos de ação.

### 3.3 Dashboard & Analytics
- **RF-007 (Gráficos Dinâmicos):** Visualização interativa da distribuição de falhas por categoria (6M).
- **RF-008 (Filtros Globais):** Busca textual e filtros de data que atuam sobre 100% do dataset (client-side) instantaneamente.
- **RF-009 (Drill-down):** Navegação hierárquica: *Área -> Equipamento -> Subconjunto*.

### 3.4 Gestão de Ações
- **RF-010 (Plano de Ação):** Registro de ações corretivas com: O que, Quem, Quando (Prazo) e Status.
- **RF-011 (Auditoria):** Histórico de alterações críticas (quem mudou o quê).

---

## 4. Requisitos Não-Funcionais (RNF) - "High Performance"

### 4.1 Performance
- **RNF-001 (Zero Lag Rendering):** A interface não deve travar ("freeze") mesmo carregando 2000+ registros.
- **RNF-002 (Intelligent Cap):** Implementar virtualização ou paginação lógica (ex: renderizar chunks de 100 itens) para manter o DOM leve.
- **RNF-003 (Busca O(1)):** Algoritmos de busca e filtro devem operar em memória com complexidade próxima de constante ou linear simples, sem requisições desnecessárias ao backend.

### 4.2 Usabilidade (UX Premium)
- **RNF-004 (Feedback Visual):** Uso de loaders, skeletons e toasts para todas as ações assíncronas.
- **RNF-005 (Estética):** Design moderno (fundo escuro/glassmorphism opcional, tipografia limpa), evitando o visual "planilha de Excel".

### 4.3 Segurança e Dados
- **RNF-006 (Sanitização):** O Backend deve rejeitar qualquer payload que viole o Schema (ex: texto em campo de data).
- **RNF-007 (Persistência):** Banco de dados SQLite para portabilidade, com backups automáticos (desejável nos scripts de operação).

---

## 5. Arquitetura Técnica

### 5.1 Stack Tecnológico
- **Frontend:** React 19 (Vite), TypeScript, TailwindCSS v4.
- **Backend:** Node.js (Express ou Fastify), TypeScript.
- **Banco de Dados:** SQLite (Armazenamento local, arquivo único para fácil migração/backup).
- **Bibliotecas Chave:** `animejs` (Animações), `lucide-react` (Ícones), `recharts` (Gráficos), `@google/genai` (Assistência IA).

### 5.2 Fluxo de Dados
1. **Frontend** carrega dataset inicial (JSON/API).
2. Dados são normalizados em **Stores/Contexts** tipados.
3. Interações de filtro ocorrem **Client-Side** (memória).
4. Gravações (Salvar RCA) são enviadas ao **Backend** que valida e persiste no SQLite.

---

## 6. Glossário
- **Trigger:** O evento gatilho (ex: Falha na Bomba X as 14:00).
- **RCA:** Análise detalhada do porquê o Trigger ocorreu.
- **6M:** Método Ishikawa para categorização de causas.
- **Sombra de Dados:** Conceito de persistir dados mesmo que ocultos pelos filtros atuais.

---

> **Nota:** Este documento é vivo e deve ser atualizado conforme novas *Integrity Sprints* forem concluídas.
