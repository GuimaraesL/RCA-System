
/**
 * Proposta: Ponto de entrada modularizado para o serviço de CSV.
 * Este arquivo atua como uma fachada (Facade), agregando e exportando
 * as funcionalidades de importação, exportação e tipos, que foram
 * separadas em arquivos distintos para melhor organização e manutenibilidade.
 */

// Exporta todos os tipos e constantes relacionados ao serviço de CSV
export * from './types';

// Exporta as funcionalidades de importação
export { importFromCsv } from './importers';

// Exporta as funcionalidades de exportação e templates
export { exportToCsv, getCsvTemplate } from './exporters';
