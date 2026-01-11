export interface TranslationSchema {
    common: {
        save: string;
        cancel: string;
        delete: string;
        edit: string;
        view: string;
        loading: string;
        search: string;
        filter: string;
        clearFilters: string;
        actions: string;
        status: string;
        date: string;
        confirm: string;
    };
    filters: {
        searchPlaceholder: string;
        searchLabel: string;
        year: string;
        month: string;
        area: string;
        equipment: string;
        subgroup: string;
        analysisType: string;
        specialty: string;
        status: string;
        globalModeOn: string;
        globalModeOff: string;
        clear: string;
        noFilters: string;
        totalRecords: string;
        monthsList: {
            jan: string; feb: string; mar: string; apr: string; may: string; jun: string;
            jul: string; aug: string; sep: string; oct: string; nov: string; dec: string;
        };
        sections: {
            location: string;
            classification: string;
        };
        options: {
            all: string;
            allAreas: string;
            allEquipments: string;
            allSubgroups: string;
            allTypes: string;
            allSpecialties: string;
            allStatus: string;
        };
        additionalFiltersHint: string;
    };
    sidebar: {
        dashboard: string;
        triggers: string;
        analyses: string;
        actions: string;
        assets: string;
        docs: string;
        settings: string;
        migration: string;
    };
    dashboard: {
        title: string;
        description: string;
        filters: string;
        globalSearch: string;
        visualize: string;
        newAnalysis: string;
        myAnalyses: string;
        allAnalyses: string;
        exportCsv: string;
        import: string;
        kpi: {
            durationMin: string;
            durationHours: string;
            totalCost: string;
            totalRcas: string;
            filteredRecords: string;
        };
        charts: {
            totalByStatus: string;
            totalByType: string;
            topEquipments: string;
            topSubgroups: string;
            rootCauses6M: string;
            totalByComponent: string;
            failureMode: string;
            failureCategory: string;
            noData: string;
        };
    };
    status: {
        inProgress: string;
        completed: string;
        pending: string;
        waiting: string;
        canceled: string;
        delayed: string;
    };
    table: {
        id: string;
        date: string;
        what: string;
        area: string;
        equipment: string;
        responsible: string;
        progress: string;
        actions: string;
        status: string;
        description: string;
        type: string;
        dueDate: string;
        impact: string;
        duration: string;
    },
    assets: {
        hierarchy: string;
        name: string;
        type: string;
        new: string;
        edit: string;
        delete: string;
        addChild: string;
        rename: string;
    },
    migration: {
        title: string;
        description: string;
        backup: string;
        csvTools: string;
        restore: string;
        selectJson: string;
        importConfig: string;
        cancel: string;
        initialize: string;
        downloadTemplate: string;
        exportData: string;
        importCsv: string;
        targetEntity: string;
        mode: string;
        modes: {
            append: string;
            update: string;
            replace: string;
        };
        json: {
            dragDrop: string;
            selectButton: string;
            foundInfo: string;
            changeFile: string;
            modeTitle: string;
            taxonomyTitle: string;
            selectAll: string;
            deselectAll: string;
            initializeButton: string;
            createBackup: string;
            downloadButton: string;
            modeDescriptions: {
                append: string;
                update: string;
                replace: string;
            };
        };
        csv: {
            description: string;
            importOptions: string;
            modeLabel: string;
            appendLabel: string;
            updateLabel: string;
            inheritHierarchy: string;
            appendHint: string;
            updateHint: string;
            inheritHint: string;
        };
    };
    pagination: {
        previous: string;
        next: string;
        showing: string;
        to: string;
        of: string;
        results: string;
    },
    settings: {
        title: string;
        description: string;
        analysisTypes: string;
        analysisStatuses: string;
        triggerStatuses: string;
        componentTypes: string;
        specialties: string;
        failureModes: string;
        failureCategories: string;
        rootCauseMs: string;
        addItemPlaceholder: string;
        emptyList: string;
        deleteItemTitle: string;
        deleteItemMessage: string;
    },
    documentation: {
        title: string;
        subtitle: string;
        sections: {
            architecture: string;
            workflow: string;
            integrations: string;
        }
    },
    modals: {
        confirm: string;
        cancel: string;
        delete: string;
        deleteTitle: string;
        deleteMessage: string;
        deleteRcaMessage: string;
        deleteTriggerMessage: string;
        deleteActionMessage: string;
        deleteAssetTitle: string;
        deleteAssetMessage: string;
        linkRcaTitle: string;
        linkRcaMessage: string;
        selectRcaPlaceholder: string;
    };
    actionModal: {
        titleEdit: string;
        titleNew: string;
        linkedAnalysis: string;
        selectRca: string;
        actionDescription: string;
        responsible: string;
        dueDate: string;
        statusBox: string;
        mocNumber: string;
        save: string;
        cancel: string;
        statusOptions: {
            approved: string;
            inProgress: string;
            completed: string;
            verified: string;
        };
    };
    triggerModal: {
        title: string;
        startDate: string;
        endDate: string;
        subgroupSelect: string;
        selected: string;
        stopType: string;
        stopReason: string;
        analysisType: string;
        responsible: string;
        status: string;
        comments: string;
        selectPlaceholder: string;
        save: string;
        cancel: string;
    };
}
