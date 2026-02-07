/**
 * Fábrica: rcaFactory.ts
 * 
 * Proposta: Gerar objetos RCA e Gatilhos mockados para isolamento de testes.
 * Ações: Criação de dados aleatórios e realistas baseados nos tipos do sistema.
 */

export const RcaFactory = {
  create(overrides = {}) {
    return {
      id: `RCA-${Math.random().toString(36).substr(2, 9)}`,
      what: 'Falha de teste gerada por Factory',
      status: 'STATUS-01',
      failure_date: new Date().toISOString().split('T')[0],
      participants: ['Tester Automation'],
      root_causes: [],
      analysis_type: 'TYPE-01',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides
    };
  }
};

export const TriggerFactory = {
  create(overrides = {}) {
    return {
      id: `TRG-${Math.random().toString(36).substr(2, 9)}`,
      area_id: 'AREA-01',
      equipment_id: 'EQUIP-01',
      start_date: new Date().toISOString().substring(0, 16),
      stop_type: 'Mecânica',
      stop_reason: 'Desgaste Natural',
      responsible: 'QA Engine',
      status: 'T-STATUS-01',
      ...overrides
    };
  }
};

export const ActionFactory = {
  create(overrides = {}) {
    return {
      id: `ACT-${Math.random().toString(36).substr(2, 9)}`,
      rca_id: 'RCA-TEST-01',
      action: 'Ação Corretiva de Teste',
      responsible: 'QA Engine',
      date: new Date().toISOString().split('T')[0],
      status: '1',
      ...overrides
    };
  }
};

export const SystemFactory = {
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
};

export const TaxonomyFactory = {
  createDefault() {
    return {
      analysisTypes: [
        { id: 'TYPE-01', name: 'Falha de Equipamento' },
        { id: 'TYPE-02', name: 'Falha de Processo' }
      ],
      analysisStatuses: [
        { id: 'STATUS-01', name: 'Em Andamento' },
        { id: 'STATUS-WAITING', name: 'Aguardando Verificação' },
        { id: 'STATUS-03', name: 'Concluída' },
        { id: 'STATUS-04', name: 'Cancelada' }
      ],
      specialties: [
        { id: 'SPEC-01', name: 'Mecânica' },
        { id: 'SPEC-02', name: 'Elétrica' }
      ],
      failureModes: [],
      failureCategories: [],
      componentTypes: [],
      rootCauseMs: [
        { id: 'M1', name: 'Máquina' },
        { id: 'M2', name: 'Método' }
      ],
      triggerStatuses: [
        { id: 'T-STATUS-01', name: 'Novo' },
        { id: 'T-STATUS-02', name: 'Em Análise' }
      ],
      mandatoryFields: {
        trigger: {
          save: ['start_date', 'stop_reason', 'responsible', 'status']
        },
        rca: {
          create: ['subgroup_id', 'failure_date', 'analysis_type', 'what'],
          conclude: ['root_causes', 'five_whys', 'ishikawa']
        }
      }
    };
  }
};
