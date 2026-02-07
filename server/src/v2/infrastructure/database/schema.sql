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
    updated_at TEXT DEFAULT (datetime('now'))
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
