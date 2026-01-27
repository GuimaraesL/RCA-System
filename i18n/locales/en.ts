import { TranslationSchema } from "../types";

export const en: TranslationSchema = {
    common: {
        save: "Save",
        cancel: "Cancel",
        delete: "Delete",
        edit: "Edit",
        view: "View",
        loading: "Loading...",
        search: "Search...",
        filter: "Filter",
        clearFilters: "Clear Filters",
        actions: "Actions",
        status: "Status",
        date: "Date",
        confirm: "Confirm",
        tooltips: {
            deleteKey: "Remove this level",
            resize: "Drag to resize",
            viewDetails: "Click to view RCA details"
        }
    },
    filters: {
        searchPlaceholder: "Title, ID, Problem...",
        searchLabel: "Text Search",
        year: "Year",
        month: "Occurrence Month",
        area: "Area",
        equipment: "Equipment",
        subgroup: "Subgroup",
        analysisType: "Analysis Type",
        specialty: "Specialty",
        status: "Current Status",
        globalModeOn: "Global On",
        globalModeOff: "Global Off",
        clear: "Clear",
        noFilters: "No filters applied.",
        totalRecords: "Records",
        monthsList: {
            jan: "Jan", feb: "Feb", mar: "Mar", apr: "Apr", may: "May", jun: "Jun",
            jul: "Jul", aug: "Aug", sep: "Sep", oct: "Oct", nov: "Nov", dec: "Dec"
        },
        sections: {
            location: "Technical Location",
            classification: "Classification & Status"
        },
        options: {
            all: "All",
            allAreas: "All Areas",
            allEquipments: "All Equipments",
            allSubgroups: "All Subgroups",
            allTypes: "All",
            allSpecialties: "All",
            allStatus: "All"
        },
        additionalFiltersHint: "* Additional filters (Failure Mode, Category, Component, 6M) can be activated by clicking directly on the dashboard charts."
    },
    sidebar: {
        dashboard: "Dashboard",
        triggers: "Triggers",
        analyses: "Analyses",
        actions: "Action Plans",
        assets: "Assets",
        docs: "Documentation",
        settings: "Settings",
        migration: "Migration"
    },
    dashboard: {
        title: "Dashboard",
        description: "Consolidated view of failures, costs, and performance.",
        filters: "Filters",
        globalSearch: "Global Search (ID, What, Who...)",
        visualize: "View",
        newAnalysis: "New Analysis",
        myAnalyses: "My Analyses",
        allAnalyses: "All Analyses",
        exportCsv: "Export CSV",
        import: "Import / Migrate",
        kpi: {
            durationMin: "Duration (Min)",
            durationHours: "Duration (Hours)",
            totalCost: "Total Est. Cost",
            totalRcas: "Total RCAs",
            filteredRecords: "Filtered records"
        },
        charts: {
            totalByStatus: "Total by Status",
            totalByType: "Total by Analysis Type",
            topEquipments: "Top Equipment (Pareto)",
            topSubgroups: "Top Subgroups",
            rootCauses6M: "6M Distribution (Root Causes)",
            totalByComponent: "Total by Component",
            failureMode: "Failure Mode",
            failureCategory: "Failure Category",
            noData: "No data"
        },
        tooltips: {
            records: "records",
            clickToFilter: "Click to filter"
        }
    },
    status: {
        inProgress: "In Progress",
        completed: "Completed",
        pending: "Pending",
        waiting: "Waiting",
        canceled: "Canceled",
        delayed: "Delayed"
    },
    analysesPage: {
        title: "Failure Analyses",
        subtitle: "Manage, search, and edit reliability records.",
        newButton: "New Analysis",
        saveButton: "Save Record",
        newTitle: "New Analysis",
        tooltips: {
            deleteRca: "Delete RCA"
        }
    },
    actionsPage: {
        title: "Action Plans",
        subtitle: "Manage corrective actions linked to Root Cause Analyses."
    },
    table: {
        id: "ID",
        date: "Date",
        what: "What (Problem)",
        area: "Area",
        equipment: "Equipment",
        responsible: "Owner",
        progress: "Progress",
        actions: "Actions",
        status: "Status",
        description: "Description",
        type: "Type",
        dueDate: "Due Date",
        impact: "Impact",
        duration: "Duration"
    },
    assets: {
        hierarchy: "Hierarchy",
        name: "Asset Name",
        type: "Asset Type",
        new: "Add New",
        edit: "Edit",
        delete: "Delete",
        addChild: "Add Child",
        rename: "Rename / Edit",
        tooltips: {
            addRootArea: "Add Root Area"
        }
    },
    migration: {
        title: "Data Migration",
        description: "Import, export, and manage system data via JSON or CSV.",
        backup: "Full System Backup (JSON)",
        csvTools: "CSV Tools (Bulk Edit)",
        restore: "Restore Backup",
        selectJson: "Select JSON File",
        importConfig: "Import Configuration",
        cancel: "Cancel",
        initialize: "Initialize Import",
        downloadTemplate: "Download Template",
        exportData: "Export Current Data",
        importCsv: "Import CSV",
        targetEntity: "Target Entity",
        mode: "Mode",
        modes: {
            append: "Append",
            update: "Update",
            replace: "Replace"
        },
        json: {
            dragDrop: "Drag & drop or click to select a JSON snapshot (V17.0 Schema).",
            selectButton: "Select JSON File",
            foundInfo: "Found: {0} RCAs, {1} Actions in backup.",
            changeFile: "Cancel / Change File",
            modeTitle: "1. IMPORT MODE",
            taxonomyTitle: "2. TAXONOMY SELECTION",
            selectAll: "Select All",
            deselectAll: "Deselect All",
            initializeButton: "Initialize Import",
            createBackup: "Create System Backup",
            downloadButton: "Download Full JSON Backup",
            modeDescriptions: {
                append: "Creates copies of records with new IDs. Safest for merging data.",
                update: "Updates matching IDs. Creates new if ID not found.",
                replace: "Deletes ALL existing data before importing. Use for full restore."
            }
        },
        csv: {
            description: "Select an entity type to download templates, export current data, or bulk import.",
            importOptions: "Import Options",
            modeLabel: "Mode:",
            appendLabel: "Addition (Append)",
            updateLabel: "Update (Edit via ID)",
            inheritHierarchy: "Inherit RCA Hierarchy",
            appendHint: "Ignores 'ID' column and creates new entries.",
            updateHint: "Update requires 'ID' column. Triggers without ID will be created as new.",
            inheritHint: "Will overwrite Area/Equipment/Subgroup with RCA values."
        }
    },
    pagination: {
        previous: "Previous",
        next: "Next",
        showing: "Showing",
        to: "to",
        of: "of",
        results: "results"
    },
    settings: {
        title: "System Settings",
        description: "Manage classification lists with unique System IDs.",
        analysisTypes: "Analysis Types",
        analysisStatuses: "Analysis Statuses",
        triggerStatuses: "Trigger Statuses",
        componentTypes: "Component Types",
        specialties: "Specialties",
        failureModes: "Failure Modes",
        failureCategories: "Failure Categories",
        rootCauseMs: "Root Cause Ms (6M)",
        addItemPlaceholder: "Add new item...",
        emptyList: "No items defined.",
        deleteItemTitle: "Delete Item",
        deleteItemMessage: "Are you sure you want to delete \"{0}\"? This action cannot be undone."
    },
    documentation: {
        title: "Technical Documentation",
        subtitle: "Global RCA System • Integrated Version (Context API)",
        sections: {
            architecture: "Data Architecture",
            workflow: "Workflow & Business Rules",
            integrations: "Integrations & Migration"
        }
    },
    modals: {
        confirm: "Confirm",
        cancel: "Cancel",
        delete: "Delete",
        deleteTitle: "Confirm Deletion",
        deleteMessage: "Are you sure you want to delete this item? This action cannot be undone.",
        deleteRcaMessage: "Are you sure you want to delete this RCA? This action cannot be undone.",
        deleteTriggerMessage: "Are you sure you want to delete this Trigger? This action cannot be undone.",
        deleteActionMessage: "Are you sure you want to delete this Action? This action cannot be undone.",
        deleteAssetTitle: "Delete Asset",
        deleteAssetMessage: "Are you sure you want to delete this asset? This will also delete all children.",
        linkRcaTitle: "Link RCA",
        linkRcaMessage: "Select RCA to link to Trigger",
        selectRcaPlaceholder: "Select an RCA..."
    },
    rcaSelector: {
        searchPlaceholder: "Search RCA by ID, Title or OS...",
        resultsFound: "{0} analyses found",
        manyResults: "Many results, please refine your search.",
        noResults: "No analysis found.",
        showingFirst: "Showing first {0} results of {1}.",
        cancel: "Cancel",
        filters: {
            areas: "Areas (All)",
            equipments: "Equipments",
            subgroups: "Subgroups",
            year: "Year",
            month: "Month",
            clear: "Clear Filters"
        }
    },
    actionModal: {
        titleEdit: "Edit Action Plan",
        titleNew: "New Action Plan",
        linkedAnalysis: "Linked Analysis",
        selectRca: "Select RCA...",
        actionDescription: "Action Description",
        responsible: "Responsible",
        dueDate: "Due Date",
        statusBox: "Status (Box)",
        mocNumber: "MOC Number (Optional)",
        save: "Save Action",
        cancel: "Cancel",
        statusOptions: {
            approved: "1 - Approved",
            inProgress: "2 - In Progress",
            completed: "3 - Completed",
            verified: "4 - Effectiveness Verified"
        }
    },
    triggerModal: {
        title: "Edit Trigger Event",
        startDate: "Start Date/Time",
        endDate: "End Date/Time",
        subgroupSelect: "Subgroup / Equipment (Select)",
        selected: "Selected:",
        stopType: "Stop Type",
        stopReason: "Stop Reason",
        analysisType: "Analysis Type",
        responsible: "Responsible",
        status: "Status",
        comments: "Comments",
        selectPlaceholder: "Select...",
        save: "Save Trigger",
        cancel: "Cancel"
    },
    triggersPage: {
        title: "Trigger Management",
        manageDowntime: "Manage downtime events or potential failures requiring RCAs.",
        noTriggers: "No triggers found matching your criteria.",
        newTrigger: "New Trigger",
        linkTrigger: "Link...",
        table: {
            status: "Status",
            typeReason: "Type / Reason",
            rcaLink: "RCA Link",
            actions: "Actions"
        },
        tooltips: {
            openRca: "Click to open RCA",
            createRca: "Create New RCA",
            linkRca: "Link Existing RCA",
            edit: "Edit",
            delete: "Delete"
        },
        buttons: {
            new: "New"
        },
        alerts: {
            startDateRequired: "Start Date is required.",
            triggerSaved: "Trigger saved successfully!"
        }
    },
    wizard: {
        select: "Select...",
        selectType: "Select Type...",
        required: "Required",
        add: "Add",
        remove: "Remove",
        stepNames: {
            step1: { title: "General Data", subtitle: "Basic information" },
            step2: { title: "Problem", subtitle: "5W1H" },
            step3: { title: "Technical Analysis", subtitle: "Impact and failure" },
            step4: { title: "Investigation", subtitle: "5 Whys and Ishikawa" },
            step5: { title: "Actions", subtitle: "Action plan" },
            step6: { title: "Checklist", subtitle: "Maintenance" },
            step7: { title: "Additional Info", subtitle: "Notes and Comments" }
        },
        step1: {
            title: "0. Component / Location",
            refreshAssets: "Refresh Assets",
            assetSelectorLabel: "Asset Selector (Select Subgroup)",
            subgroupRequired: "Please select a required subgroup",
            area: "Area",
            equipment: "Equipment",
            subgroup: "Subgroup",
            componentType: "Component Type (Per list)",
            failureDate: "Failure Date",
            failureTime: "Time",
            osNumber: "OS Number",
            analysisMetadata: "Analysis Metadata",
            analysisType: "Analysis Type",
            facilitator: "Responsible",
            analysisDuration: "Analysis Duration (min)",
            participants: "Participants",
            participantsPlaceholder: "John, Jane, Paul (Separated by comma)",
            startDate: "Start Date",
            completionDate: "Completion Date",
            requiresOperation: "Requires operation in FA?"
        },
        step2: {
            title: "1. Problem Definition (5W1H)",
            subtitle: "Describe the problem using the 5W1H methodology",
            who: "Who",
            whoPlaceholder: "Who detected the problem?",
            when: "When",
            whenPlaceholder: "Detailed date/time of occurrence",
            where: "Where",
            wherePlaceholder: "Area, Equipment, Specific location",
            what: "What - Short Title",
            whatPlaceholder: "Brief description of the failure",
            problemDescription: "Detailed Problem Description",
            problemDescriptionPlaceholder: "Describe the problem in detail, including circumstances and context...",
            potentialImpacts: "Potential Impacts (Operational)",
            potentialImpactsPlaceholder: "Describe the risks: Safety, Environmental, Cost...",
            qualityImpacts: "Quality Impacts",
            qualityImpactsPlaceholder: "Quality deviations, scrap, etc."
        },
        step3: {
            title: "Technical Analysis and Classification",
            subtitle: "Classify the failure for statistical purposes",
            specialty: "Specialty",
            failureMode: "Failure Mode",
            failureCategory: "Failure Category",
            quantitativeData: "Confirmed Quantitative Data",
            downtimeMinutes: "Downtime Duration (minutes)",
            financialImpact: "Financial Impact ($)",
            estimatedImpact: "Estimated Impact:",
            minutesOfDowntime: "minutes of downtime"
        },
        step4: {
            title: "Investigation (5 Whys and Ishikawa)",
            subtitle: "In-depth analysis of problem causes",
            fiveWhysTitle: "5 Whys Matrix",
            advancedMode: "Advanced Mode (Tree)",
            advancedModeDesc: "Map multiple cause-and-effect paths.",
            linearModeDesc: "Simple sequence of questions.",
            switchToAdvanced: "Switch to Tree Mode",
            switchToLinear: "Switch to Linear Mode",
            addWhy: "Add Why",
            ishikawaTitle: "Ishikawa Diagram (6M)",
            ishikawaSubtitle: "Categorize contributing causes",
            addItem: "Add Item",
            rootCausesTitle: "Identified Root Causes",
            rootCausesSubtitle: "Define root causes after analysis",
            addRootCause: "Add Root Cause",
            causeDescription: "Cause Description",
            sixMFactor: "6M Factor",
            ishikawaCategories: {
                method: "Method",
                machine: "Machine",
                manpower: "Manpower",
                material: "Material",
                measurement: "Measurement",
                environment: "Environment"
            }
        },
        step5: {
            header: "Action Plan Development",
            headerDesc: "Develop containment actions (immediate) and corrective actions (long-term) to address root causes.",
            containmentTitle: "Containment Actions (Immediate)",
            containmentAdd: "Add Action",
            containmentEmpty: "No containment actions added. Click \"Add Action\" to start.",
            whatAction: "What (Action)",
            whatPlaceholder: "Describe the immediate action...",
            whoResponsible: "Who (Resp.)",
            whenDate: "When (Date)",
            correctiveTitle: "Corrective Action Plans (CAPA)",
            correctiveAdd: "New Action Plan",
            correctiveEmpty: "No corrective action plans registered.",
            noActions: "No actions found"
        },
        step6: {
            title: "Precision Maintenance Checklist",
            subtitle: "Ensure all standard maintenance criteria are met during the repair.",
            completionStatus: "Completion Status",
            activity: "Activity",
            executed: "Executed",
            notExecuted: "Not Exec.",
            notApplicable: "N/A",
            comment: "Comment",
            addComment: "Add comment..."
        },
        step7: {
            title: "Additional Information",
            subtitle: "Complementary documentation and lessons learned",
            meetingNotes: "Meeting Notes",
            meetingNotesPlaceholder: "Record important points discussed...",
            generalComments: "General Comments",
            generalCommentsPlaceholder: "Other observations...",
            historicalInfo: "Historical Information",
            historicalInfoPlaceholder: "Relevant historical context...",
            lessonsLearned: "8. Lessons Learned",
            lessonsEmpty: "No lessons learned recorded.",
            tip: "💡 Tip:",
            tipText: "Use these sections to document important discussions, lessons learned, and relevant historical context for future analyses."
        },
        stepHRA: {
            title: "Human Reliability Analysis (HRA)",
            subtitle: "Explore losses related to \"Method\" and \"Manpower\" to identify potential human errors.",
            questionnaire: "Questionnaire",
            question: "Question",
            yes: "Yes",
            no: "No",
            comments: "Comments",
            addComment: "Add comment...",
            conclusion: "8. Conclusion (Possible Causes)",
            describeBriefly: "Describe briefly...",
            validation: "7.1 Validation",
            validationQuestion: "Does the machine coordinator validate the analysis performed?",
            coordinatorComments: "Coordinator Comments",
            hraAvailableTitle: "Human Reliability Analysis Available",
            hraAvailableMessage: "One or more root causes have been identified as Method or Manpower. The \"Human Reliability\" tab is now accessible."
        }
    }
};
