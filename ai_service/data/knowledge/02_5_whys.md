# Técnica dos 5 Porquês

O método dos 5 Porquês é uma técnica iterativa de questionamento de diagnóstico. O seu propósito é aprofundar a investigação das relações de causa e efeito subjacentes a um incidente, repetindo a pergunta "Porquê?" de forma sequencial até chegar à causa raiz.

## Workflow de Execução

1. **Definir o problema:** Redigir uma declaração de anomalia clara, factual e concisa.
2. **Iterar o "Porquê?":** Questionar o motivo imediato pelo qual o problema ocorreu.
3. **Encadear respostas:** Utilizar a resposta da iteração anterior como premissa para o próximo "Porquê?".
4. **Atingir a causa raiz:** Continuar a aprofundar até identificar a falha no processo ou sistema (a norma são 5 iterações, mas pode requerer mais ou menos).
5. **Remediar:** Implementar controlos preventivos na causa raiz isolada, validando se ações similares no passado foram eficazes.

## Exemplo Prático de Execução (Área Fabril)

**Declaração do Problema:** A máquina de laminação parou durante o turno gerando perda de produção.

1. **Por que a máquina parou?**
   * Porque houve um travamento do mancal principal do cilindro.
2. **Por que o mancal travou?**
   * Porque houve um superaquecimento por falta de lubrificação.
3. **Por que houve falta de lubrificação?**
   * Porque a bomba de óleo central parou de enviar o lubrificante.
4. **Por que a bomba parou?**
   * Porque o filtro interno da bomba estava totalmente obstruído por sedimentos.
5. **Por que o filtro estava obstruído?**
   * Porque a vedação do tanque de óleo estava desgastada, permitindo a entrada de resíduos metálicos no sistema.

**Causa Raiz Identificada:** Desgaste excessivo da vedação do tanque de óleo, permitindo contaminação do sistema e colapso da bomba de lubrificação.
