/**
 * Proposta: Hook para gerenciamento da lógica de Configurações e Taxonomia.
 * Fluxo: Provê métodos para manipulação dinâmica das listas de referência do sistema (Tipos de Análise, Status, Especialidades, etc.), garantindo a persistência via contexto global e implementando lógica de prefixos únicos para evitar colisões de IDs.
 */

import { useRcaContext } from '../context/RcaContext';
import { TaxonomyConfig, TaxonomyItem } from '../types';
import { generateId } from '../services/utils';

export const useSettingsLogic = () => {
  const { taxonomy, updateTaxonomy } = useRcaContext();

  /**
   * Wrapper genérico para atualização de campos da taxonomia.
   */
  const handleUpdate = async (field: keyof TaxonomyConfig, newItems: TaxonomyItem[]) => {
    console.log(`⚙️ Configurações: Atualizando campo ${field}...`);
    const newTaxonomy = { ...taxonomy, [field]: newItems };
    try {
      await updateTaxonomy(newTaxonomy);
      console.log(`✅ Configurações: Campo ${field} atualizado com sucesso.`);
    } catch (error) {
      console.error(`❌ Configurações: Erro ao atualizar campo ${field}:`, error);
    }
  };

  /**
   * Adiciona um novo item a uma categoria da taxonomia.
   * Utiliza prefixos técnicos específicos por categoria para garantir a rastreabilidade e evitar conflitos.
   */
  const addItem = (field: keyof TaxonomyConfig, name: string) => {
    if (!name.trim()) return;

    const prefixes: Record<string, string> = {
      analysisTypes: 'TYP',
      analysisStatuses: 'STA',
      triggerStatuses: 'TRG',
      componentTypes: 'CMP',
      specialties: 'SPC',
      failureModes: 'MOD',
      failureCategories: 'CAT',
      rootCauseMs: 'RCM'
    };
    
    const prefix = prefixes[field] || 'GEN';
    const newItem: TaxonomyItem = {
      id: generateId(prefix),
      name: name.trim()
    };

    const currentItems = (taxonomy[field] as TaxonomyItem[]) || [];
    handleUpdate(field, [...currentItems, newItem]);
  };

  const removeItem = (field: keyof TaxonomyConfig, id: string) => {
    const currentItems = (taxonomy[field] as TaxonomyItem[]) || [];
    handleUpdate(field, currentItems.filter(i => i.id !== id));
  };

  const updateItem = (field: keyof TaxonomyConfig, id: string, name: string) => {
    if (!name.trim()) return;
    const currentItems = (taxonomy[field] as TaxonomyItem[]) || [];
    const updated = currentItems.map(i => i.id === id ? { ...i, name: name.trim() } : i);
    handleUpdate(field, updated);
  };

  /**
   * Atualiza as configurações de obrigatoriedade de campos (Campos Mandatórios).
   */
  const updateMandatoryConfig = async (newConfig: any) => {
    const newTaxonomy = { ...taxonomy, mandatoryFields: newConfig };
    try {
      await updateTaxonomy(newTaxonomy);
      console.log(`✅ Configurações: Regras de campos obrigatórios atualizadas.`);
    } catch (error) {
      console.error(`❌ Configurações: Erro ao atualizar campos obrigatórios:`, error);
    }
  };

  return {
    taxonomy, addItem, removeItem, updateItem, updateMandatoryConfig
  };
};