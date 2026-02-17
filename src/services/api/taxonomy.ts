
/**
 * Proposta: Serviço de API para gestão de Taxonomia e Configurações Globais.
 * Fluxo: Implementa a busca e salvamento das listas de referência do sistema (Status, Tipos de Análise, etc.) e regras de validação mandatórias.
 */

import { TaxonomyConfig } from "../../types";
import { API_BASE, checkResponse } from "./base";

// --- TAXONOMIA E CONFIGURAÇÕES ---

export const fetchTaxonomy = async (): Promise<TaxonomyConfig> => {
    console.log('API: Buscando taxonomia e configurações...');
    const response = await fetch(`${API_BASE}/taxonomy`);
    return checkResponse(response, 'GET /taxonomy');
};

export const saveTaxonomyToApi = async (taxonomy: TaxonomyConfig): Promise<void> => {
    console.log('API: Salvando novas configurações de taxonomia...');
    const response = await fetch(`${API_BASE}/taxonomy`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taxonomy)
    });
    await checkResponse(response, 'PUT /taxonomy');
};

export const importTaxonomyToApi = async (taxonomy: TaxonomyConfig): Promise<void> => {
    // Reutiliza o método de salvamento padrão para garantir integridade
    return saveTaxonomyToApi(taxonomy);
};

