# Regras de Negócio - RCA System

Este documento descreve as regras de negócio centrais que governam o comportamento do RCA System.

> **Objetivo de Governança:** Diferente de planilhas Excel onde "tudo é aceito", este sistema impõe regras rígidas de validação para garantir a padronização regional e a integridade dos KPIs.

---

## 🏗️ Ciclo de Vida da RCA

A Análise de Causa Raiz (RCA) é a entidade principal do sistema. Seu ciclo de vida é gerido automaticamente com base no preenchimento de dados e na eficácia das ações.

### 1. Criação
- **ID:** Gerado automaticamente (UUID) se não fornecido.
- **Status Inicial:** Sempre inicia como `Em Andamento` (IN_PROGRESS).
- **Versão:** Define a versão do formulário utilizada (ex: `17.2`).
- **Herança:** Se criada via Gatilho, herda:
    - Ativo (Área, Equipamento, Subgrupo).
    - Descrição do problema (do `stop_reason`).
    - Data da falha.

### 2. Cálculo Automático de Status
O sistema recalcula o status da RCA a cada salvamento ou alteração em suas Ações vinculadas.

| Status | Regra de Negócio |
| :--- | :--- |
| **Em Andamento** | Estado padrão. Mantido enquanto **qualquer** campo obrigatório estiver vazio OU se houver erros de validação. |
| **Aguardando Verificação** | Todos os campos obrigatórios preenchidos, MAS possui ações obrigatórias que ainda não foram marcadas como eficazes. |
| **Concluída** | 1. Todos os campos obrigatórios preenchidos.<br>2. Se houver ações, todas são eficazes.<br>3. Se não houver ações (e não forem obrigatórias), conclui direto. |

> **Nota:** O sistema impede a conclusão manual se as regras acima não forem satisfeitas.

### 3. Campos Obrigatórios (Taxonomia)
A obrigatoriedade dos campos é dinâmica e configurável via `TaxonomyService`.
- **Regra de Criação:** Campos mínimos para salvar um rascunho (ex: `what`, `asset`).
- **Regra de Conclusão:** Lista estrita de campos para finalizar (ex: `root_causes`, `five_whys`, `ishikawa`, `actions`).
- **Validação:** Realizada tanto no Frontend (UX feedback) quanto no Backend (Integridade).

---

## ⚡ Regras de Gatilhos (Triggers)

Os gatilhos representam eventos de parada que podem ou não virar uma RCA.
- **Conversão:** Um gatilho pode ser "promovido" a RCA. O sistema cria o vínculo `trigger.rca_id`.
- **Exclusividade:** Uma RCA pode ter **apenas um** gatilho vinculado atualmente.
> *Nota: A estrutura de One-to-Many está em roadmap.*

---

## ✅ Planos de Ação (CAPA)

Ações Corretivas e Preventivas vinculadas a uma RCA.
- **Recálculo em Cascata:** Criar, editar ou excluir uma ação dispara imediatamente o recálculo do status da RCA pai (`RcaService.updateRca`).
- **Eficácia:** Uma ação só é considerada eficaz se o status for `Concluída` ou `Eficaz` (IDs 3 ou 4).

---

## 🛡️ Integridade de Dados e Migração

O `RcaService` implementa normalizadores (`migrateRcaData`) para garantir que dados legados não quebrem a aplicação:
- **5 Porquês:** Garante array mínimo de 5 posições.
- **Ishikawa:** Garante a estrutura dos 6M (`machine`, `method`, etc).
- **Causa Raiz:** Converte string simples (legado) para array de objetos `root_causes`.

---

## 📚 Documentação Relacionada
- [PRD - Requisitos](./PRD.md)
- [API Reference](./API_REFERENCE.md)

---

> **Nota de Manutenção:** Mantenha este documento atualizado. Alterações nas regras de negócio devem ser sincronizadas com os testes em [TEST_CATALOG.md](./TEST_CATALOG.md).
- [Catálogo de Testes](./TEST_CATALOG.md)
- [Arquitetura Técnica](./ARCHITECTURE.md)
