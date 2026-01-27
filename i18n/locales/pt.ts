import { TranslationSchema } from "../types";

export const pt: TranslationSchema = {
    common: {
        save: "Salvar",
        cancel: "Cancelar",
        delete: "Excluir",
        edit: "Editar",
        view: "Visualizar",
        loading: "Carregando...",
        search: "Buscar...",
        filter: "Filtrar",
        clearFilters: "Limpar Filtros",
        actions: "Ações",
        status: "Status",
        date: "Data",
        confirm: "Confirmar",
        tooltips: {
            deleteKey: "Remover este nível",
            resize: "Arraste para redimensionar",
            viewDetails: "Clique para ver detalhes da RCA"
        }
    },
    filters: {
        searchPlaceholder: "Título, ID, Problema...",
        searchLabel: "Busca Textual",
        year: "Ano",
        month: "Mês de Ocorrência",
        area: "Área",
        equipment: "Equipamento",
        subgroup: "Subgrupo",
        analysisType: "Tipo de Análise",
        specialty: "Especialidade",
        status: "Status Atual",
        globalModeOn: "Global On",
        globalModeOff: "Global Off",
        clear: "Limpar",
        noFilters: "Nenhum filtro aplicado.",
        totalRecords: "Registros",
        monthsList: {
            jan: "Jan", feb: "Fev", mar: "Mar", apr: "Abr", may: "Mai", jun: "Jun",
            jul: "Jul", aug: "Ago", sep: "Set", oct: "Out", nov: "Nov", dec: "Dez"
        },
        sections: {
            location: "Localização Técnica",
            classification: "Classificação e Status"
        },
        options: {
            all: "Todos",
            allAreas: "Todas as Áreas",
            allEquipments: "Todos os Equipamentos",
            allSubgroups: "Todos os Subgrupos",
            allTypes: "Todos",
            allSpecialties: "Todas",
            allStatus: "Todos"
        },
        additionalFiltersHint: "* Filtros adicionais (Modo de Falha, Categoria, Componente, 6M) podem ser ativados clicando diretamente nos gráficos do painel."
    },
    sidebar: {
        dashboard: "Dashboard",
        triggers: "Gatilhos",
        analyses: "Análises",
        actions: "Planos de Ação",
        assets: "Ativos",
        docs: "Documentação",
        settings: "Configurações",
        migration: "Migração"
    },
    dashboard: {
        title: "Painel de Controle",
        description: "Visão consolidada de falhas, custos e performance.",
        filters: "Filtros",
        globalSearch: "Busca Global (ID, O que, Quem...)",
        visualize: "Visualizar",
        newAnalysis: "Nova Análise",
        myAnalyses: "Minhas Análises",
        allAnalyses: "Todas as Análises",
        exportCsv: "Exportar CSV",
        import: "Importar / Migrar",
        kpi: {
            durationMin: "Duração (Min)",
            durationHours: "Duração (Horas)",
            totalCost: "Custo Total Est.",
            totalRcas: "Total RCAs",
            filteredRecords: "Registros filtrados"
        },
        charts: {
            totalByStatus: "Total por Status",
            totalByType: "Total por Tipo de Análise",
            topEquipments: "Top Equipamentos (Pareto)",
            topSubgroups: "Top Subgrupos",
            rootCauses6M: "Distribuição 6M (Causas Raízes)",
            totalByComponent: "Total por Componente",
            failureMode: "Modo de Falha",
            failureCategory: "Categoria da Falha",
            noData: "Sem dados"
        },
        tooltips: {
            records: "registros",
            clickToFilter: "Clique para filtrar"
        }
    },
    status: {
        inProgress: "Em Andamento",
        completed: "Concluída",
        pending: "Pendente",
        waiting: "Aguardando",
        canceled: "Cancelada",
        delayed: "Atrasada"
    },
    analysesPage: {
        title: "Análise de Falhas",
        subtitle: "Gerencie, pesquise e edite registros de confiabilidade.",
        newButton: "Nova Análise",
        saveButton: "Salvar Registro",
        newTitle: "Nova Análise",
        tooltips: {
            deleteRca: "Excluir RCA"
        }
    },
    actionsPage: {
        title: "Planos de Ação",
        subtitle: "Gerencie ações corretivas vinculadas a Análises de Causa Raiz."
    },
    table: {
        id: "ID",
        date: "Data",
        what: "O que (Problema)",
        area: "Área",
        equipment: "Equipamento",
        responsible: "Responsável",
        progress: "Progresso",
        actions: "Ações",
        status: "Status",
        description: "Descrição",
        type: "Tipo",
        dueDate: "Prazo",
        impact: "Impacto",
        duration: "Duração"
    },
    assets: {
        hierarchy: "Hierarquia",
        name: "Nome do Ativo",
        type: "Tipo do Ativo",
        new: "Adicionar Novo",
        edit: "Editar",
        delete: "Excluir",
        addChild: "Adicionar Filho",
        rename: "Renomear / Editar",
        tooltips: {
            addRootArea: "Adicionar Área Raiz"
        }
    },
    migration: {
        title: "Migração de Dados",
        description: "Importar, exportar e gerenciar dados do sistema via JSON ou CSV.",
        backup: "Backup Completo (JSON)",
        csvTools: "Ferramentas CSV (Edição em Massa)",
        restore: "Restaurar Backup",
        selectJson: "Selecionar Arquivo JSON",
        importConfig: "Configuração de Importação",
        cancel: "Cancelar",
        initialize: "Iniciar Importação",
        downloadTemplate: "Baixar Modelo",
        exportData: "Exportar Dados Atuais",
        importCsv: "Importar CSV",
        targetEntity: "Entidade Alvo",
        mode: "Modo",
        modes: {
            append: "Adicionar (Append)",
            update: "Atualizar (Update)",
            replace: "Substituir (Replace)"
        },
        json: {
            dragDrop: "Arraste e solte ou clique para selecionar um backup JSON (Schema V17.0).",
            selectButton: "Selecionar Arquivo JSON",
            foundInfo: "Encontrados: {0} RCAs, {1} Ações no backup.",
            changeFile: "Cancelar / Trocar Arquivo",
            modeTitle: "1. MODO DE IMPORTAÇÃO",
            taxonomyTitle: "2. SELEÇÃO DE TAXONOMIA",
            selectAll: "Selecionar Tudo",
            deselectAll: "Desmarcar Tudo",
            initializeButton: "Iniciar Importação",
            createBackup: "Criar Backup do Sistema",
            downloadButton: "Baixar Backup Completo (JSON)",
            modeDescriptions: {
                append: "Cria cópias dos registros com novos IDs. Mais seguro para mesclar dados.",
                update: "Atualiza IDs correspondentes. Cria novo se o ID não for encontrado.",
                replace: "Exclui TODOS os dados existentes antes de importar. Use para restauração completa."
            }
        },
        csv: {
            description: "Selecione um tipo de entidade para baixar templates, exportar dados atuais ou importar em massa.",
            importOptions: "Opções de Importação",
            modeLabel: "Modo:",
            appendLabel: "Adição (Append)",
            updateLabel: "Atualização (via ID)",
            inheritHierarchy: "Herdar Hierarquia RCA",
            appendHint: "Ignora a coluna 'ID' e cria novas entradas.",
            updateHint: "Atualização requer coluna 'ID'. Gatilhos sem ID serão criados como novos.",
            inheritHint: "Sobrescreverá Área/Equipamento/Subgrupo com os valores da RCA."
        }
    },
    pagination: {
        previous: "Anterior",
        next: "Próxima",
        showing: "Mostrando",
        to: "a",
        of: "de",
        results: "resultados"
    },
    settings: {
        title: "Configurações do Sistema",
        description: "Gerencie listas de classificação com IDs de Sistema únicos.",
        analysisTypes: "Tipos de Análise",
        analysisStatuses: "Status de Análise",
        triggerStatuses: "Status de Gatilho",
        componentTypes: "Tipos de Componente",
        specialties: "Especialidades",
        failureModes: "Modos de Falha",
        failureCategories: "Categorias de Falha",
        rootCauseMs: "6M (Causas Raízes)",
        addItemPlaceholder: "Adicionar novo item...",
        emptyList: "Nenhum item definido.",
        deleteItemTitle: "Excluir Item",
        deleteItemMessage: "Você tem certeza que deseja excluir \"{0}\"? Esta ação não pode ser desfeita."
    },
    documentation: {
        title: "Documentação Técnica",
        subtitle: "Sistema Global RCA • Versão Integrada (Context API)",
        sections: {
            architecture: "Arquitetura de Dados",
            workflow: "Workflow e Regras de Negócio",
            integrations: "Integrações e Migração"
        }
    },
    modals: {
        confirm: "Confirmar",
        cancel: "Cancelar",
        delete: "Excluir",
        deleteTitle: "Confirmar Exclusão",
        deleteMessage: "Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.",
        deleteRcaMessage: "Tem certeza que deseja excluir esta análise RCA? Esta ação não pode ser desfeita.",
        deleteTriggerMessage: "Tem certeza que deseja excluir este gatilho? Esta ação não pode ser desfeita.",
        deleteActionMessage: "Tem certeza que deseja excluir esta ação? Esta ação não pode ser desfeita.",
        deleteAssetTitle: "Excluir Ativo",
        deleteAssetMessage: "Tem certeza que deseja excluir este ativo? Isso também excluirá todos os filhos.",
        linkRcaTitle: "Vincular RCA",
        linkRcaMessage: "Selecione a RCA para vincular ao Gatilho",
        selectRcaPlaceholder: "Selecione uma RCA..."
    },
    rcaSelector: {
        searchPlaceholder: "Buscar RCA por ID, Título ou OS...",
        resultsFound: "{0} análises encontradas",
        manyResults: "Muitos resultados, refine sua busca.",
        noResults: "Nenhuma análise encontrada.",
        showingFirst: "Mostrando os primeiros {0} resultados de {1}.",
        cancel: "Cancelar",
        filters: {
            areas: "Áreas (Todas)",
            equipments: "Equipamentos",
            subgroups: "Subconjuntos",
            year: "Ano",
            month: "Mês",
            clear: "Limpar Filtros"
        }
    },
    actionModal: {
        titleEdit: "Editar Plano de Ação",
        titleNew: "Novo Plano de Ação",
        linkedAnalysis: "Análise Vinculada",
        selectRca: "Selecionar RCA...",
        actionDescription: "Descrição da Ação",
        responsible: "Responsável",
        dueDate: "Data Prazo",
        statusBox: "Status (Box)",
        mocNumber: "Número MOC (Opcional)",
        save: "Salvar Ação",
        cancel: "Cancelar",
        statusOptions: {
            approved: "1 - Aprovado",
            inProgress: "2 - Em Andamento",
            completed: "3 - Concluído",
            verified: "4 - Ef. Comprovada"
        }
    },
    triggerModal: {
        title: "Editar Evento Gatilho",
        startDate: "Data/Hora Início",
        endDate: "Data/Hora Fim",
        subgroupSelect: "Subconjunto / Equipamento (Select)",
        selected: "Selecionado:",
        stopType: "Tipo Parada",
        stopReason: "Razão Parada",
        analysisType: "Tipo AF",
        responsible: "Responsável",
        status: "Status",
        comments: "Comentários",
        selectPlaceholder: "Selecionar...",
        save: "Salvar Gatilho",
        cancel: "Cancelar"
    },
    triggersPage: {
        title: "Gerenciamento de Gatilhos",
        manageDowntime: "Gerencie eventos de parada ou falhas potenciais que requerem RCAs.",
        noTriggers: "Nenhum gatilho encontrado com os critérios atuais.",
        newTrigger: "Novo Gatilho",
        linkTrigger: "Vincular...",
        table: {
            status: "Farol",
            typeReason: "Tipo / Razão",
            rcaLink: "RCA Link",
            actions: "Ações"
        },
        tooltips: {
            openRca: "Clique para abrir a RCA",
            createRca: "Criar Nova RCA",
            linkRca: "Vincular RCA Existente",
            edit: "Editar",
            delete: "Excluir"
        },
        buttons: {
            new: "Novo" // Used in table action
        },
        alerts: {
            startDateRequired: "A Data de Início é obrigatória.",
            triggerSaved: "Gatilho salvo com sucesso!"
        }
    },
    wizard: {
        select: "Selecionar...",
        selectType: "Selecionar Tipo...",
        required: "Obrigatório",
        add: "Adicionar",
        remove: "Remover",
        stepNames: {
            step1: { title: "Dados Gerais", subtitle: "Informações básicas" },
            step2: { title: "Problema", subtitle: "5W1H" },
            step3: { title: "Análise Técnica", subtitle: "Impacto e falha" },
            step4: { title: "Investigação", subtitle: "5 Porquês e Ishikawa" },
            step5: { title: "Ações", subtitle: "Plano de ação" },
            step6: { title: "Checklist", subtitle: "Manutenção" },
            step7: { title: "Info. Adicionais", subtitle: "Notas e Comentários" }
        },
        step1: {
            title: "0. Componente / Localização",
            refreshAssets: "Atualizar Ativos",
            assetSelectorLabel: "Seletor de Ativos (Selecione Subgrupo)",
            subgroupRequired: "Selecione um subgrupo obrigatório",
            area: "Área",
            equipment: "Equipamento",
            subgroup: "Subgrupo",
            componentType: "Tipo de Componente (Conforme lista)",
            failureDate: "Data da Falha",
            failureTime: "Hora",
            osNumber: "Número OS",
            analysisMetadata: "Metadados da Análise",
            analysisType: "Tipo de Análise",
            facilitator: "Responsável",
            analysisDuration: "Duração da Análise (min)",
            participants: "Participantes",
            participantsPlaceholder: "Ademir, Lucas, Paulo (Separados por vírgula)",
            startDate: "Data Início",
            completionDate: "Data Conclusão",
            requiresOperation: "Necessário operação na AF?"
        },
        step2: {
            title: "1. Definição do Problema (5W1H)",
            subtitle: "Descreva o problema utilizando a metodologia 5W1H",
            who: "Quem",
            whoPlaceholder: "Quem detectou o problema?",
            when: "Quando",
            whenPlaceholder: "Data/Hora da ocorrência detalhada",
            where: "Onde",
            wherePlaceholder: "Área, Equipamento, Local específico",
            what: "O Que - Título Curto",
            whatPlaceholder: "Descrição sucinta da falha",
            problemDescription: "Descrição Detalhada do Problema",
            problemDescriptionPlaceholder: "Descreva detalhadamente o problema, incluindo circunstâncias e contexto...",
            potentialImpacts: "Impactos Potenciais (Operacionais)",
            potentialImpactsPlaceholder: "Descreva os riscos: Segurança, Ambiental, Custo...",
            qualityImpacts: "Impactos para a Qualidade",
            qualityImpactsPlaceholder: "Desvios de qualidade, refugos, etc."
        },
        step3: {
            title: "Análise Técnica e Classificação",
            subtitle: "Classifique a falha para fins estatísticos",
            specialty: "Especialidade",
            failureMode: "Modo de Falha",
            failureCategory: "Categoria da Falha",
            quantitativeData: "Dados Quantitativos Confirmados",
            downtimeMinutes: "Duração da Parada (minutos)",
            financialImpact: "Impacto Financeiro (R$)",
            estimatedImpact: "Impacto Estimado:",
            minutesOfDowntime: "minutos de parada"
        },
        step4: {
            title: "Investigação (5 Porquês e Ishikawa)",
            subtitle: "Análise profunda das causas do problema",
            fiveWhysTitle: "Matriz dos 5 Porquês",
            advancedMode: "Modo Avançado (Árvore)",
            advancedModeDesc: "Mapeie múltiplos caminhos de causa e efeito.",
            linearModeDesc: "Sequência simples de perguntas.",
            switchToAdvanced: "Mudar para Modo Árvore",
            switchToLinear: "Mudar para Modo Linear",
            addWhy: "Adicionar Porquê",
            ishikawaTitle: "Diagrama de Ishikawa (6M)",
            ishikawaSubtitle: "Categorize as causas contribuintes",
            addItem: "Adicionar Item",
            rootCausesTitle: "Causas Raiz Identificadas",
            rootCausesSubtitle: "Defina as causas raiz após análise",
            addRootCause: "Adicionar Causa Raiz",
            causeDescription: "Descrição da Causa",
            sixMFactor: "Fator 6M",
            ishikawaCategories: {
                method: "Método",
                machine: "Máquina",
                manpower: "Mão de Obra",
                material: "Material",
                measurement: "Medida",
                environment: "Meio Ambiente"
            }
        },
        step5: {
            header: "Desenvolvimento do Plano de Ação",
            headerDesc: "Desenvolva ações de contenção (imediatas) e corretivas (longo prazo) para tratar as causas raiz.",
            containmentTitle: "Ações de Contenção (Imediatas)",
            containmentAdd: "Adicionar Ação",
            containmentEmpty: "Nenhuma ação de contenção adicionada. Clique em \"Adicionar Ação\" para começar.",
            whatAction: "O Que (Ação)",
            whatPlaceholder: "Descreva a ação imediata...",
            whoResponsible: "Quem (Resp.)",
            whenDate: "Quando (Data)",
            correctiveTitle: "Planos de Ação Corretiva (CAPA)",
            correctiveAdd: "Novo Plano de Ação",
            correctiveEmpty: "Nenhum plano de ação corretiva cadastrado.",
            noActions: "Nenhuma ação encontrada"
        },
        step6: {
            title: "Checklist de Manutenção de Precisão",
            subtitle: "Certifique-se de que todos os critérios padrão de manutenção foram atendidos durante o reparo.",
            completionStatus: "Status de Conclusão",
            activity: "Atividade",
            executed: "Executado",
            notExecuted: "Não Exec.",
            notApplicable: "N/A",
            comment: "Comentário",
            addComment: "Adicionar comentário..."
        },
        step7: {
            title: "Informações Adicionais",
            subtitle: "Documentação complementar e lições aprendidas",
            meetingNotes: "Notas de Reunião",
            meetingNotesPlaceholder: "Registre pontos importantes discutidos...",
            generalComments: "Comentários Gerais",
            generalCommentsPlaceholder: "Outras observações...",
            historicalInfo: "Informações Históricas",
            historicalInfoPlaceholder: "Contexto histórico relevante...",
            lessonsLearned: "8. Lições Aprendidas",
            lessonsEmpty: "Nenhuma lição aprendida registrada.",
            tip: "💡 Dica:",
            tipText: "Use estas seções para documentar discussões importantes, lições aprendidas e contexto histórico relevante para futuras análises."
        },
        stepHRA: {
            title: "Análise de Confiabilidade Humana (HRA)",
            subtitle: "Explore perdas relacionadas a \"Método\" e \"Mão de Obra\" para identificar potenciais erros humanos.",
            questionnaire: "Questionário",
            question: "Pergunta",
            yes: "Sim",
            no: "Não",
            comments: "Comentários",
            addComment: "Adicionar comentário...",
            conclusion: "8. Conclusão (Causas Possíveis)",
            describeBriefly: "Descreva brevemente...",
            validation: "7.1 Validação",
            validationQuestion: "O coordenador da máquina valida a análise realizada?",
            coordinatorComments: "Comentários do Coordenador",
            hraAvailableTitle: "Análise de Confiabilidade Humana Disponível",
            hraAvailableMessage: "Uma ou mais causas raízes foram identificadas como Método ou Mão de Obra. A aba \"Human Reliability\" está agora acessível."
        }
    }
};
