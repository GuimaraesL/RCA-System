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
      version: '17.2',
      analysis_date: new Date().toISOString().split('T')[0],
      analysis_duration_minutes: 0,
      analysis_type: 'TYPE-01',
      status: 'STATUS-01',
      participants: ['Tester Automation'],
      facilitator: 'Tester Automation',
      start_date: new Date().toISOString().split('T')[0],
      completion_date: '',
      requires_operation_support: false,
      failure_date: new Date().toISOString().split('T')[0],
      failure_time: '10:00',
      downtime_minutes: 60,
      financial_impact: 1000,
      os_number: 'OS-12345',
      area_id: 'AREA-01',
      equipment_id: 'EQUIP-01',
      subgroup_id: 'SUB-01',
      component_type: 'COMP-01',
      specialty_id: 'SPEC-01',
      failure_mode_id: 'MODE-01',
      failure_category_id: 'CAT-01',
      who: 'Operador',
      what: 'Falha de teste gerada por Factory',
      when: 'Turno A',
      where_description: 'Linha de Produção',
      problem_description: 'Descrição detalhada da falha',
      potential_impacts: 'Impacto na produção',
      five_whys: [],
      ishikawa: { machine: [], method: [], material: [], manpower: [], measurement: [], environment: [] },
      root_causes: [],
      precision_maintenance: [],
      containment_actions: [],
      lessons_learned: [],
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
      // subgroup_id removido daqui pois já existe na linha 67
      start_date: new Date().toISOString().substring(0, 16),
      end_date: new Date().toISOString().substring(0, 16),
      duration_minutes: 60,
      stop_type: 'Mecânica',
      stop_reason: 'Desgaste Natural',
      comments: 'Comentário de teste',
      analysis_type_id: 'TYPE-01',
      status: 'T-STATUS-01',
      responsible: 'QA Engine',
      rca_id: null,
      subgroup_id: 'SUB-01', // Garante consistência com subgrupo mockado
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
        { id: 'STATUS-02', name: 'Aguardando Verificação' },
        { id: 'STATUS-03', name: 'Concluída' },
        { id: 'STATUS-04', name: 'Cancelada' }
      ],
      specialties: [
        { id: 'SPEC-01', name: 'Mecânica' },
        { id: 'SPEC-02', name: 'Elétrica' }
      ],
      failureModes: [
        { id: 'MODE-01', name: 'Desgaste' }
      ],
      failureCategories: [
        { id: 'CAT-01', name: 'Crítica' }
      ],
      componentTypes: [
        { id: 'COMP-01', name: 'Rolamento' }
      ],
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