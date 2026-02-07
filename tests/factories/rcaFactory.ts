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

export const TaxonomyFactory = {
  createDefault() {
    return {
      analysisTypes: [{ id: 'TYPE-01', name: 'Falha de Equipamento' }],
      analysisStatuses: [
        { id: 'STATUS-01', name: 'Em Andamento' },
        { id: 'STATUS-WAITING', name: 'Aguardando Verificação' },
        { id: 'STATUS-03', name: 'Concluída' }
      ],
      triggerStatuses: [{ id: 'T-STATUS-01', name: 'Novo' }],
      mandatoryFields: {
        trigger: { save: ['start_date', 'stop_reason'] },
        rca: { create: ['what'], conclude: ['root_causes'] }
      }
    };
  }
};
