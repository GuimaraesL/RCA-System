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
        confirm: "Confirm"
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
        rename: "Rename / Edit"
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
    }
};
