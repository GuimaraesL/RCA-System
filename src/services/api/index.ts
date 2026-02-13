
/**
 * Proposta: Ponto de entrada modularizado para o serviço de API.
 * Este arquivo atua como uma fachada (Facade), agregando e exportando
 * as funcionalidades de comunicação com o backend, separadas por domínio.
 */

export * from './base';
export * from './assets';
export * from './taxonomy';
export * from './rcas';
export * from './actions';
export * from './triggers';
export * from './migration';
