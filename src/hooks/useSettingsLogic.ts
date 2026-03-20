/**
 * Proposta: Hook para gerenciamento da lógica de Configurações e Taxonomia.
 * Fluxo: Provê métodos para manipulação dinâmica das listas de referência do sistema (Tipos de Análise, Status, Especialidades, etc.), garantindo a persistência via contexto global e implementando lógica de prefixos únicos para evitar colisões de IDs.
 */

import { useState } from 'react';
import { useRcaContext } from '../context/RcaContext';
import { TaxonomyConfig, TaxonomyItem } from '../types';
import { generateId } from '../services/utils';

export const useSettingsLogic = () => {
  const { taxonomy, updateTaxonomy } = useRcaContext();
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Wrapper genérico para atualização de campos da taxonomia.
   */
  const handleUpdate = async (field: keyof TaxonomyConfig, newItems: TaxonomyItem[]) => {
    setIsSaving(true);
    console.log(`Configurações: Atualizando campo ${field}...`);
    const newTaxonomy = { ...taxonomy, [field]: newItems };
    try {
      await updateTaxonomy(newTaxonomy);
      console.log(`Configurações: Campo ${field} atualizado com sucesso.`);
    } catch (error) {
      console.error(`Configurações: Erro ao atualizar campo ${field}:`, error);
    } finally {
      // Pequeno delay para garantir que o usuário veja o estado de salvamento se for muito rápido
      setTimeout(() => setIsSaving(false), 500);
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

  const updateItem = (field: keyof TaxonomyConfig, id: string, updates: Partial<TaxonomyItem>) => {
    const currentItems = (taxonomy[field] as TaxonomyItem[]) || [];
    const updated = currentItems.map(i => i.id === id ? { ...i, ...updates } : i);
    handleUpdate(field, updated);
  };

  /**
   * Atualiza as configurações de obrigatoriedade de campos (Campos Mandatórios).
   */
  const updateMandatoryConfig = async (newConfig: any) => {
    setIsSaving(true);
    const newTaxonomy = { ...taxonomy, mandatoryFields: newConfig };
    try {
      await updateTaxonomy(newTaxonomy);
      console.log(`Configurações: Regras de campos obrigatórios atualizadas.`);
    } catch (error) {
      console.error(`Configurações: Erro ao atualizar campos obrigatórios:`, error);
    } finally {
      setTimeout(() => setIsSaving(false), 500);
    }
  };

  return {
    taxonomy, addItem, removeItem, updateItem, updateMandatoryConfig, isSaving
  };
};