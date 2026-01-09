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

    // Gerar prefixo baseado no campo (ex: analysisTypes -> ANT)
    const prefix = field.substring(0, 3).toUpperCase();
    const newItem: TaxonomyItem = {
      id: generateId(prefix),
      name: name.trim()
    };

    const currentItems = taxonomy[field] || [];
    handleUpdate(field, [...currentItems, newItem]);
  };

  const removeItem = (field: keyof TaxonomyConfig, id: string) => {
    const currentItems = taxonomy[field] || [];
    handleUpdate(field, currentItems.filter(i => i.id !== id));
  };

  const updateItem = (field: keyof TaxonomyConfig, id: string, name: string) => {
    if (!name.trim()) return;
    const currentItems = taxonomy[field] || [];
    const updated = currentItems.map(i => i.id === id ? { ...i, name: name.trim() } : i);
    handleUpdate(field, updated);
  };

  return {
    taxonomy,
    addItem,
    removeItem,
    updateItem
  };
};
