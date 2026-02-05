# Relatório de Auditoria Técnica - Backend RCA System
**Data:** 05 de Fevereiro de 2026  
**Status:** Auditoria Rigorosa Concluída (Sem Alterações)  
**Arquitetura:** Híbrida (V1 Legacy + V2 Clean Architecture Bridge)

---

## 1. Arquitetura e Design (Débito Técnico)

### 1.1 Estado Híbrido e Risco de Inconsistência
- **Observação:** Atualmente, apenas o módulo de **RCAs** foi migrado para a arquitetura `v2` (Controller -> Service -> Repository). Gatilhos, Ações, Taxonomia e Ativos ainda residem na pasta `routes/` com lógica acoplada ao Express.
- **Risco:** A coexistência de duas formas diferentes de manipular o banco de dados (especialmente o tratamento de `null` e strings vazias) pode levar a estados inconsistentes na mesma tabela.

### 1.2 Dependência de Idioma na Lógica de Negócio (i18n)
- **Problema:** O `RcaService.ts` utiliza nomes de status em português (`s.name === 'Concluída'`) para determinar se um status é gerenciado automaticamente ou está "protegido".
- **Impacto:** Se a base de dados for internacionalizada (ex: status "Completed"), a lógica de negócio de "Auto-Status" irá falhar. A lógica deve ser baseada em **IDs estáveis** (ex: `STATUS-03`), nunca em nomes exibíveis.

---

## 2. Performance e Escalabilidade (Crítico)

### 2.1 Eficiência em Operações de Massa (Bulk)
- **Problema:** Em `SqlRcaRepository.bulkCreate`, o sistema executa um loop chamando `this.upsert(rca)`, que por sua vez abre, executa e fecha um statement SQL individualmente (`db.run`) para cada item.
- **Impacto:** Em datasets de milhares de registros, isso é extremamente lento. O SQLite (mesmo em memória via `sql.js`) performa ordens de magnitude melhor utilizando um único **Statement Preparado** e bindando os valores no loop.

### 2.2 Falta de Paginação no Backend
- **Problema:** O endpoint `GET /api/rcas` executa um `SELECT * FROM rcas` sem limites.
- **Impacto:** Com 7.000+ registros identificados na auditoria de UI, o payload JSON torna-se pesado, aumentando o consumo de memória do Node.js e o tempo de transferência de rede, contradizendo o requisito "Zero Lag" do PRD.

### 2.3 Escrita Excessiva em Disco (I/O)
- **Problema:** O `DatabaseConnection.execute` chama `this.save()` (que persiste o arquivo `.db` no disco) após **cada operação** de modificação individual que não esteja explicitamente dentro de uma transação.
- **Impacto:** Desgaste desnecessário de I/O e latência em operações de escrita frequentes.

---

## 3. Integridade de Dados

### 3.1 IDs Instáveis para Causas Raízes
- **Problema:** No `RcaService.migrateRcaData`, IDs de causas raízes são gerados via `RC-${Date.now()}`.
- **Impacto:** Se o método de migração for chamado em lote ou múltiplas vezes no mesmo registro, os IDs podem mudar ou colidir, quebrando o rastreamento histórico e vínculos futuros.

### 3.2 Fragilidade no Parse de JSON
- **Problema:** O repositório (`mapRowToRca`) executa `JSON.parse(row.participants || '[]')` sem proteção de `try-catch`.
- **Impacto:** Se uma única linha do banco estiver corrompida (ex: por uma queda de energia durante o `save()` ou erro de importação), o sistema inteiro para de listar todas as RCAs (Crash de rota).

---

## 4. Segurança e Robustez

### 4.1 Tipagem "Any" na Camada de Serviço
- **Problema:** O `RcaController` recebe dados validados pelo Zod, mas os passa para o serviço como `any` ou faz cast forçado.
- **Risco:** Perda de segurança de tipo em tempo de desenvolvimento, facilitando a introdução de campos nulos em locais onde a lógica de negócio não espera.

### 4.2 Limite de Payload Elevado
- **Observação:** `app.use(express.json({ limit: '50mb' }))`.
- **Risco:** Embora necessário para a importação de backups, sem um middleware de "Rate Limiting" ou autenticação, isso expõe o servidor a ataques de negação de serviço (DoS) via envio de payloads massivos.

---

## Sugestões de Melhoria Prioritárias
1.  **Refatoração de Bulk:** Implementar o uso de `stmt.run(params)` dentro de transações com um único `prepare` inicial nos repositórios.
2.  **Desacoplamento de i18n:** Mover a lógica de status para utilizar constantes de ID em vez de strings de nome.
3.  **Paginação O(1):** Adicionar suporte a `LIMIT` e `OFFSET` nas rotas de listagem.
4.  **Sanitização de DB:** Implementar um "SaferJSONParse" para evitar que dados corrompidos derrubem a aplicação.
