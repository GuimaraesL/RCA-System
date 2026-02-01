/**
 * RCA Status Service
 * 
 * Centralizes all business logic for RCA status calculation and validation.
 * This mirrors the EXACT logic previously in frontend's useRcaLogic.ts
 * 
 * @see Issue #20 - Sincronização de Status
 * @see Issue #21 - Retroatividade (Forward-Only strategy)
 * @see Issue #22 - Performance
 */

// Types imported from shared types (we'll use inline types for now to avoid import issues)
interface TaxonomyItem {
    id: string;
    name: string;
    specialty_ids?: string[];
}

interface MandatoryFieldsConfig {
    trigger: { save: string[] };
    rca: { create: string[]; conclude: string[] };
}

interface TaxonomyConfig {
    analysisTypes: TaxonomyItem[];
    analysisStatuses: TaxonomyItem[];
    specialties: TaxonomyItem[];
    failureModes: TaxonomyItem[];
    failureCategories: TaxonomyItem[];
    componentTypes: TaxonomyItem[];
    rootCauseMs: TaxonomyItem[];
    triggerStatuses: TaxonomyItem[];
    mandatoryFields?: MandatoryFieldsConfig;
}

interface ActionRecord {
    id: string;
    rca_id: string;
    action: string;
    responsible: string;
    date: string;
    status: string; // '1' | '2' | '3' | '4' - but accept any string from DB
    moc_number?: string;
}

interface RcaRecord {
    id: string;
    status: string;
    completion_date?: string;
    participants: string[];
    root_causes: any[];
    downtime_minutes: number;
    financial_impact: number;
    [key: string]: any; // Allow dynamic field access
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default mandatory fields for RCA conclusion if not configured in taxonomy
 * MUST match frontend's useRcaLogic.ts exactly
 */
const DEFAULT_CONCLUDE_MANDATORY_FIELDS = [
    'analysis_type', 'what', 'problem_description', 'subgroup_id', 'who', 'when',
    'where_description', 'specialty_id', 'failure_mode_id', 'failure_category_id',
    'component_type', 'participants', 'root_causes', 'downtime_minutes'
];

/**
 * Default mandatory fields for RCA creation (draft)
 */
const DEFAULT_CREATE_MANDATORY_FIELDS = [
    'subgroup_id',   // Required for location
    'failure_date',  // Required for timeline
    'analysis_type', // Required for basic categorization
    'what'           // Title/Identifier
];

/**
 * Status IDs - keep in sync with taxonomy
 */
const STATUS_IDS = {
    IN_PROGRESS: 'STATUS-01',
    WAITING: 'STATUS-WAITING',
    CONCLUDED: 'STATUS-03'
} as const;

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates a single field value based on its type
 * Mirrors frontend logic EXACTLY
 */
function isFieldValid(fieldName: string, value: any): boolean {
    // Array fields (participants, root_causes, five_whys)
    if (['participants', 'root_causes', 'five_whys'].includes(fieldName)) {
        if (Array.isArray(value)) {
            return value.length > 0;
        }
        return false;
    }

    // Object fields (ishikawa) - just check presence
    if (fieldName === 'ishikawa') {
        return value !== null && value !== undefined;
    }

    // Numeric fields - allow 0, reject null/undefined
    if (['downtime_minutes', 'financial_impact'].includes(fieldName)) {
        return value !== undefined && value !== null;
    }

    // String fields - must have non-empty trimmed content
    if (!value) return false;
    if (typeof value === 'string' && value.trim().length === 0) return false;

    return true;
}

/**
 * Validates all mandatory fields for RCA conclusion
 * @returns Object with validation result and list of missing fields
 */
export function validateMandatoryFields(
    rca: RcaRecord,
    taxonomy: TaxonomyConfig
): { valid: boolean; missing: string[] } {
    const mandatoryFieldsList = taxonomy.mandatoryFields?.rca.conclude || DEFAULT_CONCLUDE_MANDATORY_FIELDS;
    const missing: string[] = [];

    for (const field of mandatoryFieldsList) {
        const value = rca[field];
        if (!isFieldValid(field, value)) {
            missing.push(field);
        }
    }

    return {
        valid: missing.length === 0,
        missing
    };
}

/**
 * Validates minimum fields required to save an RCA (draft)
 */
export function validateCreateFields(
    rca: RcaRecord,
    taxonomy: TaxonomyConfig
): { valid: boolean; missing: string[] } {
    const createFieldsList = taxonomy.mandatoryFields?.rca.create || DEFAULT_CREATE_MANDATORY_FIELDS;
    const missing: string[] = [];

    for (const field of createFieldsList) {
        const value = rca[field];
        if (!value || (typeof value === 'string' && value.trim() === '')) {
            missing.push(field);
        }
    }

    return {
        valid: missing.length === 0,
        missing
    };
}

// ============================================================================
// STATUS CALCULATION
// ============================================================================

/**
 * Determines if a status is auto-managed (can be changed by system)
 * Protected statuses like "Cancelled" are NOT touched
 */
function isAutoManagedStatus(status: string, taxonomy: TaxonomyConfig): boolean {
    const doneItem = taxonomy.analysisStatuses.find(s => s.name === 'Concluída');
    const waitingItem = taxonomy.analysisStatuses.find(s => s.id === STATUS_IDS.WAITING);
    const openItem = taxonomy.analysisStatuses.find(s => s.id === STATUS_IDS.IN_PROGRESS);

    const doneStatusId = doneItem?.id || STATUS_IDS.CONCLUDED;
    const waitingStatusId = waitingItem?.id || STATUS_IDS.WAITING;
    const openStatusId = openItem?.id || STATUS_IDS.IN_PROGRESS;

    const autoManagedStatuses: (string | null | undefined)[] = [openStatusId, waitingStatusId, doneStatusId, '', undefined, null];
    return autoManagedStatuses.includes(status);
}

/**
 * Calculates the correct status for an RCA based on:
 * 1. Mandatory fields completion
 * 2. Associated actions and their effectiveness
 * 
 * EXACT MIRROR of useRcaLogic.ts lines 169-272
 */
export function calculateRcaStatus(
    rca: RcaRecord,
    actions: ActionRecord[],
    taxonomy: TaxonomyConfig
): {
    newStatus: string;
    statusChanged: boolean;
    completionDate?: string;
    reason: string;
} {
    // Get Status IDs from taxonomy
    const doneItem = taxonomy.analysisStatuses.find(s => s.name === 'Concluída');
    const waitingItem = taxonomy.analysisStatuses.find(s => s.id === STATUS_IDS.WAITING);
    const openItem = taxonomy.analysisStatuses.find(s => s.id === STATUS_IDS.IN_PROGRESS);

    const doneStatusId = doneItem?.id || STATUS_IDS.CONCLUDED;
    const waitingStatusId = waitingItem?.id || STATUS_IDS.WAITING;
    const openStatusId = openItem?.id || STATUS_IDS.IN_PROGRESS;

    const currentStatus = rca.status;

    // Check if status is protected (not auto-managed)
    if (!isAutoManagedStatus(currentStatus, taxonomy)) {
        return {
            newStatus: currentStatus,
            statusChanged: false,
            reason: `Status "${currentStatus}" is protected and will not be modified`
        };
    }

    // 1. Validate mandatory fields
    const { valid: isMandatoryComplete, missing } = validateMandatoryFields(rca, taxonomy);

    // 2. Analyze actions for this RCA
    const rcaActions = actions.filter(a => a.rca_id === rca.id);
    const hasMainActions = rcaActions.length > 0;

    // Actions with status 3 or 4 are considered "effective"
    const allActionsEffective = hasMainActions && rcaActions.every(
        a => ['3', '4'].includes(String(a.status))
    );

    // 3. Determine new status based on rules
    let newStatus = currentStatus;
    let reason = '';

    if (!isMandatoryComplete) {
        // Rule: Mandatory fields incomplete -> In Progress (downgrade if needed)
        newStatus = openStatusId;
        reason = `Missing mandatory fields: ${missing.join(', ')}`;
    } else {
        // Rule: Mandatory fields complete - check actions
        if (!hasMainActions) {
            // Rule: Complete & No Actions -> Concluded
            newStatus = doneStatusId;
            reason = 'All mandatory fields complete, no actions required';
        } else if (allActionsEffective) {
            // Rule: Complete & All Actions Effective (3/4) -> Concluded
            newStatus = doneStatusId;
            reason = `All mandatory fields complete, all ${rcaActions.length} actions effective`;
        } else {
            // Rule: Complete & Has Pending Actions -> Waiting Verification
            newStatus = waitingStatusId;
            const pendingCount = rcaActions.filter(a => !['3', '4'].includes(String(a.status))).length;
            reason = `Mandatory fields complete, ${pendingCount} action(s) pending verification`;
        }
    }

    // 4. Auto-set completion date if transitioning to Done
    let completionDate: string | undefined;
    if (newStatus === doneStatusId && !rca.completion_date) {
        completionDate = new Date().toISOString().split('T')[0];
    }

    return {
        newStatus,
        statusChanged: newStatus !== currentStatus,
        completionDate,
        reason
    };
}

// ============================================================================
// DATA MIGRATION / NORMALIZATION
// ============================================================================

/**
 * Migrates/normalizes legacy RCA data structures
 * Mirrors useRcaLogic.ts lines 94-148
 */
export function migrateRcaData(rca: any): any {
    const migrated = { ...rca };

    // 1. Ensure root_causes is an array
    if (!migrated.root_causes) {
        migrated.root_causes = [];
        // Handle legacy single root_cause field
        if (migrated.root_cause && migrated.root_cause_m_id) {
            migrated.root_causes.push({
                id: `RC-${Date.now()}`,
                cause: migrated.root_cause,
                root_cause_m_id: migrated.root_cause_m_id
            });
        }
    }

    // 2. Convert string participants to array
    if (typeof migrated.participants === 'string') {
        migrated.participants = migrated.participants
            .split(',')
            .map((p: string) => p.trim())
            .filter((p: string) => p);
    }

    // 3. Ensure participants is at least an empty array
    if (!Array.isArray(migrated.participants)) {
        migrated.participants = [];
    }

    // 4. Normalize precision_maintenance status
    if (migrated.precision_maintenance && Array.isArray(migrated.precision_maintenance)) {
        migrated.precision_maintenance = migrated.precision_maintenance.map((item: any) => ({
            ...item,
            status: item.status === 'NOT_APPLICABLE' ? '' : item.status
        }));
    }

    // 5. Ensure five_whys structure
    if (!migrated.five_whys || !Array.isArray(migrated.five_whys)) {
        migrated.five_whys = [
            { id: '1', why_question: '', answer: '' },
            { id: '2', why_question: '', answer: '' },
            { id: '3', why_question: '', answer: '' },
            { id: '4', why_question: '', answer: '' },
            { id: '5', why_question: '', answer: '' }
        ];
    }

    // 6. Ensure five_whys_chains structure
    if (!migrated.five_whys_chains) {
        migrated.five_whys_chains = [];
    }

    // 7. Ensure ishikawa structure
    if (!migrated.ishikawa) {
        migrated.ishikawa = {
            machine: [], method: [], material: [],
            manpower: [], measurement: [], environment: []
        };
    }

    // 8. Ensure human_reliability structure
    if (!migrated.human_reliability) {
        migrated.human_reliability = {
            questions: [],
            conclusions: [],
            validation: { isValidated: '', comment: '' }
        };
    }

    return migrated;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
    validateMandatoryFields,
    validateCreateFields,
    calculateRcaStatus,
    migrateRcaData,
    STATUS_IDS,
    DEFAULT_CONCLUDE_MANDATORY_FIELDS,
    DEFAULT_CREATE_MANDATORY_FIELDS
};
