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
        confirm: "Confirmar"
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
        rename: "Renomear / Editar"
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
    }
};
