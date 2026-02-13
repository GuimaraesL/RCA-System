
/**
 * Proposta: Fachada de compatibilidade para o serviço de API.
 * Este arquivo mantém o ponto de entrada original para evitar quebras de importação,
 * mas delega toda a lógica para a nova estrutura modular em ./api.
 */

export * from './api/index';

// Nota: O arquivo original foi modularizado em ./api para melhorar a manutenibilidade.
// Novas funcionalidades devem ser adicionadas nos módulos específicos (assets, rcas, actions, etc).
