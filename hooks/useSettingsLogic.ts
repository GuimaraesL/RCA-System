
import { useState, useEffect } from 'react';
import { TaxonomyConfig, TaxonomyItem } from '../types';
import { getTaxonomy, saveTaxonomy, generateId } from '../services/storageService';

export const useSettingsLogic = () => {
  const [taxonomy, setTaxonomy] = useState<TaxonomyConfig>({
    analysisTypes: [],
    analysisStatuses: [],
    specialties: [],
    failureModes: [],
    failureCategories: [],
    componentTypes: []
  });

  useEffect(() => {
    setTaxonomy(getTaxonomy());
  }, []);

  const handleUpdate = (field: keyof TaxonomyConfig, newItems: TaxonomyItem[]) => {
    const newTaxonomy = { ...taxonomy, [field]: newItems };
    setTaxonomy(newTaxonomy);
    saveTaxonomy(newTaxonomy);
  };

  const addItem = (field: keyof TaxonomyConfig, name: string) => {
    if (!name.trim()) return;
    const newItem: TaxonomyItem = {
      id: generateId(field.substring(0, 3).toUpperCase()),
      name: name.trim()
    };
    handleUpdate(field, [...taxonomy[field], newItem]);
  };

  const removeItem = (field: keyof TaxonomyConfig, id: string) => {
    handleUpdate(field, taxonomy[field].filter(i => i.id !== id));
  };

  const updateItem = (field: keyof TaxonomyConfig, id: string, name: string) => {
    const updated = taxonomy[field].map(i => i.id === id ? { ...i, name } : i);
    handleUpdate(field, updated);
  };

  return {
    taxonomy,
    addItem,
    removeItem,
    updateItem
  };
};
