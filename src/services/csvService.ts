
/**
 * Proposta: Fachada de compatibilidade para o serviço de CSV.
 * Este arquivo mantém o ponto de entrada original para evitar quebras de importação,
 * mas delega toda a lógica para a nova estrutura modular em ./csv.
 */

export * from './csv/types';
export * from './csv/importers';
export * from './csv/exporters';

// Nota: O arquivo original foi modularizado em ./csv para melhorar a manutenibilidade.
// Novas funcionalidades devem ser adicionadas nos módulos específicos (importers, exporters, etc).
