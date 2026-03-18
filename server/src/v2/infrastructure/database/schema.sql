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

    five_whys TEXT, -- JSON array
    ishikawa TEXT, -- JSON object
    root_causes TEXT, -- JSON array

    precision_maintenance TEXT, -- JSON array
    human_reliability TEXT, -- JSON object

    containment_actions TEXT, -- JSON array
    lessons_learned TEXT, -- JSON array
    general_moc_number TEXT,
    additional_info TEXT, -- JSON object
    
    file_path TEXT, -- Added in v1.2
    five_whys_chains TEXT, -- Added in v1.3
    attachments TEXT, -- Added in v3.0

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

CREATE TABLE IF NOT EXISTS taxonomy (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    config TEXT -- JSON object storing the entire taxonomy configuration
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

CREATE TABLE IF NOT EXISTS rel_mode_specialty (
    failure_mode_id TEXT,
    specialty_id TEXT,
    PRIMARY KEY (failure_mode_id, specialty_id),
    FOREIGN KEY (failure_mode_id) REFERENCES taxonomy_failure_modes(id),
    FOREIGN KEY (specialty_id) REFERENCES taxonomy_specialties(id)
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
