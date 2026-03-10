/**
 * Proposta: Contexto global de estado e orquestração de dados do sistema.
 * Fluxo: Centraliza o acesso a RCAs, Ativos, Ações e Gatilhos, gerenciando a alternância automática entre a API (Backend) e o LocalStorage (Modo Offline/Legado) conforme a disponibilidade do servidor.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { RcaRecord, AssetNode, ActionRecord, TriggerRecord, TaxonomyConfig } from '../types';
import * as api from '../services/apiService';
import * as storage from '../services/storageService';

interface RcaContextType {
  records: RcaRecord[];
  assets: AssetNode[];
  actions: ActionRecord[];
  triggers: TriggerRecord[];
  taxonomy: TaxonomyConfig;
  isLoading: boolean;
  useApi: boolean | null;

  // Métodos de Gestão de Registros
  addRecord: (record: RcaRecord) => Promise<void>;
  updateRecord: (record: RcaRecord) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;

  // Métodos de Gestão de Ativos
  updateAssets: (assets: AssetNode[]) => Promise<void>;

  // Métodos de Gestão de Ações
  addAction: (action: ActionRecord) => Promise<void>;
  updateAction: (action: ActionRecord) => Promise<void>;
  deleteAction: (id: string) => Promise<void>;

  // Métodos de Gestão de Gatilhos
  addTrigger: (trigger: TriggerRecord) => Promise<void>;
  updateTrigger: (trigger: TriggerRecord) => Promise<void>;
  deleteTrigger: (id: string) => Promise<void>;

  // Métodos de Gestão de Taxonomia
  updateTaxonomy: (taxonomy: TaxonomyConfig) => Promise<void>;

  // Utilitários
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
  const [useApi, setUseApi] = useState<boolean | null>(null);

  /**
   * Detecta se a API está disponível para definir o modo de operação (Backend vs Local).
   */
  useEffect(() => {
    const checkApi = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      try {
        const response = await fetch('/api/health', { signal: controller.signal });
        clearTimeout(timeoutId);
        if (response.ok) {
          console.log('Context: API disponível - Operando em modo conectado');
          setUseApi(true);
        } else {
          setUseApi(false);
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        console.log('Context: API indisponível - Utilizando LocalStorage (Modo Offline)');
        setUseApi(false);
      }
    };
    checkApi();
  }, []);

  /**
   * Recarrega todos os dados do sistema a partir da fonte ativa.
   */
  const refreshAll = useCallback(async () => {
    if (useApi === null) return;
    
    console.log('Sincronizando dados... (Modo API:', useApi, ')');
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
        setRecords(recs || []);
        setAssets(assts || []);
        setActions(acts || []);
        setTriggers(trigs || []);
        setTaxonomy(tax || emptyTaxonomy);
        console.log('Sincronização completa via API');
      } else {
        setRecords(storage.LEGACY_getRecords());
        setAssets(storage.LEGACY_getAssets());
        setActions(storage.LEGACY_getActions());
        setTriggers(storage.LEGACY_getTriggers());
        setTaxonomy(storage.LEGACY_getTaxonomy());
        console.log('Sincronização completa via LocalStorage');
      }
    } catch (error) {
      console.error('Erro ao sincronizar dados:', error);
      // Fallback de segurança para LocalStorage
      setRecords(storage.LEGACY_getRecords());
      setAssets(storage.LEGACY_getAssets());
      setActions(storage.LEGACY_getActions());
      setTriggers(storage.LEGACY_getTriggers());
      setTaxonomy(storage.LEGACY_getTaxonomy());
    } finally {
      setIsLoading(false);
    }
  }, [useApi]);

  useEffect(() => {
    if (useApi !== null) {
      refreshAll();
    }
  }, [useApi, refreshAll]);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      const isRelevantKey = event.key && (event.key.startsWith('rca_app_v1_') || event.key.startsWith('rca_'));
      if (isRelevantKey) {
        refreshAll();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [refreshAll]);

  // --- Funções de Mutação Granulares ---

  const addRecord = useCallback(async (record: RcaRecord): Promise<void> => {
    try {
      if (useApi) await api.saveRecordToApi(record, false);
      else storage.saveRecord(record);
      setRecords(prev => [...prev, record]);
    } catch (error) {
      console.error('Erro ao adicionar RCA:', error);
      await refreshAll();
      throw error;
    }
  }, [useApi, refreshAll]);

  const updateRecord = useCallback(async (record: RcaRecord): Promise<void> => {
    try {
      if (useApi) await api.saveRecordToApi(record, true);
      else storage.saveRecord(record);
      setRecords(prev => prev.map(r => r.id === record.id ? record : r));
    } catch (error) {
      console.error('Erro ao atualizar RCA:', error);
      await refreshAll();
      throw error;
    }
  }, [useApi, refreshAll]);

  const deleteRecord = useCallback(async (id: string): Promise<void> => {
    try {
      if (useApi) {
        await api.deleteRecordFromApi(id);
      } else {
        const current = storage.LEGACY_getRecords();
        storage.saveRecords(current.filter(r => r.id !== id));
      }
      setRecords(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error('Erro ao excluir RCA:', error);
      await refreshAll();
      throw error;
    }
  }, [useApi, refreshAll]);

  const addAction = useCallback(async (action: ActionRecord): Promise<void> => {
    try {
      if (useApi) await api.saveActionToApi(action, false);
      else storage.saveAction(action);
      setActions(prev => [...prev, action]);
    } catch (error) {
      console.error('Erro ao adicionar ação:', error);
      await refreshAll();
      throw error;
    }
  }, [useApi, refreshAll]);

  const updateAction = useCallback(async (action: ActionRecord): Promise<void> => {
    try {
      if (useApi) await api.saveActionToApi(action, true);
      else storage.saveAction(action);
      setActions(prev => prev.map(a => a.id === action.id ? action : a));
    } catch (error) {
      console.error('Erro ao atualizar ação:', error);
      await refreshAll();
      throw error;
    }
  }, [useApi, refreshAll]);

  const deleteAction = useCallback(async (id: string): Promise<void> => {
    try {
      if (useApi) {
        await api.deleteActionFromApi(id);
      } else {
        storage.deleteAction(id);
      }
      setActions(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error('Erro ao excluir ação:', error);
      await refreshAll();
      throw error;
    }
  }, [useApi, refreshAll]);

  const addTrigger = useCallback(async (trigger: TriggerRecord): Promise<void> => {
    try {
      if (useApi) await api.saveTriggerToApi(trigger, false);
      else storage.saveTrigger(trigger);
      setTriggers(prev => [...prev, trigger]);
    } catch (error) {
      console.error('Erro ao adicionar gatilho:', error);
      await refreshAll();
      throw error;
    }
  }, [useApi, refreshAll]);

  const updateTrigger = useCallback(async (trigger: TriggerRecord): Promise<void> => {
    try {
      if (useApi) await api.saveTriggerToApi(trigger, true);
      else storage.saveTrigger(trigger);
      setTriggers(prev => prev.map(t => t.id === trigger.id ? trigger : t));
    } catch (error) {
      console.error('Erro ao atualizar gatilho:', error);
      await refreshAll();
      throw error;
    }
  }, [useApi, refreshAll]);

  const deleteTrigger = useCallback(async (id: string): Promise<void> => {
    try {
      if (useApi) {
        await api.deleteTriggerFromApi(id);
      } else {
        storage.deleteTrigger(id);
      }
      setTriggers(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      console.error('Erro ao excluir gatilho:', error);
      await refreshAll();
      throw error;
    }
  }, [useApi, refreshAll]);

  const updateAssets = useCallback(async (newAssets: AssetNode[]): Promise<void> => {
    try {
      if (useApi) await api.importAssetsToApi(newAssets);
      else storage.saveAssets(newAssets);
      setAssets(newAssets);
    } catch (error) {
      console.error('Erro ao atualizar ativos:', error);
      await refreshAll();
      throw error;
    }
  }, [useApi, refreshAll]);

  const updateTaxonomy = useCallback(async (newTaxonomy: TaxonomyConfig): Promise<void> => {
    try {
      if (useApi) await api.saveTaxonomyToApi(newTaxonomy);
      else storage.saveTaxonomy(newTaxonomy);
      setTaxonomy(newTaxonomy);
    } catch (error) {
      console.error('Erro ao atualizar taxonomia:', error);
      await refreshAll();
      throw error;
    }
  }, [useApi, refreshAll]);

  const contextValue = useMemo(() => ({
    records, assets, actions, triggers, taxonomy, isLoading, useApi,
    addRecord, updateRecord, deleteRecord, updateAssets,
    addAction, updateAction, deleteAction,
    addTrigger, updateTrigger, deleteTrigger,
    updateTaxonomy, refreshAll, setUseApi
  }), [
    records, assets, actions, triggers, taxonomy, isLoading, useApi,
    addRecord, updateRecord, deleteRecord, updateAssets,
    addAction, updateAction, deleteAction,
    addTrigger, updateTrigger, deleteTrigger,
    updateTaxonomy, refreshAll
  ]);

  return (
    <RcaContext.Provider value={contextValue}>
      {children}
    </RcaContext.Provider>
  );
};

export const useRcaContext = () => {
  const context = useContext(RcaContext);
  if (context === undefined) {
    throw new Error('useRcaContext deve ser utilizado dentro de um RcaProvider');
  }
  return context;
};
