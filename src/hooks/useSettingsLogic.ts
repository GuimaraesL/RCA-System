import { useRcaContext } from '../context/RcaContext';
import { TaxonomyConfig, TaxonomyItem } from '../types';
import { generateId } from '../services/utils';

export const useSettingsLogic = () => {
  const { taxonomy, updateTaxonomy } = useRcaContext();

  const handleUpdate = async (field: keyof TaxonomyConfig, newItems: TaxonomyItem[]) => {
    console.log(`⚙️ Settings: Updating field ${field}...`);
    const newTaxonomy = { ...taxonomy, [field]: newItems };
    try {
      await updateTaxonomy(newTaxonomy);
      console.log(`✅ Settings: Field ${field} updated successfully.`);
    } catch (error) {
      console.error(`❌ Settings: Error updating field ${field}:`, error);
    }
  };

  const addItem = (field: keyof TaxonomyConfig, name: string) => {
    if (!name.trim()) return;

    // Prefixos únicos por categoria para evitar colisões (Issue #49)
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

  const updateMandatoryConfig = async (newConfig: any) => {
    // Type is checked by usage, but we could import type. 
    // For now, assume it matches MandatoryFieldsConfig
    const newTaxonomy = { ...taxonomy, mandatoryFields: newConfig };
    try {
      await updateTaxonomy(newTaxonomy);
      console.log(`✅ Settings: Mandatory Fields updated successfully.`);
    } catch (error) {
      console.error(`❌ Settings: Error updating Mandatory Fields:`, error);
    }
  };

  return {
    taxonomy,
    addItem,
    removeItem,
    updateItem,
    updateMandatoryConfig
  };
};
