/**
 * Proposta: Contexto global de estado e orquestração de dados do sistema.
 * Fluxo: Centraliza o acesso a RCAs, Ativos, Ações e Gatilhos, gerenciando a alternância automática entre a API (Backend) e o LocalStorage (Modo Offline/Legado) conforme a disponibilidade do servidor.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
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
  useApi: boolean;

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
        const response = await fetch('/api/health', {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (response.ok) {
          console.log('Context: API disponível - Operando em modo conectado');
          setUseApi(true);
        } else {
          setUseApi(false);
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        console.log('Context: API indisponível - Utilizando LocalStorage (Modo Offline)', err.name === 'AbortError' ? '(Timeout)' : '');
        setUseApi(false);
      }
    };
    checkApi();
  }, []);

  /**
   * Recarrega todos os dados do sistema a partir da fonte ativa.
   */
  const refreshAll = useCallback(async () => {
    console.log('Sincronizando dados... (Modo API:', useApi, ')');
    setIsLoading(true);
    try {
      if (useApi === null) {
        setIsLoading(false);
        return;
      }

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
      // Fallback de segurança para LocalStorage em caso de falha na carga da API
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
    refreshAll();
  }, [refreshAll]);

  /**
   * Listener para sincronização entre abas (Storage Event).
   * Garante que alterações no LocalStorage em outras abas reflitam imediatamente no estado atual.
   */
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      // Verifica se a mudança ocorreu em chaves relevantes para o sistema (prefixo padronizado ou legadas)
      const isRelevantKey = event.key && (event.key.startsWith('rca_app_v1_') || event.key.startsWith('rca_'));

      if (isRelevantKey) {
        console.log('Storage alterado externamente (outra aba). Sincronizando...', event.key);
        refreshAll();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [refreshAll]);

  // --- Wrappers de Persistência para Análises ---

  const addRecord = async (record: RcaRecord): Promise<void> => {
    console.log('Contexto: Adicionando RCA...', record.id);
    try {
      if (useApi) {
        await api.saveRecordToApi(record, false);
      } else {
        storage.saveRecord(record);
      }
      await refreshAll();
    } catch (error) {
      console.error('Erro ao adicionar RCA:', error);
      throw error;
    }
  };

  const updateRecord = async (record: RcaRecord): Promise<void> => {
    console.log('Contexto: Atualizando RCA...', record.id);
    try {
      if (useApi) {
        await api.saveRecordToApi(record, true);
      } else {
        storage.saveRecord(record);
      }
      await refreshAll();
    } catch (error) {
      console.error('Erro ao atualizar RCA:', error);
      throw error;
    }
  };

  const deleteRecord = async (id: string): Promise<void> => {
    console.log('Contexto: Excluindo RCA...', id);
    try {
      if (useApi) {
        await api.deleteRecordFromApi(id);
      } else {
        const newRecords = records.filter(r => r.id !== id);
        storage.saveRecords(newRecords);
      }
      await refreshAll();
    } catch (error) {
      console.error('Erro ao excluir RCA:', error);
      throw error;
    }
  };

  // --- Wrappers para Ativos ---

  const updateAssets = async (newAssets: AssetNode[]): Promise<void> => {
    console.log('Contexto: Atualizando árvore de ativos...');
    try {
      if (useApi) {
        await api.importAssetsToApi(newAssets);
      } else {
        storage.saveAssets(newAssets);
      }
      setAssets(newAssets);
    } catch (error) {
      console.error('Erro ao atualizar ativos:', error);
      throw error;
    }
  };

  // --- Wrappers para Planos de Ação ---

  const addAction = async (action: ActionRecord): Promise<void> => {
    console.log('Contexto: Adicionando ação...', action.id);
    try {
      if (useApi) {
        await api.saveActionToApi(action, false);
      } else {
        storage.saveAction(action);
      }
      await refreshAll();
    } catch (error) {
      console.error('Erro ao adicionar ação:', error);
      throw error;
    }
  };

  const updateAction = async (action: ActionRecord): Promise<void> => {
    try {
      if (useApi) {
        await api.saveActionToApi(action, true);
      } else {
        storage.saveAction(action);
      }
      await refreshAll();
    } catch (error) {
      console.error('Erro ao atualizar ação:', error);
      throw error;
    }
  };

  const deleteActionInternal = async (id: string): Promise<void> => {
    console.log('Contexto: Excluindo ação...', id);
    try {
      if (useApi) {
        await api.deleteActionFromApi(id);
      } else {
        storage.deleteAction(id);
      }
      await refreshAll();
    } catch (error) {
      console.error('Erro ao excluir ação:', error);
      throw error;
    }
  };

  // --- Wrappers para Gatilhos ---

  const addTrigger = async (trigger: TriggerRecord): Promise<void> => {
    console.log('Contexto: Adicionando gatilho...', trigger.id);
    try {
      if (useApi) {
        await api.saveTriggerToApi(trigger, false);
      } else {
        storage.saveTrigger(trigger);
      }
      await refreshAll();
    } catch (error) {
      console.error('Erro ao adicionar gatilho:', error);
      throw error;
    }
  };

  const updateTrigger = async (trigger: TriggerRecord): Promise<void> => {
    console.log('Contexto: Atualizando gatilho...', trigger.id);
    try {
      if (useApi) {
        await api.saveTriggerToApi(trigger, true);
      } else {
        storage.saveTrigger(trigger);
      }
      await refreshAll();
    } catch (error) {
      console.error('Erro ao atualizar gatilho:', error);
      throw error;
    }
  };

  const deleteTriggerInternal = async (id: string): Promise<void> => {
    console.log('Contexto: Excluindo gatilho...', id);
    try {
      if (useApi) {
        await api.deleteTriggerFromApi(id);
      } else {
        storage.deleteTrigger(id);
      }
      await refreshAll();
    } catch (error) {
      console.error('Erro ao excluir gatilho:', error);
      throw error;
    }
  };

  // --- Wrappers para Taxonomia ---

  const updateTaxonomyInternal = async (newTaxonomy: TaxonomyConfig): Promise<void> => {
    console.log('Contexto: Atualizando configurações de taxonomia...');
    try {
      if (useApi) {
        await api.saveTaxonomyToApi(newTaxonomy);
      } else {
        storage.saveTaxonomy(newTaxonomy);
      }
      setTaxonomy(newTaxonomy);
    } catch (error) {
      console.error('Erro ao atualizar taxonomia:', error);
      throw error;
    }
  };

  const contextValue = React.useMemo(() => ({
    records, assets, actions, triggers, taxonomy, isLoading, useApi,
    addRecord, updateRecord, deleteRecord, updateAssets,
    addAction, updateAction, deleteAction: deleteActionInternal,
    addTrigger, updateTrigger, deleteTrigger: deleteTriggerInternal,
    updateTaxonomy: updateTaxonomyInternal,
    refreshAll, setUseApi
  }), [records, assets, actions, triggers, taxonomy, isLoading, useApi, refreshAll]);

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
