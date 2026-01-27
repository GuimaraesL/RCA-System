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
        tooltips: {
            deleteKey: string;
            resize: string;
            viewDetails: string;
        };
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
        tooltips: {
            records: string;
            clickToFilter: string;
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
    analysesPage: {
        title: string;
        subtitle: string;
        newButton: string;
        saveButton: string;
        newTitle: string;
        tooltips: {
            deleteRca: string;
        };
    };
    actionsPage: {
        title: string;
        subtitle: string;
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
        tooltips: {
            addRootArea: string;
        };
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
    rcaSelector: {
        searchPlaceholder: string;
        resultsFound: string;
        manyResults: string;
        noResults: string;
        showingFirst: string;
        cancel: string;
        filters: {
            areas: string;
            equipments: string;
            subgroups: string;
            year: string;
            month: string;
            clear: string;
        };
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
    triggersPage: {
        title: string;
        manageDowntime: string;
        noTriggers: string;
        newTrigger: string;
        linkTrigger: string;
        table: {
            status: string;
            typeReason: string;
            rcaLink: string;
            actions: string;
        };
        tooltips: {
            openRca: string;
            createRca: string;
            linkRca: string;
            edit: string;
            delete: string;
        };
        buttons: { // new was handled by newTrigger in main page, but table has "New"
            new: string;
        };
        alerts: {
            startDateRequired: string;
            triggerSaved: string;
        };
    };
    wizard: {
        // Common
        select: string;
        selectType: string;
        required: string;
        add: string;
        remove: string;
        // Step names for navigation
        stepNames: {
            step1: { title: string; subtitle: string; };
            step2: { title: string; subtitle: string; };
            step3: { title: string; subtitle: string; };
            step4: { title: string; subtitle: string; };
            step5: { title: string; subtitle: string; };
            step6: { title: string; subtitle: string; };
            step7: { title: string; subtitle: string; };
        };
        // Step 0/1 - General
        step1: {
            title: string;
            refreshAssets: string;
            assetSelectorLabel: string;
            subgroupRequired: string;
            area: string;
            equipment: string;
            subgroup: string;
            componentType: string;
            failureDate: string;
            failureTime: string;
            osNumber: string;
            analysisMetadata: string;
            analysisType: string;
            facilitator: string;
            analysisDuration: string;
            participants: string;
            participantsPlaceholder: string;
            startDate: string;
            completionDate: string;
            requiresOperation: string;
        };
        // Step 2 - Problem
        step2: {
            title: string;
            subtitle: string;
            who: string;
            whoPlaceholder: string;
            when: string;
            whenPlaceholder: string;
            where: string;
            wherePlaceholder: string;
            what: string;
            whatPlaceholder: string;
            problemDescription: string;
            problemDescriptionPlaceholder: string;
            potentialImpacts: string;
            potentialImpactsPlaceholder: string;
            qualityImpacts: string;
            qualityImpactsPlaceholder: string;
        };
        // Step 3 - Technical
        step3: {
            title: string;
            subtitle: string;
            specialty: string;
            failureMode: string;
            failureCategory: string;
            quantitativeData: string;
            downtimeMinutes: string;
            financialImpact: string;
            estimatedImpact: string;
            minutesOfDowntime: string;
        };
        // Step 4 - Investigation
        step4: {
            title: string;
            subtitle: string;
            fiveWhysTitle: string;
            advancedMode: string;
            advancedModeDesc: string;
            linearModeDesc: string;
            switchToAdvanced: string;
            switchToLinear: string;
            addWhy: string;
            ishikawaTitle: string;
            ishikawaSubtitle: string;
            addItem: string;
            rootCausesTitle: string;
            rootCausesSubtitle: string;
            addRootCause: string;
            causeDescription: string;
            sixMFactor: string;
            ishikawaCategories: {
                method: string;
                machine: string;
                manpower: string;
                material: string;
                measurement: string;
                environment: string;
            };
        };
        // Step 5 - Actions
        step5: {
            header: string;
            headerDesc: string;
            containmentTitle: string;
            containmentAdd: string;
            containmentEmpty: string;
            whatAction: string;
            whatPlaceholder: string;
            whoResponsible: string;
            whenDate: string;
            correctiveTitle: string;
            correctiveAdd: string;
            correctiveEmpty: string;
            noActions: string;
        };
        // Step 6 - Checklist
        step6: {
            title: string;
            subtitle: string;
            completionStatus: string;
            activity: string;
            executed: string;
            notExecuted: string;
            notApplicable: string;
            comment: string;
            addComment: string;
        };
        // Step 7 - Additional
        step7: {
            title: string;
            subtitle: string;
            meetingNotes: string;
            meetingNotesPlaceholder: string;
            generalComments: string;
            generalCommentsPlaceholder: string;
            historicalInfo: string;
            historicalInfoPlaceholder: string;
            lessonsLearned: string;
            lessonsEmpty: string;
            tip: string;
            tipText: string;
        };
        // Step HRA - Human Reliability Analysis
        stepHRA: {
            title: string;
            subtitle: string;
            questionnaire: string;
            question: string;
            yes: string;
            no: string;
            comments: string;
            addComment: string;
            conclusion: string;
            describeBriefly: string;
            validation: string;
            validationQuestion: string;
            coordinatorComments: string;
            hraAvailableTitle: string;
            hraAvailableMessage: string;
        };
    };
}
