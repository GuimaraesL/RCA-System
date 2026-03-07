# 📚 Documentação do RCA System

Bem-vindo à central de documentação do projeto. Os arquivos foram organizados em categorias para facilitar a navegação.

## 🏗️ Core & Arquitetura
Documentos fundamentais sobre a estrutura e diretrizes do sistema.
- [Arquitetura Técnica](./core/ARQUITETURA.md) - Visão geral do monorepo, padrões e stack.
- [Referência da API](./core/REFERENCIA_API.md) - Endpoints e contratos v2.
- [Diretrizes de Código](./core/DIRETRIZES_CODIGO.md) - Padrões de desenvolvimento e commits.
- [PRD (Product Requirements)](./core/PRD.md) - Requisitos e visão do produto.

## 💾 Banco de Dados
- [Modelo de Dados Operacional](./database/MODELO_DADOS.md) - Estrutura do SQLite (`rca.db`) e plano FMEA.
- [Estrutura de Dados Raiz (IA)](./database/ESTRUTURA_DADOS_RAIZ.md) - Base de conhecimento e bancos vetoriais (`/data`).

## 🎨 Design & UX/UI
Tudo sobre a identidade visual e experiência do usuário.
- [Design System](./ux-ui/DESIGN_SYSTEM.md) - Paleta de cores, tipografia e componentes.

## 🧪 Qualidade & Testes (QA)
Estratégias e manuais de verificação.
- [Guia de Testes](./qa/TESTES.md) - Como rodar e criar testes (Unit, E2E, i18n).
- [Catálogo de Testes](./qa/CATALOGO_TESTES.md) - Lista de fluxos cobertos por automação.
- [Seletores de Teste](./qa/SELETORES_TESTE.md) - Padrões de `data-testid`.

## ⚙️ Processos & Negócio
Regras de governança e histórico de dados.
- [Regras de Negócio](./processes/REGRAS_NEGOCIO.md) - Ciclo de vida da RCA e validações.
- [Gestão de FMEA](./processes/FMEA.md) - Processo de cadastro e extração de modos de falha via IA.
- [Migração de Dados](./processes/MIGRACAO_DADOS.md) - Procedimentos de carga e normalização.

## 🤖 Inteligência Artificial (Issue #7)
Arquitetura e funcionamento do Copiloto RCA.
- [Arquitetura do Agente Unificado](./ai/architecture_unified_agent.md) - Design do cérebro central e postura proativa.
- [Knowledge & Tools](./ai/knowledge_tools.md) - Mapeamento de ferramentas e bases de conhecimento.
- [Pipeline de RAG](./ai/rag_pipeline.md) - Fluxo de busca vetorial e injeção de contexto.

---

> **Dica:** Mantenha os links relativos atualizados ao mover ou criar novos documentos.
