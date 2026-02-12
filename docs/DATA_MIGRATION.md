# Migração de Dados - RCA System

Este documento detalha o processo de extração e migração de dados legados para o novo RCA System.

## 1. Visão Geral

A migração de dados é realizada através de uma ferramenta externa dedicada, localizada em `Central_de_Comandos`. Esta ferramenta é responsável por ler os templates antigos em Excel e convertê-los para o formato JSON compatível com a nova arquitetura.

## 2. Ferramenta de Extração

- **Localização:** `../Central_de_Comandos/`
- **Script Principal:** `extractor/extractors/migrador_completo.py`
- **Módulo:** "Migração RCA V17"

### 2.1 Funcionalidade

O script `migrador_completo.py` executa as seguintes etapas:
1.  **Leitura:** Acessa planilhas Excel no formato "RCA V17".
2.  **Processamento:** Extrai campos como `Descrição`, `5 Porquês`, `Ishikawa`, `Ações`, etc.
3.  **Conversão:** Mapeia os dados extraídos para a estrutura JSON validada pelo Zod schema do RCA System (V2).
4.  **Exportação:** Gera arquivos `.json` prontos para importação ou carga no banco de dados.

### 2.2 Versionamento de Template
A ferramenta possui lógica para identificar a versão do template Excel utilizado.
- **Versão Alvo:** `v17` (RCA Standard Version 17.0).
- **Mecanismo:**
    - Lê células de controle (ex: `NORM_VERSION`).
    - Registra a versão encontrada no JSON de saída (`systemVersion`).
    - **Validação:** Pode rejeitar ou alertar sobre templates obsoletos (anteriores à v17) que não possuem os campos obrigatórios mapeados.

## 3. Estrutura de Dados (JSON)

O output da migração segue a estrutura esperada pelo endpoint `POST /api/rcas`:

```json
{
  "what": "Falha na Bomba X",
  "why_tree": { ... },
  "ishikawa": { ... },
  "actions": [ ... ],
  "metadata": {
    "source": "legacy_excel_v17",
    "migration_date": "2026-02-12"
  }
}
```

## 4. Estratégia de Rastreamento (ID Injection)

Uma parte crítica da lógica de migração é a garantiade unicidade e rastreabilidade dos arquivos Excel.

### 4.1 Injeção de Metadados
O sistema **modifica o arquivo original** para injetar um identificador único (UUID).
- **Local:** Propriedades Customizadas do Excel (`CustomDocumentProperties`).
- **Chave:** `RCA_TRACKING_ID` (ou similar, definido em `identidade_arquivo.py`).
- **Lógica:**
    1. O script abre o arquivo.
    2. Verifica se a propriedade existe.
    3. Se não, gera um novo UUID, grava no arquivo e salva.
    4. Se sim, usa o ID existente para evitar duplicatas na importação.

> **Importante:** Esta operação requer permissão de **escrita** no arquivo e garante que o mesmo arquivo Excel, se renomeado ou movido, mantenha sua identidade no RCA System.

## 5. Estratégia de Integração e Decisão Arquitetural

### 5.1 Por que Manter Externo?
A ferramenta de migração (`Central_de_Comandos`) reside em um repositório separado e **não deve ser fundida** ao repositório principal do RCA System neste momento.

**Justificativa Técnica:**
1.  **Stack Tecnológico Divergente:** O RCA System é baseado em Node.js/React (Web), enquanto a ferramenta de migração é uma aplicação Desktop Python (`customtkinter`, `pywin32`, `pandas`).
2.  **Dependências de S.O.:** A migração depende fortemente de bibliotecas Windows-only (`pywin32`) para interagir com instâncias Excel abertas e injetar metadados com segurança. Trazer isso para o repo principal quebraria a portabilidade (ex: deploy em Linux/Docker).
3.  **Ciclo de Vida:** A migração é um processo *ad-hoc* ou de *batch* executado por administradores, não uma funcionalidade "live" do servidor web.

### 5.2 Contrato de Interface
A integração é garantida pelo **Contrato de Dados (JSON Schema)**.
- A `Central_de_Comandos` atua como **Produtor**.
- O `RCA System` atua como **Consumidor**.
- Qualquer mudança na API do RCA System (ex: novos campos obrigatórios) deve ser versionada e comunicada para atualização do script Python.

## 6. Limitações e Integridade dos Dados

### 6.1 Desconexão SharePoint vs. Excel
Existe um risco inerente de dados desatualizados durante a migração, especificamente nos **Planos de Ação**.
- **Cenário:** As ações nascem no Excel (RCA), mas sua gestão e status atualizado residem frequentemente no SharePoint. Não há link sistêmico entre eles.
- **Risco:** Se o template Excel não for retroalimentado com o status do SharePoint, o RCA System importará ações com status "Pendente" ou desatualizado.

### 6.2 Pré-requisito Operacional
A qualidade da migração depende inteiramente do esforço das **Manufaturas** em preparar os dados:
- **Atualização Manual:** É mandatório que os donos das RCAs garantam que os templates Excel reflitam o último status real (especialmente conclusões de ações) *antes* de rodar a extração.
- **Análises Incompletas:** Templates preenchidos parcialmente resultarão em registros incompletos no sistema, pois a ferramenta de migração não "inventa" dados faltantes.

## 7. Procedimento de Uso

Para executar a migração:

1.  Navegue até o diretório `Central_de_Comandos`.
2.  Certifique-se de que o ambiente Python está configurado (`pip install -r requirements.txt`).
3.  Execute a interface principal:
    ```bash
    python main.py
    ```
4.  Selecione a aba **Análise de Falha**.
5.  Escolha a opção **Migração RCA V17**.
6.  Selecione a pasta contendo as planilhas Excel.
7.  O sistema gerará os arquivos JSON na pasta de saída configurada.

---

> **Nota de Manutenção:** A lógica de extração reside em um repositório separado (`Central_de_Comandos`). Alterações no schema do RCA System exigem atualização correspondente no `migrador_completo.py`.
