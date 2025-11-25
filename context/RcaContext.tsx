
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { RcaRecord, AssetNode, ActionRecord, TaxonomyConfig } from '../types';
import * as storage from '../services/storageService';

interface RcaContextType {
  // State
  records: RcaRecord[];
  assets: AssetNode[];
  actions: ActionRecord[];
  taxonomy: TaxonomyConfig;

  // Records Methods
  addRecord: (record: RcaRecord) => void;
  updateRecord: (record: RcaRecord) => void;
  deleteRecord: (id: string) => void;

  // Assets Methods
  updateAssets: (assets: AssetNode[]) => void;

  // Actions Methods
  addAction: (action: ActionRecord) => void;
  updateAction: (action: ActionRecord) => void;
  deleteAction: (id: string) => void;

  // Taxonomy Methods
  updateTaxonomy: (taxonomy: TaxonomyConfig) => void;

  // Utility
  refreshAll: () => void;
}

const RcaContext = createContext<RcaContextType | undefined>(undefined);

export const RcaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [records, setRecords] = useState<RcaRecord[]>([]);
  const [assets, setAssets] = useState<AssetNode[]>([]);
  const [actions, setActions] = useState<ActionRecord[]>([]);
  const [taxonomy, setTaxonomy] = useState<TaxonomyConfig>({
      analysisTypes: [], analysisStatuses: [], specialties: [], failureModes: [], 
      failureCategories: [], componentTypes: [], rootCauseMs: []
  });

  const refreshAll = () => {
    setRecords(storage.getRecords());
    setAssets(storage.getAssets());
    setActions(storage.getActions());
    setTaxonomy(storage.getTaxonomy());
  };

  useEffect(() => {
    refreshAll();
  }, []);

  // --- Records Wrappers ---
  const addRecord = (record: RcaRecord) => {
    storage.saveRecord(record);
    refreshAll();
  };

  const updateRecord = (record: RcaRecord) => {
    storage.saveRecord(record);
    refreshAll();
  };

  const deleteRecord = (id: string) => {
    // Implementation for delete would go here if added to storageService
    // For now, we usually just update status to Cancelled, but if physical delete is needed:
    const newRecords = records.filter(r => r.id !== id);
    storage.saveRecords(newRecords);
    refreshAll();
  };

  // --- Assets Wrappers ---
  const updateAssets = (newAssets: AssetNode[]) => {
    storage.saveAssets(newAssets);
    setAssets(newAssets); // Optimistic update or wait for refresh
  };

  // --- Actions Wrappers ---
  const addAction = (action: ActionRecord) => {
    storage.saveAction(action);
    refreshAll();
  };

  const updateAction = (action: ActionRecord) => {
    storage.saveAction(action);
    refreshAll();
  };

  const deleteActionInternal = (id: string) => {
    storage.deleteAction(id);
    refreshAll();
  };

  // --- Taxonomy Wrappers ---
  const updateTaxonomyInternal = (newTaxonomy: TaxonomyConfig) => {
    storage.saveTaxonomy(newTaxonomy);
    setTaxonomy(newTaxonomy);
  };

  return (
    <RcaContext.Provider value={{
      records,
      assets,
      actions,
      taxonomy,
      addRecord,
      updateRecord,
      deleteRecord,
      updateAssets,
      addAction,
      updateAction,
      deleteAction: deleteActionInternal,
      updateTaxonomy: updateTaxonomyInternal,
      refreshAll
    }}>
      {children}
    </RcaContext.Provider>
  );
};

export const useRcaContext = () => {
  const context = useContext(RcaContext);
  if (context === undefined) {
    throw new Error('useRcaContext must be used within a RcaProvider');
  }
  return context;
};
