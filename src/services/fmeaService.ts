/**
 * Proposta: Serviço de integração com a API de FMEA.
 * Fluxo: Realiza chamadas HTTP para o backend para gerenciar os modos de falha dos ativos.
 */

import { FmeaMode } from '../types';

const API_URL = '/api/fmea';

export const fmeaService = {
  /**
   * Busca todos os modos de falha de um ativo específico.
   */
  async getByAssetId(assetId: string): Promise<FmeaMode[]> {
    const response = await fetch(`${API_URL}/asset/${assetId}`);
    if (!response.ok) throw new Error('Falha ao buscar FMEA do ativo');
    return response.json();
  },

  /**
   * Cria um novo modo de falha.
   */
  async create(data: Partial<FmeaMode>): Promise<FmeaMode> {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Falha ao criar modo de falha');
    return response.json();
  },

  /**
   * Atualiza um modo de falha existente.
   */
  async update(id: string, data: Partial<FmeaMode>): Promise<FmeaMode> {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Falha ao atualizar modo de falha');
    return response.json();
  },

  /**
   * Remove um modo de falha.
   */
  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Falha ao remover modo de falha');
  }
};
