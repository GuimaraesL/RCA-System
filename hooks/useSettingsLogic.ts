
import { useState, useEffect } from 'react';
import { TaxonomyConfig, TaxonomyItem } from '../types';
import { generateId } from '../services/storageService';
import { useRcaContext } from '../context/RcaContext';

export const useSettingsLogic = () => {
  const { taxonomy, updateTaxonomy } = useRcaContext();
  const [localTaxonomy, setLocalTaxonomy] = useState<TaxonomyConfig>({
    analysisTypes: [],
    analysisStatuses: [],
    specialties: [],
    failureModes: [],
    failureCategories: [],
    componentTypes: [],
    rootCauseMs: [],
    triggerStatuses: []
  });

  useEffect(() => {
    // Ensure all arrays exist even if context data is potentially partial (unlikely, but safe)
    setLocalTaxonomy({
      analysisTypes: taxonomy.analysisTypes || [],
      analysisStatuses: taxonomy.analysisStatuses || [],
      specialties: taxonomy.specialties || [],
      failureModes: taxonomy.failureModes || [],
      failureCategories: taxonomy.failureCategories || [],
      componentTypes: taxonomy.componentTypes || [],
      rootCauseMs: taxonomy.rootCauseMs || [],
      triggerStatuses: taxonomy.triggerStatuses || []
    });
  }, [taxonomy]);

  const handleUpdate = (field: keyof TaxonomyConfig, newItems: TaxonomyItem[]) => {
    const newTaxonomy = { ...taxonomy, [field]: newItems };
    updateTaxonomy(newTaxonomy);
  };

  const addItem = (field: keyof TaxonomyConfig, name: string) => {
    if (!name.trim()) return;
    const newItem: TaxonomyItem = {
      id: generateId(field.substring(0, 3).toUpperCase()),
      name: name.trim()
    };
    handleUpdate(field, [...(taxonomy[field] || []), newItem]);
  };

  const removeItem = (field: keyof TaxonomyConfig, id: string) => {
    handleUpdate(field, (taxonomy[field] || []).filter(i => i.id !== id));
  };

  const updateItem = (field: keyof TaxonomyConfig, id: string, name: string) => {
    const updated = (taxonomy[field] || []).map(i => i.id === id ? { ...i, name } : i);
    handleUpdate(field, updated);
  };

  return {
    taxonomy: localTaxonomy,
    addItem,
    removeItem,
    updateItem
  };
};
