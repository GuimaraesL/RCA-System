# Documento de Requisitos do Produto (PRD) - RCA System

Status: **Em Desenvolvimento**
Versão: **2.3.0 (Integrity Sprint & i18n)**
Data: **11/02/2026**
Autor: **Time de Excelência Operacional & Antigravity AI**

---

## 1. Visão Geral

O **RCA System** é uma plataforma corporativa de **Gestão do Ciclo de Vida de Falhas (Failure Lifecycle Management)**. Seu objetivo é unificar, em uma única interface de alta performance, o registro de paradas operacionais (Triggers), a execução de análises de causa raiz (RCA) e o acompanhamento de planos de ação corretiva entre as manufaturas da planta.

O diferencial estratégico do produto é a **Performance Extrema**, a **UX Premium** (alinhada ao Design System corporativo) e o suporte nativo a **Internacionalização (i18n)**, garantindo que equipes globais possam colaborar sem barreiras linguísticas.

### 1.1 O Problema (Contexto Regional)
Atualmente, a gestão de falhas nas manufaturas sofre com **fragmentação crítica e falta de padronização**:
- **Desconexão Sistêmica:** "Triggers" (paradas) e "RCAs" são geridos em planilhas Excel isoladas, enquanto os "Planos de Ação" ficam no SharePoint. Não há vínculo digital entre eles.
- **Cultura de "Excel Livre":** Cada manufatura realiza suas análises de maneira própria, cadastrando dados sem padrão estruturado.
- **Impossibilidade de Governança:** A liberdade excessiva das planilhas impede a consolidação de KPIs regionais confiáveis.
- **Perda de Rastreabilidade:** Não se sabe se uma parada gerou uma RCA, ou se a ação planejada no SharePoint foi efetiva para evitar a reincidência.

### 1.2 A Solução
O **RCA System** nasce para ser a **Plataforma Única de Verdade**, substituindo o ecossistema de planilhas/SharePoint por:
- **Centralização:** Triggers, RCAs e Ações integrados em um único fluxo contínuo.
- **Padronização Forçada:** A interface não aceita "tudo". Schemas rígidos (Zod) e taxonomia unificada obrigam o usuário a seguir o padrão corporativo.
- **Conectividade:** O Plano de Ação nasce dentro da RCA, que nasce de um Trigger. O ciclo é inquebrável.
- **Governança Regional:** Permite que a liderança enxergue dados comparáveis entre diferentes manufaturas.

---

## 2. Personas e Casos de Uso

| Persona | Perfil | Principais Casos de Uso |
| :--- | :--- | :--- |
| **Operador / Técnico** | Focado no chão de fábrica. | - Registrar "Triggers" (eventos de parada). <br> - Verificar status de paradas pendentes em seu idioma local. |
| **Engenheiro / Analista** | Responsável pela melhoria contínua. | - Realizar RCAs usando metodologia 6M. <br> - Criar planos de ação. |
| **Gerente de Área** | Focado em KPIs e prazos. | - Visualizar Dashboards. <br> - Monitorar "Auto-Status" das análises. <br> - Auditar a eficácia das ações globalmente. |

---

## 3. Requisitos Funcionais (RF)

### 3.1 Módulo de Triggers (Eventos)
- **RF-001 (Importação):** O sistema deve permitir a importação de eventos via CSV/JSON com validação estrita de schema (datas, floats).
- **RF-002 (Listagem):** Exibição tabular de eventos de parada com performance O(1) para renderização.
- **RF-003 (Vínculo):** Permitir associar **múltiplos** Gatilhos (Triggers) a uma única RCA, permitindo que uma única análise consolide diversos eventos de parada relacionados.

### 3.2 Módulo de RCA (Root Cause Analysis)
- **RF-004 (Metodologia 6M):** Interface interativa para classificação de causas nas 6 categorias (Mão de obra, Método, Máquina, Material, Meio ambiente, Medida).
- **RF-005 (Herança de Dados):** Ao criar uma RCA a partir de um Trigger, herdar automaticamente: Data, Equipamento, Área e Descrição preliminar.
- **RF-006 (Auto-Status):** O sistema deve calcular automaticamente o status da análise (`Em Andamento`, `Aguardando Validação`, `Concluído`) baseado no preenchimento dos campos definidos como obrigatórios na configuração do sistema (incluindo a obrigatoriedade flexível do Plano de Ações).

### 3.3 Dashboard & Analytics
- **RF-007 (Dashboard):** Visualização interativa da distribuição de falhas por categoria (6M).
- **RF-008 (Filtros Globais):** Busca textual e filtros de data que atuam sobre 100% do dataset (client-side) instantaneamente.
- **RF-008 (Filtros Globais):** Busca textual e filtros de data que atuam sobre 100% do dataset (client-side) instantaneamente.

### 3.4 Suporte Internacional (i18n)
- **RF-010 (Multi-idioma):** Suporte completo a Inglês (EN) e Português (PT) em toda a interface.
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
- **RNF-008 (Persistência):** Banco de dados SQLite (`sql.js`) para portabilidade local. **Nota:** Atualmente a estrutura é acoplada ao SQLite e não está preparada para migração direta (Dívida Técnica registrada na **Issue #40**).

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
    - i18n: Solução customizada (Context API + Dicionários JSON).

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

> **Nota:** Este documento deve ser mantido atualizado em sincronia com `docs/DESIGN_SYSTEM.md` e `docs/TESTES.md`.

---

## 📚 Documentação Relacionada
- [Arquitetura Técnica](./ARQUITETURA.md)
- [Regras de Negócio](../processes/REGRAS_NEGOCIO.md)
- [Referência da API](./REFERENCIA_API.md)
- [Diretrizes de Código](./DIRETRIZES_CODIGO.md)
- [Design System](./DESIGN_SYSTEM.md)
- [Guia de Testes](../qa/TESTES.md)

---

> **Nota de Manutenção:** Este é o documento mestre. Mantenha-o atualizado com a verdade do produto. Se alterar requisitos aqui, atualize os documentos relacionados acima.
