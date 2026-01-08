-- Schema do banco de dados SQLite para RCA System
-- Versão: 1.0

-- Tabela de Análises RCA
CREATE TABLE IF NOT EXISTS rcas (
    id TEXT PRIMARY KEY,
    version TEXT DEFAULT '17.0',
    analysis_date TEXT,
    analysis_duration_minutes INTEGER DEFAULT 0,
    analysis_type TEXT,
    status TEXT,
    participants TEXT, -- JSON array
    facilitator TEXT,
    start_date TEXT,
    completion_date TEXT,
    requires_operation_support INTEGER DEFAULT 0,
    
    -- Evento
    failure_date TEXT,
    failure_time TEXT,
    downtime_minutes INTEGER DEFAULT 0,
    financial_impact REAL DEFAULT 0,
    os_number TEXT,
    
    -- Localização
    area_id TEXT,
    equipment_id TEXT,
    subgroup_id TEXT,
    component_type TEXT,
    asset_name_display TEXT,
    
    -- Classificação
    specialty_id TEXT,
    failure_mode_id TEXT,
    failure_category_id TEXT,
    
    -- Descrição 5W1H
    who TEXT,
    what TEXT,
    "when" TEXT,
    where_description TEXT,
    problem_description TEXT,
    potential_impacts TEXT,
    quality_impacts TEXT,
    
    -- Investigação (JSON)
    five_whys TEXT, -- JSON array
    ishikawa TEXT, -- JSON object
    root_causes TEXT, -- JSON array
    
    -- Checklists (JSON)
    precision_maintenance TEXT, -- JSON array
    human_reliability TEXT, -- JSON object
    
    -- Ações
    containment_actions TEXT, -- JSON array
    lessons_learned TEXT, -- JSON array
    general_moc_number TEXT,
    additional_info TEXT, -- JSON object
    
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Triggers (Gatilhos)
CREATE TABLE IF NOT EXISTS triggers (
    id TEXT PRIMARY KEY,
    area_id TEXT,
    equipment_id TEXT,
    subgroup_id TEXT,
    start_date TEXT,
    end_date TEXT,
    duration_minutes INTEGER DEFAULT 0,
    stop_type TEXT,
    stop_reason TEXT,
    comments TEXT,
    analysis_type_id TEXT,
    status TEXT,
    responsible TEXT,
    rca_id TEXT,
    
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (rca_id) REFERENCES rcas(id)
);

-- Tabela de Ações
CREATE TABLE IF NOT EXISTS actions (
    id TEXT PRIMARY KEY,
    rca_id TEXT NOT NULL,
    action TEXT,
    responsible TEXT,
    date TEXT,
    status TEXT, -- '1', '2', '3', '4'
    moc_number TEXT,
    
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (rca_id) REFERENCES rcas(id)
);

-- Tabela de Assets (Hierarquia)
CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'AREA', 'EQUIPMENT', 'SUBGROUP'
    parent_id TEXT,
    
    FOREIGN KEY (parent_id) REFERENCES assets(id)
);

-- Tabela de Taxonomia (Configuração)
CREATE TABLE IF NOT EXISTS taxonomy (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    config TEXT NOT NULL -- JSON completo da TaxonomyConfig
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_rcas_status ON rcas(status);
CREATE INDEX IF NOT EXISTS idx_rcas_area ON rcas(area_id);
CREATE INDEX IF NOT EXISTS idx_triggers_status ON triggers(status);
CREATE INDEX IF NOT EXISTS idx_triggers_rca ON triggers(rca_id);
CREATE INDEX IF NOT EXISTS idx_actions_rca ON actions(rca_id);
CREATE INDEX IF NOT EXISTS idx_assets_parent ON assets(parent_id);
