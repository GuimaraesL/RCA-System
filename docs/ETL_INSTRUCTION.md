# Instruções para ETL: Inserção de Caminho de Arquivo (Path)

Este documento orienta como popular o campo `file_path` (Caminho de Rede) via ETL ou Scripts Externos.

## 🎯 Objetivo
Vincular o arquivo físico da análise de falha (PDF, XLS, MSG) ao registro do Trigger (Evento) no sistema.

## 📋 Schema de Dados
O campo alvo é `file_path` na entidade `triggers`.

### Formato JSON
```json
{
  "id": "TRG-2024-001",           // Obrigatório (Chave)
  "file_path": "\\\\srv01\\rede\\manutencao\\analises\\Falha_Motor_123.pdf", // <-- CAMPO ALVO
  ...outros_campos
}
```

## 🚀 Método Recomendado: Bulk Import
Para ETLs que processam múltiplos arquivos, utilize o endpoint de **Bulk Import**. Ele utiliza lógica de `INSERT OR REPLACE`, garantindo que registros existentes sejam atualizados e novos sejam criados.

**Endpoint:** `POST http://localhost:3000/api/triggers/bulk`
**Header:** `Content-Type: application/json`

### Exemplo (Python)
```python
import requests
import json

payload = [
    {
        "id": "TRG-2023-999",
        "file_path": "\\\\servidor\\pasta\\analise_999.pdf"
        // ... outros dados se for criar novo
    },
    {
        "id": "TRG-2023-1000",
        "file_path": "\\\\servidor\\pasta\\analise_1000.pdf"
    }
]

# Nota: O endpoint espera o objeto completo se for um novo registro.
# Se for apenas atualizar o path de um ID existente, garanta que os outros campos 
# obrigatórios não sejam sobrescritos com vazio se o ETL não os tiver.
# (Atualmente o sistema substitui o registro completo no Replace).

try:
    response = requests.post("http://localhost:3000/api/triggers/bulk", json=payload)
    print(response.json())
except Exception as e:
    print(f"Erro: {e}")
```

## ⚠️ Pontos de Atenção

1.  **Formatos de Path:**
    - Windows Network Paths: Use barras duplas invertidas (`\\\\server\\share`) em JSON strings.
    - URLs: `http://sharepoint/...` são aceitos.

2.  **Validar IDs:**
    - O sistema usa o `id` como chave primária. Se o ETL gerar IDs, garanta unicidade.
    - Se o objetivo é atualizar um Trigger já existente no banco, **você deve fornecer o ID exato**.

3.  **Entity Mapping:**
    - Atualmente, o campo `file_path` reside na tabela **Triggers**.
    - Se a análise varrida não tiver um Trigger correspondente, o ETL deve criar um Trigger "Placeholder" (com status 'Em Aberto') ou rejeitar.

---

**Dúvidas?** Consulte o arquivo `types.ts` na raiz do projeto para ver a definição completa de `TriggerRecord`.
