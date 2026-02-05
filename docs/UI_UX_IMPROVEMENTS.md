# Proposta de Melhorias UI/UX - RCA System
**Data:** 05 de Fevereiro de 2026  
**Objetivo:** Transformar a interface técnica em uma experiência "Premium" de alta agilidade.

---

## 🎨 1. Identidade Visual e Layout Global (Core Design)

### 1.1 Sistema de Cores e Temas
*   **Contraste de Status:** Padronizar as cores de status em todo o sistema. No momento, o Dashboard usa uma paleta e as tabelas outra. Sugestão:
    *   `Concluída`: Esmeralda (Green-500)
    *   `Em Andamento`: Oceano (Blue-500)
    *   `Atrasada/Aguardando`: Âmbar (Yellow-500) ou Coral (Red-500)
*   **Glassmorphism Suave:** Aplicar um leve efeito de desfoque (`backdrop-blur`) em modais e na barra lateral (Sidebar) para aumentar a percepção de profundidade.

### 1.2 Tipografia e Densidade
*   **Ocultação de UUIDs:** Substituir a exibição de IDs longos (`5ec0f368...`) por IDs de exibição curtos (`#RCA-1024`) ou simplesmente ocultá-los, mantendo o ID real acessível apenas em "Copiar ID" ou tooltips.
*   **Data Density:** Aumentar o espaçamento (padding) nas tabelas principais para evitar a aparência de "planilha Excel", mantendo a virtualização para performance.

---

## 📈 2. View: Dashboard (Centro de Comando)

*   **Gráficos Interativos:** Implementar "Cross-Filtering". Ao clicar em uma fatia do gráfico de "Total por Status", o Dashboard inteiro (e não apenas o filtro de texto) deve se ajustar para mostrar dados daquele status.
*   **Skeletons de Carregamento:** Substituir o texto "Carregando..." por Skeletons que mimetizam o formato dos gráficos e KPIs, reduzindo a percepção de tempo de espera.
*   **KPI Tooltips:** Adicionar explicações rápidas (ex: "Como o custo total é calculado?") ao passar o mouse sobre os cards de métricas.

---

## 🚨 3. View: Gatilhos (Triggers)

*   **Empty State Visual:** Quando a lista de gatilhos estiver vazia, exibir uma ilustração amigável ou um guia rápido de "Como criar seu primeiro gatilho" em vez de apenas uma linha de tabela vazia.
*   **Farol de Prazo (UX):** No "Farol" (círculo colorido), adicionar um contador de dias visível dentro ou ao lado do círculo para que o usuário não precise calcular mentalmente a idade do registro.
*   **Botões de Ação Contextuais:** Em vez de botões genéricos "New" e "Link", usar cores distintas (Verde para novo RCA, Azul para vincular) para facilitar o reconhecimento rápido (Scanability).

---

## 📝 4. View: RCA Editor (O Coração do Sistema)

### 4.1 Navegação (Wizard)
*   **Sticky Footer de Navegação:** Adicionar botões "Próximo Passo" e "Voltar" fixos no rodapé do editor. Atualmente, o usuário precisa rolar até o topo para trocar de aba ou usar o cabeçalho.
*   **Indicador de Progresso:** Marcar com um ícone de "Check" verde as abas que já possuem os campos obrigatórios preenchidos.

### 4.2 Passo 4: Investigação (5 Porquês e Ishikawa)
*   **Visualização Fishbone:** O Diagrama de Ishikawa atual é uma lista vertical. Transformá-lo em uma visualização de "Espinha de Peixe" real para facilitar a análise visual em reuniões de grupo.
*   **Expansão do 5 Whys:** No modo árvore, permitir o arraste (drag-and-drop) de nós e aumentar a largura útil para evitar o truncamento de texto identificado no relatório de bugs.

---

## 🌳 5. View: Ativos (Assets)

*   **Busca na Árvore:** Adicionar uma barra de busca específica para a árvore de ativos que destaque os resultados e expanda automaticamente os pais (Auto-expand).
*   **Ações em Lote:** Permitir mover subconjuntos inteiros entre equipamentos através de uma interface mais intuitiva.
*   **Visual Hierarchy:** Usar ícones mais variados e cores sutis para diferenciar Áreas de Equipamentos no primeiro olhar.

---

## ⚙️ 6. View: Configurações e Migração

*   **Audit Trail visível:** Na tela de configurações, mostrar quem realizou a última alteração em uma categoria da taxonomia.
*   **Feedback de Importação:** Na Migração, adicionar uma barra de progresso real em vez de um spinner infinito para importações de arquivos grandes (ex: CSVs com 10k+ linhas).

---

## 🌍 7. Internacionalização (i18n Premium)

*   **Tradução de Taxonomia:** Permitir que o administrador cadastre o nome dos itens (Status, Modos de Falha) em PT e EN. O sistema deve carregar o valor dinâmico baseado na linguagem do usuário.
*   **Formatação Localizada:**
    *   Datas: `DD/MM/YYYY` para PT e `MM/DD/YYYY` para EN.
    *   Moeda: `R$` vs `$`.
    *   Decimais: `,` vs `.`.

---

## 🚀 8. Performance (Zero Lag Strategy)

*   **Memoização Agressiva:** Utilizar `React.memo` em componentes de linha de tabela e células individuais para garantir que apenas o que mudou seja re-renderizado durante o scroll.
*   **Lazy Modals:** Carregar o código dos modais de edição apenas no momento do clique, reduzindo o bundle inicial da página.
