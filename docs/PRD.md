# Documento de Requisitos do Produto (PRD) - RCA System

Status: **Em Desenvolvimento**
Versão: **2.3.0 (Integrity Sprint & i18n)**
Data: **11/02/2026**
Autor: **Time de Excelência Operacional & Antigravity AI**

---

## 1. Visão Geral

O **RCA System** é uma plataforma corporativa de **Gestão do Ciclo de Vida de Falhas (Failure Lifecycle Management)**. Seu objetivo é unificar, em uma única interface de alta performance e globalmente acessível, o registro de paradas operacionais (Triggers), a execução de análises de causa raiz (RCA) e o acompanhamento de planos de ação corretiva.

O diferencial estratégico do produto é a **Performance Extrema**, a **UX Premium** (alinhada ao Design System corporativo) e o suporte nativo a **Internacionalização (i18n)**, garantindo que equipes globais possam colaborar sem barreiras linguísticas.

### 1.1 O Problema
Sistemas legados de gestão de falhas sofrem com:
- Lentidão excessiva ao carregar históricos de paradas.
- Desconexão entre o evento (Trigger) e a análise (RCA).
- Falta de padronização nos dados e terminologias inconsistentes entre regiões.
- Interfaces arcaicas que desestimulam o uso e dificultam a adoção global.

### 1.2 A Solução
Um sistema web moderno (React + Node) focado em:
- **Zero Lag:** Renderização otimizada para datasets massivos.
- **Integridade:** Validação estrita de dados na entrada via Schemas (Zod).
- **Globalização:** Interface totalmente traduzida e adaptável ao contexto do usuário.
- **Padronização Visual:** Design System rigoroso para consistência profissional.

---

## 2. Personas e Casos de Uso

| Persona | Perfil | Principais Casos de Uso |
| :--- | :--- | :--- |
| **Operador / Técnico** | Focado no chão de fábrica. | - Registrar "Triggers" (eventos de parada). <br> - Verificar status de paradas pendentes em seu idioma local. |
| **Engenheiro / Analista** | Responsável pela melhoria contínua. | - Realizar RCAs usando metodologia 6M. <br> - Criar planos de ação. <br> - Exportar relatórios técnicos (PDF). |
| **Gerente de Área** | Focado em KPIs e prazos. | - Visualizar Dashboards (Pareto, Tendências). <br> - Monitorar "Auto-Status" das análises. <br> - Auditar a eficácia das ações globalmente. |

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
- **RF-007 (Gráficos Dinâmicos):** Visualização interativa da distribuição de falhas por categoria (6M) utilizando bibliotecas performáticas.
- **RF-008 (Filtros Globais):** Busca textual e filtros de data que atuam sobre 100% do dataset (client-side) instantaneamente.
- **RF-009 (Exportação):** Capacidade de gerar relatórios (PDF) das análises concluídas para documentação física.

### 3.4 Suporte Internacional (i18n)
- **RF-010 (Multi-idioma):** Suporte completo a Inglês (EN), Português (PT) e Espanhol (ES) em toda a interface.
- **RF-011 (Contexto Dinâmico):** Traduções de dados dinâmicos (Status, Categorias 6M) devem persistir corretamente após filtros e recarregamentos.

### 3.5 Documentação e Ajuda
- **RF-012 (Central de Ajuda):** Módulo integrado de documentação para guiar usuários nas melhores práticas de RCA e uso do sistema.

---

## 4. Requisitos Não-Funcionais (RNF)

### 4.1 Performance
- **RNF-001 (Zero Lag Rendering):** A interface não deve travar ("freeze") mesmo carregando 2000+ registros.
- **RNF-002 (Intelligent Cap):** Implementar virtualização (react-window) para listas longas.
- **RNF-003 (Busca O(1)):** Algoritmos de busca e filtro devem operar em memória com alta eficiência.

### 4.2 Usabilidade & Design System
- **RNF-004 (Conformidade Visual):** A interface deve seguir estritamente o `docs/DESIGN_SYSTEM.md`.
    - Cores: Paleta Slate/Blue (Corporate Professional).
    - Proibido: Uso de roxo/violeta ou sombras pesadas.
    - Tipografia: Inter (Corpo) e Outfit (Títulos).
- **RNF-005 (Feedback Visual):** Uso consistente de loaders, skeletons e toasts para ações assíncronas.

### 4.3 Qualidade e Manutenibilidade
- **RNF-006 (Testes):** Cobertura de testes unitários (Vitest) para lógica de negócios e componentes críticos, além de testes E2E (Playwright) para fluxos principais.
- **RNF-007 (Sanitização):** O Backend deve utilizar Zod para validação rigorosa de schemas de entrada.
- **RNF-008 (Persistência):** Banco de dados SQLite (`sql.js`) para portabilidade local, com estrutura preparada para migração futura se necessário.

---

## 5. Arquitetura Técnica

### 5.1 Stack Tecnológico
- **Frontend:** React 19 (Vite), TypeScript, TailwindCSS v4.
- **Backend:** Node.js (Express), TypeScript.
- **Banco de Dados:** SQLite (`sql.js` / `better-sqlite3`).
- **Validação:** Zod (Schemas compartilhados entre Front/Back).
- **Testes:** Vitest (Unitários/Integração), Playwright (E2E).
- **Bibliotecas Chave:**
    - UI: `lucide-react` (Ícones), `recharts` (Gráficos), `animejs` (Animações).
    - Performance: `react-window`, `react-virtualized-auto-sizer`.
    - i18n: `react-i18next` (ou solução customizada leve).

### 5.2 Fluxo de Dados
1. **Frontend** carrega dataset inicial e definições de localização.
2. Dados são normalizados em **Contexts** tipados e validados via Zod.
3. Interações de filtro e tradução ocorrem **Client-Side** (memória) para instantaneidade.
4. Gravações (Salvar RCA) são enviadas ao **Backend Express** que valida e persiste no SQLite.

---

## 6. Glossário
- **Trigger:** O evento gatilho (ex: Falha na Bomba X as 14:00).
- **RCA:** Análise detalhada do porquê o Trigger ocorreu.
- **6M:** Método Ishikawa para categorização de causas.
- **Design System:** Conjunto de regras visuais (Cores, Tipografia, Espaçamento) definido em `docs/DESIGN_SYSTEM.md`.
- **i18n:** Internationalization (Internacionalização do software).

---

> **Nota:** Este documento deve ser mantido atualizado em sincronia com `docs/DESIGN_SYSTEM.md` e `docs/TESTING.md`.
