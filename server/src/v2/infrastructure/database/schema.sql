-- RCA System Database Schema

CREATE TABLE IF NOT EXISTS rcas (
    id TEXT PRIMARY KEY,
    version TEXT,
    analysis_date TEXT,
    analysis_duration_minutes INTEGER,
    analysis_type TEXT,
    status TEXT,

    participants TEXT, -- JSON array
    facilitator TEXT,

    start_date TEXT,
    completion_date TEXT,
    requires_operation_support INTEGER,

    failure_date TEXT,
    failure_time TEXT,
    downtime_minutes INTEGER,
    financial_impact REAL,
    os_number TEXT,

    area_id TEXT,
    equipment_id TEXT,
    subgroup_id TEXT,
    component_type TEXT,
    asset_name_display TEXT,

    specialty_id TEXT,
    failure_mode_id TEXT,
    failure_category_id TEXT,

    who TEXT,
    what TEXT,
    "when" TEXT,
    where_description TEXT,
    problem_description TEXT,
    potential_impacts TEXT,
    quality_impacts TEXT,

    general_moc_number TEXT,
    additional_info TEXT, -- JSON object
    
    file_path TEXT, -- Added in v1.2
    
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS actions (
    id TEXT PRIMARY KEY,
    rca_id TEXT,
    action TEXT,
    responsible TEXT,
    date TEXT,
    status TEXT,
    moc_number TEXT,
    created_at TEXT, -- Added in v1.4
    updated_at TEXT, -- Added in v1.5
    FOREIGN KEY(rca_id) REFERENCES rcas(id)
);

CREATE TABLE IF NOT EXISTS triggers (
    id TEXT PRIMARY KEY,
    area_id TEXT,
    equipment_id TEXT,
    subgroup_id TEXT,
    start_date TEXT,
    end_date TEXT,
    duration_minutes INTEGER,
    stop_type TEXT,
    stop_reason TEXT,
    comments TEXT,
    analysis_type_id TEXT,
    status TEXT,
    responsible TEXT,
    rca_id TEXT,
    file_path TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(rca_id) REFERENCES rcas(id)
);


CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    name TEXT,
    type TEXT,
    parent_id TEXT,
    FOREIGN KEY(parent_id) REFERENCES assets(id)
);

CREATE TABLE IF NOT EXISTS fmea_modes (
    id TEXT PRIMARY KEY,
    asset_id TEXT NOT NULL,
    failure_mode TEXT NOT NULL,
    potential_effects TEXT,
    severity INTEGER DEFAULT 1,
    potential_causes TEXT,
    occurrence INTEGER DEFAULT 1,
    current_controls TEXT,
    detection INTEGER DEFAULT 1,
    rpn INTEGER GENERATED ALWAYS AS (severity * occurrence * detection) STORED,
    recommended_actions TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(asset_id) REFERENCES assets(id)
);

-- Taxonomy Relational Schema (Added in v4.0)
CREATE TABLE IF NOT EXISTS taxonomy_specialties (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS taxonomy_failure_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS taxonomy_component_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS taxonomy_root_causes_6m (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS taxonomy_failure_modes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS taxonomy_analysis_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS taxonomy_analysis_statuses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS taxonomy_trigger_statuses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

-- Investigation Normalization (Updated in v7.0 - Split into specialized tables)
CREATE TABLE IF NOT EXISTS rca_five_whys (
    id TEXT PRIMARY KEY,
    rca_id TEXT NOT NULL,
    parent_id TEXT,
    question TEXT,
    answer TEXT,
    order_index INTEGER,
    chain_id TEXT,
    cause_effect TEXT,
    content TEXT, -- JSON string for root_node (tree structures)
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(rca_id) REFERENCES rcas(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rca_ishikawa (
    id TEXT PRIMARY KEY,
    rca_id TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(rca_id) REFERENCES rcas(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rca_root_causes (
    id TEXT PRIMARY KEY,
    rca_id TEXT NOT NULL,
    root_cause_m_id TEXT,
    cause TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(rca_id) REFERENCES rcas(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rca_precision_checklists (
    rca_id TEXT PRIMARY KEY,
    chk_clean_status TEXT, chk_clean_comment TEXT,
    chk_tol_status TEXT, chk_tol_comment TEXT,
    chk_lube_status TEXT, chk_lube_comment TEXT,
    chk_belt_status TEXT, chk_belt_comment TEXT,
    chk_load_status TEXT, chk_load_comment TEXT,
    chk_align_status TEXT, chk_align_comment TEXT,
    chk_bal_status TEXT, chk_bal_comment TEXT,
    chk_torque_status TEXT, chk_torque_comment TEXT,
    chk_parts_status TEXT, chk_parts_comment TEXT,
    chk_func_status TEXT, chk_func_comment TEXT,
    chk_doc_status TEXT, chk_doc_comment TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(rca_id) REFERENCES rcas(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rca_hra_checklists (
    rca_id TEXT PRIMARY KEY,
    -- Perguntas
    q_1_1_answer TEXT, q_1_1_comment TEXT,
    q_1_3_answer TEXT, q_1_3_comment TEXT,
    q_1_4_answer TEXT, q_1_4_comment TEXT,
    q_2_1_answer TEXT, q_2_1_comment TEXT,
    q_2_2_answer TEXT, q_2_2_comment TEXT,
    q_3_1_answer TEXT, q_3_1_comment TEXT,
    q_4_1_answer TEXT, q_4_1_comment TEXT,
    q_4_2_answer TEXT, q_4_2_comment TEXT,
    q_5_1_answer TEXT, q_5_1_comment TEXT,
    q_6_1_answer TEXT, q_6_1_comment TEXT,
    q_6_2_answer TEXT, q_6_2_comment TEXT,
    -- Conclusões
    c_procedures_selected INTEGER, c_procedures_description TEXT,
    c_training_selected INTEGER, c_training_description TEXT,
    c_external_selected INTEGER, c_external_description TEXT,
    c_routine_selected INTEGER, c_routine_description TEXT,
    c_organization_selected INTEGER, c_organization_description TEXT,
    c_measures_selected INTEGER, c_measures_description TEXT,
    -- Validação
    is_validated TEXT,
    validation_comment TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(rca_id) REFERENCES rcas(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rca_containment (
    id TEXT PRIMARY KEY,
    rca_id TEXT NOT NULL,
    content TEXT NOT NULL, -- JSON string
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(rca_id) REFERENCES rcas(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_fivewhys_rca_id ON rca_five_whys(rca_id);
CREATE INDEX IF NOT EXISTS idx_ishikawa_rca_id ON rca_ishikawa(rca_id);
CREATE INDEX IF NOT EXISTS idx_rootcauses_rca_id ON rca_root_causes(rca_id);
CREATE INDEX IF NOT EXISTS idx_containment_rca_id ON rca_containment(rca_id);

-- Normalization of Attachments (Added in v6.0 - Issue #167)
CREATE TABLE IF NOT EXISTS rcas_attachments (
    id TEXT PRIMARY KEY,
    rca_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_type TEXT,
    size_bytes INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(rca_id) REFERENCES rcas(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_attachments_rca_id ON rcas_attachments(rca_id);
