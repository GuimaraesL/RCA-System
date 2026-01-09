// Contexto Global do RCA System
// VERSÃO CORRIGIDA - com tratamento de erros e logs de debug

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { RcaRecord, AssetNode, ActionRecord, TriggerRecord, TaxonomyConfig } from '../types';
import * as api from '../services/apiService';
import * as storage from '../services/storageService';

interface RcaContextType {
  // State
  records: RcaRecord[];
  assets: AssetNode[];
  actions: ActionRecord[];
  triggers: TriggerRecord[];
  taxonomy: TaxonomyConfig;
  isLoading: boolean;
  useApi: boolean;

  // Records Methods
  addRecord: (record: RcaRecord) => Promise<void>;
  updateRecord: (record: RcaRecord) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;

  // Assets Methods
  updateAssets: (assets: AssetNode[]) => Promise<void>;

  // Actions Methods
  addAction: (action: ActionRecord) => Promise<void>;
  updateAction: (action: ActionRecord) => Promise<void>;
  deleteAction: (id: string) => Promise<void>;

  // Triggers Methods
  addTrigger: (trigger: TriggerRecord) => Promise<void>;
  updateTrigger: (trigger: TriggerRecord) => Promise<void>;
  deleteTrigger: (id: string) => Promise<void>;

  // Taxonomy Methods
  updateTaxonomy: (taxonomy: TaxonomyConfig) => Promise<void>;

  // Utility
  refreshAll: () => Promise<void>;
  setUseApi: (value: boolean) => void;
}

const RcaContext = createContext<RcaContextType | undefined>(undefined);

const emptyTaxonomy: TaxonomyConfig = {
  analysisTypes: [], analysisStatuses: [], specialties: [], failureModes: [],
  failureCategories: [], componentTypes: [], rootCauseMs: [], triggerStatuses: []
};

export const RcaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [records, setRecords] = useState<RcaRecord[]>([]);
  const [assets, setAssets] = useState<AssetNode[]>([]);
  const [actions, setActions] = useState<ActionRecord[]>([]);
  const [triggers, setTriggers] = useState<TriggerRecord[]>([]);
  const [taxonomy, setTaxonomy] = useState<TaxonomyConfig>(emptyTaxonomy);
  const [isLoading, setIsLoading] = useState(true);
  const [useApi, setUseApi] = useState(false);

  // Detectar se API está disponível
  useEffect(() => {
    const checkApi = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/health');
        if (response.ok) {
          console.log('✅ API disponível - usando backend');
          setUseApi(true);
        }
      } catch {
        console.log('⚠️ API não disponível - usando localStorage');
        setUseApi(false);
      }
    };
    checkApi();
  }, []);

  const refreshAll = useCallback(async () => {
    console.log('🔄 Refresh: Carregando dados... (useApi:', useApi, ')');
    setIsLoading(true);
    try {
      if (useApi) {
        const [recs, assts, acts, trigs, tax] = await Promise.all([
          api.fetchRecords(),
          api.fetchAssets(),
          api.fetchActions(),
          api.fetchTriggers(),
          api.fetchTaxonomy()
        ]);
        setRecords(recs);
        setAssets(assts);
        setActions(acts);
        setTriggers(trigs);
        setTaxonomy(tax);
        console.log('✅ Refresh completo via API');
      } else {
        setRecords(storage.LEGACY_getRecords());
        setAssets(storage.LEGACY_getAssets());
        setActions(storage.LEGACY_getActions());
        setTriggers(storage.LEGACY_getTriggers());
        setTaxonomy(storage.LEGACY_getTaxonomy());
        console.log('✅ Refresh completo via localStorage (LEGACY)');
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      // Fallback para localStorage se API falhar
      setRecords(storage.LEGACY_getRecords());
      setAssets(storage.LEGACY_getAssets());
      setActions(storage.LEGACY_getActions());
      setTriggers(storage.LEGACY_getTriggers());
      setTaxonomy(storage.LEGACY_getTaxonomy());
    }
    setIsLoading(false);
  }, [useApi]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // --- Records Wrappers ---
  const addRecord = async (record: RcaRecord): Promise<void> => {
    console.log('📝 Context: Adicionando RCA...', record.id);
    try {
      if (useApi) {
        await api.saveRecordToApi(record);
      } else {
        storage.saveRecord(record);
      }
      await refreshAll();
      console.log('✅ Context: RCA adicionada com sucesso');
    } catch (error) {
      console.error('❌ Context: Erro ao adicionar RCA via API, tentando localStorage...', error);
      // Fallback to localStorage if API fails
      try {
        storage.saveRecord(record);
        setRecords(prev => [...prev, record]);
        console.log('✅ Context: RCA adicionada com sucesso via localStorage (fallback)');
      } catch (localError) {
        console.error('❌ Context: Erro ao adicionar RCA:', localError);
        throw localError;
      }
    }
  };

  const updateRecord = async (record: RcaRecord): Promise<void> => {
    console.log('📝 Context: Atualizando RCA...', record.id);
    try {
      if (useApi) {
        await api.saveRecordToApi(record);
      } else {
        storage.saveRecord(record);
      }
      await refreshAll();
      console.log('✅ Context: RCA atualizada com sucesso');
    } catch (error) {
      console.error('❌ Context: Erro ao atualizar RCA via API, tentando localStorage...', error);
      // Fallback to localStorage if API fails
      try {
        storage.saveRecord(record);
        setRecords(prev => prev.map(r => r.id === record.id ? record : r));
        console.log('✅ Context: RCA atualizada com sucesso via localStorage (fallback)');
      } catch (localError) {
        console.error('❌ Context: Erro ao atualizar RCA:', localError);
        throw localError;
      }
    }
  };

  const deleteRecord = async (id: string): Promise<void> => {
    console.log('🗑️ Context: Excluindo RCA...', id);
    try {
      if (useApi) {
        await api.deleteRecordFromApi(id);
      } else {
        const newRecords = records.filter(r => r.id !== id);
        storage.saveRecords(newRecords);
      }
      await refreshAll();
      console.log('✅ Context: RCA excluída com sucesso');
    } catch (error) {
      console.error('❌ Context: Erro ao excluir RCA via API, tentando localStorage...', error);
      // Fallback to localStorage if API fails
      try {
        const newRecords = records.filter(r => r.id !== id);
        storage.saveRecords(newRecords);
        setRecords(newRecords);
        console.log('✅ Context: RCA excluída com sucesso via localStorage (fallback)');
      } catch (localError) {
        console.error('❌ Context: Erro ao excluir RCA:', localError);
        throw localError;
      }
    }
  };

  // --- Assets Wrappers ---
  const updateAssets = async (newAssets: AssetNode[]): Promise<void> => {
    console.log('📝 Context: Atualizando assets...');
    try {
      if (useApi) {
        await api.importAssetsToApi(newAssets);
      } else {
        storage.saveAssets(newAssets);
      }
      setAssets(newAssets);
    } catch (error) {
      console.error('❌ Context: Erro ao atualizar assets:', error);
      throw error;
    }
  };

  // --- Actions Wrappers ---
  const addAction = async (action: ActionRecord): Promise<void> => {
    console.log('📝 Context: Adicionando action...', action.id);
    try {
      if (useApi) {
        await api.saveActionToApi(action);
      } else {
        storage.saveAction(action);
      }
      await refreshAll();
    } catch (error) {
      console.error('❌ Context: Erro ao adicionar action:', error);
      throw error;
    }
  };

  const updateAction = async (action: ActionRecord): Promise<void> => {
    try {
      if (useApi) {
        await api.saveActionToApi(action);
      } else {
        storage.saveAction(action);
      }
      await refreshAll();
    } catch (error) {
      console.error('❌ Context: Erro ao atualizar action:', error);
      throw error;
    }
  };

  const deleteActionInternal = async (id: string): Promise<void> => {
    console.log('🗑️ Context: Excluindo action...', id);
    try {
      if (useApi) {
        await api.deleteActionFromApi(id);
      } else {
        storage.deleteAction(id);
      }
      await refreshAll();
    } catch (error) {
      console.error('❌ Context: Erro ao excluir action:', error);
      throw error;
    }
  };

  // --- Triggers Wrappers ---
  const addTrigger = async (trigger: TriggerRecord): Promise<void> => {
    console.log('📝 Context: Adicionando trigger...', trigger.id);
    try {
      if (useApi) {
        await api.saveTriggerToApi(trigger);
      } else {
        storage.saveTrigger(trigger);
      }
      await refreshAll();
    } catch (error) {
      console.error('❌ Context: Erro ao adicionar trigger:', error);
      throw error;
    }
  };

  const updateTrigger = async (trigger: TriggerRecord): Promise<void> => {
    console.log('📝 Context: Atualizando trigger...', trigger.id);
    try {
      if (useApi) {
        await api.saveTriggerToApi(trigger);
      } else {
        storage.saveTrigger(trigger);
      }
      await refreshAll();
    } catch (error) {
      console.error('❌ Context: Erro ao atualizar trigger:', error);
      throw error;
    }
  };

  const deleteTriggerInternal = async (id: string): Promise<void> => {
    console.log('🗑️ Context: Excluindo trigger...', id);
    try {
      if (useApi) {
        await api.deleteTriggerFromApi(id);
      } else {
        storage.deleteTrigger(id);
      }
      await refreshAll();
    } catch (error) {
      console.error('❌ Context: Erro ao excluir trigger:', error);
      throw error;
    }
  };

  // --- Taxonomy Wrappers ---
  const updateTaxonomyInternal = async (newTaxonomy: TaxonomyConfig): Promise<void> => {
    console.log('📝 Context: Atualizando taxonomy...');
    try {
      if (useApi) {
        await api.saveTaxonomyToApi(newTaxonomy);
      } else {
        storage.saveTaxonomy(newTaxonomy);
      }
      setTaxonomy(newTaxonomy);
    } catch (error) {
      console.error('❌ Context: Erro ao atualizar taxonomy:', error);
      throw error;
    }
  };

  return (
    <RcaContext.Provider value={{
      records,
      assets,
      actions,
      triggers,
      taxonomy,
      isLoading,
      useApi,
      addRecord,
      updateRecord,
      deleteRecord,
      updateAssets,
      addAction,
      updateAction,
      deleteAction: deleteActionInternal,
      addTrigger,
      updateTrigger,
      deleteTrigger: deleteTriggerInternal,
      updateTaxonomy: updateTaxonomyInternal,
      refreshAll,
      setUseApi
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
