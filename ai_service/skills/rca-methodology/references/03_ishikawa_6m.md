# Diagrama de Ishikawa (6M)

O Diagrama de Ishikawa (também conhecido como Diagrama de Espinha de Peixe ou Fishbone) é uma ferramenta visual de taxonomia de problemas. Organiza as causas raízes em categorias principais (6M), facilitando a identificação sistemática das origens de um incidente complexo na indústria.

## Taxonomia das Categorias (6M)

1. **Método (Method):** Processos, rotinas de ajuste, procedimentos operacionais padrão (SOPs), sequências de montagem e regras de operação.
2. **Máquina (Machine):** Equipamentos, ativos, motores hidráulicos, rolamentos, ferramentas de medição e sistemas de controle.
3. **Mão de obra (Manpower):** O fator humano. Nível de senioridade, treinamento técnico, fadiga do operador e erros de execução ou montagem.
4. **Material (Material):** Insumos de produção. Materiais vindos de processos anteriores, qualidade do óleo lubrificante, peças de reposição e componentes metálicos.
5. **Medição (Measurement):** Monitoramento e controle. Qualidade dos registros de manutenção, frequência de falhas históricas, calibração de instrumentos e dados de inspeções técnicas periódicas.
6. **Meio ambiente (Environment):** Condições do pavilhão industrial. Temperatura ambiente afetando viscosidade de óleos, vibrações externas, iluminação da área e umidade.

## Exemplo Real (Marca Mecânica em Cilindro de Laminação)

**Problema Central:** Aparecimento de marcas mecânicas repetitivas no cilindro Work Roll.

```mermaid
graph LR
    %% Efeito / Problema Central (A "Cabeca" do Peixe)
    Efeito(((Marca Mecânica no Work Roll)))

    %% Categoria: Maquina (Equipamentos/Ativos)
    subgraph G_Maquina [Máquina]
        M1[Motor hidráulico com base solta]
        M2[Desgaste no acoplamento da rooster tail]
    end
    M1 & M2 --> C_Maquina[Máquina]

    %% Categoria: Metodo (Processos/Ajustes)
    subgraph G_Metodo [Método]
        Met1[Rotina de ajuste de largura não seguida]
        Met2[Frequência de inspeção insuficiente]
    end
    Met1 & Met2 --> C_Metodo[Método]

    %% Categoria: Material (Insumos)
    subgraph G_Material [Material]
        Mat1[Material base com defeito de borda]
        Mat2[Cunha de fixação com dureza inadequada]
    end
    Mat1 & Mat2 --> C_Material[Material]

    %% Categoria: Mao de Obra (Pessoas)
    subgraph G_MaoObra [Mão de Obra]
        MO1[Falha na montagem das fixações]
        MO2[Operador novo sem treinamento em ajuste fino]
    end
    MO1 & MO2 --> C_MaoObra[Mão de Obra]

    %% Categoria: Meio Ambiente (Ambiente Fabril)
    subgraph G_MeioAmbiente [Meio Ambiente]
        MA1[Excesso de pó metálico em suspensão]
        MA2[Vibração excessiva na base da linha]
    end
    MA1 & MA2 --> C_MeioAmbiente[Meio Ambiente]

    %% Categoria: Medida (Metricas/Monitoramento)
    subgraph G_Medida [Medida]
        Med1[Falta de rotina para verificar folga]
        Med2[Desvio de padrão histórico não detectado]
    end
    Med1 & Med2 --> C_Medida[Medida]

    %% Convergencia das "Espinhas" para o "Efeito"
    C_Maquina & C_Metodo & C_Material & C_MaoObra & C_MeioAmbiente & C_Medida ==> Efeito
```
