# Gestão de FMEA (Failure Mode and Effects Analysis)

A gestão de Modos de Falha e Efeitos (FMEA) no RCA System permite que a engenharia de confiabilidade cadastre e mantenha uma base técnica de falhas esperadas para cada equipamento, servindo de base para as sugestões da IA durante uma investigação real.

## 1. Escopo e Localização

A funcionalidade está integrada ao módulo Assets Manager. O cadastro de FMEA é habilitado exclusivamente para o nível de Equipamento na hierarquia de ativos.

## 2. Processo de Cadastro

Existem dois fluxos para alimentar o banco de FMEA:

### 2.1. Cadastro Manual
O usuário preenche um formulário estruturado contendo:
- Modo de Falha: Descrição técnica do que falhou.
- Efeitos Potenciais: Consequências operacionais ou de segurança.
- Causas Potenciais: O que pode levar a essa falha.
- Controles Atuais: Como o sistema é monitorado hoje.
- Ações Recomendadas: Sugestões de mitigação.

### 2.2. Extração via IA (Importação)
Permite processar documentos técnicos brutos (OCR de manuais, laudos em PDF ou texto copiado) para gerar registros automaticamente.
- Motor: Gemini 2.0 Flash.
- Lógica: O sistema identifica as entidades técnicas no texto e sugere os pesos de Severidade, Ocorrência e Detecção.

## 3. Cálculo de RPN (Risk Priority Number)

O sistema utiliza o cálculo padrão de criticidade industrial:
**RPN = Severidade (S) × Ocorrência (O) × Detecção (D)**

Cada fator é pontuado de 1 a 10. O cálculo é realizado de forma determinística no banco de dados através de colunas geradas (Stored Generated Columns), garantindo que o índice de risco esteja sempre sincronizado com as notas individuais.

## 4. Integração com o Copiloto de IA

O Agente de IA utiliza a ferramenta get_asset_fmea_tool para consultar esta tabela durante o chat de análise.
- Se o usuário reportar um sintoma, a IA cruza o relato com os Modos de Falha cadastrados.
- A IA prioriza sugestões baseadas no maior RPN encontrado para o equipamento em questão.

---

## Documentação Relacionada
- [Arquitetura do Agente Unificado](../ai/architecture_unified_agent.md)
- [Modelo de Dados Operacional](../database/MODELO_DADOS.md)
- [Regras de Negócio](./REGRAS_NEGOCIO.md)
