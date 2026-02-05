# Análise de Responsabilidades do Backend - RCA System

Esta análise foca na identificação de responsabilidades misturadas e acoplamento excessivo no backend do sistema RCA, visando melhorar a manutenibilidade, testabilidade e escalabilidade.

## 1. Problemas Identificados

### 1.1. Acoplamento entre Rotas e Persistência (SQL Direto)
As rotas em \server/src/routes/\ (ex: \cas.ts\, \	riggers.ts\) executam comandos SQL diretamente utilizando a instância do \sql.js\.
- **Risco:** Mudanças no schema do banco de dados exigem alterações em múltiplos arquivos de rota.
- **Responsabilidade Misturada:** A camada de transporte (HTTP/Express) conhece detalhes de implementação da persistência (SQL, nomes de colunas, transações).

### 1.2. Gerenciamento de Transações nas Rotas
Blocos \BEGIN TRANSACTION\ e \COMMIT\ estão sendo chamados dentro das rotas de importação em massa (\ulk\).
- **Risco:** Falhas parciais podem deixar o banco em estado inconsistente se não houver um tratamento de erro robusto que garanta o \ROLLBACK\.
- **Responsabilidade Misturada:** O controle de atomicidade deve pertencer à camada de serviço ou repositório, não à rota.

### 1.3. Lógica de Negócio nas Rotas
Cálculos de status e migrações de dados legados são invocados diretamente no corpo das funções de tratamento de requisições.
- **Exemplo:** A rota \POST /api/rcas\ busca a taxonomia, busca ações, calcula o status e salva o RCA.
- **Responsabilidade Misturada:** A rota deveria apenas orquestrar a chamada para um serviço que executa essas regras.

### 1.4. Duplicação de Helpers de Infraestrutura
Funções utilitárias como \queryToArray\, \
()\ (null helper) e \s()\ (string helper) estão duplicadas em quase todos os arquivos de rota.
- **Risco:** Inconsistência caso uma dessas funções precise de alteração (ex: mudar como nulos são tratados).
- **Responsabilidade Misturada:** Helpers de mapeamento de banco devem estar no módulo de banco de dados ou em utilitários compartilhados.

### 1.5. Sistema de Migração "Ad-hoc"
O arquivo \server/src/db/database.ts\ contém lógica de alteração de schema (\ALTER TABLE\) dentro da função de inicialização.
- **Risco:** Dificuldade em rastrear a evolução do banco e possíveis erros de inicialização se uma migration falhar.
- **Responsabilidade Misturada:** A inicialização da conexão não deve ser responsável por evoluir o schema.

### 1.6. Serialização/Desserialização Manual (JSON)
Campos complexos (JSON) no SQLite estão sendo processados manualmente via \JSON.parse\ e \JSON.stringify\ em múltiplos pontos das rotas.
- **Responsabilidade Misturada:** A conversão entre o modelo de banco e o modelo de domínio (objetos TS) deve ser automatizada ou isolada em uma camada de mapeamento.

## 2. Recomendações de Refatoração

### 2.1. Implementação do Padrão Repository
Criar uma camada de repositório (\server/src/db/repositories/\) para isolar o SQL.
- As rotas passariam a chamar \caRepository.create(data)\ em vez de \db.run("INSERT...")\.

### 2.2. Camada de Serviço de Orquestração
Embora o \caStatusService\ exista, ele é focado apenas em status. Seria ideal ter serviços que orquestram fluxos completos (ex: \RcaService.createRca\) que cuidam da validação, cálculo de status e salvamento em uma única transação.

### 2.3. Módulo de Migrações Dedicado
Mover as lógicas de \ALTER TABLE\ para arquivos de migração numerados e controlados por uma tabela de metadados no banco.

### 2.4. Centralização de Tipos e Interfaces
Mover as interfaces definidas em \caStatusService.ts\ para \server/src/types/\ para que possam ser reutilizadas por rotas e outros serviços sem duplicação.

### 2.5. Data Mapper / Entity Factory
Criar funções que convertam uma linha (row) do banco de dados em um objeto de domínio e vice-versa, centralizando as chamadas de \JSON.parse/stringify\ e os helpers de tratamento de nulos.

## 3. Conclusão
O backend atual possui uma estrutura funcional, mas o "vazamento" de responsabilidades de banco de dados para as rotas torna o código frágil. A separação clara entre **Transporte (Rotas)**, **Negócio (Serviços)** e **Persistência (Repositórios)** é o próximo passo necessário para a maturidade do projeto.
