/**
 * Proposta: Hook para gerenciamento da lógica de Planos de Ação (CAPA).
 * Fluxo: Transforma dados brutos do banco em ViewModels enriquecidos (resolvendo IDs de RCA e Ativos em nomes legíveis), provê suporte a buscas normalizadas e gerencia o estado dos modais de edição e exclusão.
 */

import { useState, useEffect } from 'react';
import { ActionRecord, AssetNode, ActionViewModel } from '../types';
import { generateId } from '../services/utils';
import { useRcaContext } from '../context/RcaContext';

/**
 * Busca recursivamente o nome de um ativo na árvore de ativos a partir de seu ID.
 */
const findAssetNameById = (nodes: AssetNode[], id: string): string | undefined => {
  for (const node of nodes) {
    if (node.id === id) return node.name;
    if (node.children) {
      const found = findAssetNameById(node.children, id);
      if (found) return found;
    }
  }
  return undefined;
};

export const useActionsLogic = () => {
  const { actions: rawActions, records, assets, addAction, updateAction, deleteAction } = useRcaContext();
  const [actions, setActions] = useState<ActionViewModel[]>([]);
  const [rcaList, setRcaList] = useState<{ id: string, title: string }[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<ActionRecord | null>(null);

  // Estado para o modal de confirmação de exclusão
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [actionToDelete, setActionToDelete] = useState<string | null>(null);

  /**
   * Efeito de orquestração: Resolve relacionamentos (ID -> Nome) e pré-calcula contextos de busca e data.
   */
  useEffect(() => {
    // Mapeia IDs de RCA para títulos para uso em seletores (dropdowns)
    setRcaList(records.map(r => ({
      id: r.id,
      title: r.what || r.id
    })));

    // Criação do ViewModel (Dados enriquecidos para a interface)
    const resolvedActions: ActionViewModel[] = rawActions.map(a => {
      const rca = records.find(r => r.id === a.rca_id);

      let assetName = '-';
      let areaId = '';
      let equipmentId = '';
      let subgroupId = '';
      let categoryId = '';
      let specialtyId = '';

      if (rca) {
        areaId = rca.area_id || '';
        equipmentId = rca.equipment_id || '';
        subgroupId = rca.subgroup_id || '';
        categoryId = rca.failure_category_id || '';
        specialtyId = rca.specialty_id || '';

        if (rca.asset_name_display) {
          assetName = rca.asset_name_display;
        } else {
          // Fallback: tenta resolução via ID na árvore de ativos
          const targetId = rca.subgroup_id || rca.equipment_id || rca.area_id;
          if (targetId) {
            const resolved = findAssetNameById(assets, targetId);
            assetName = resolved || targetId;
          }
        }
      }

      // Pré-computa contexto de busca e partes da data para filtragem otimizada O(1)
      const rcaTitle = rca ? (rca.what || 'Análise Desconhecida') : 'Análise Desconhecida';
      const aDate = new Date(a.date);
      const yearStr = isNaN(aDate.getTime()) ? '' : aDate.getFullYear().toString();
      const monthStr = isNaN(aDate.getTime()) ? '' : (aDate.getMonth() + 1).toString().padStart(2, '0');

      // Normalização de texto para busca insensível a acentos e caixa alta (Issue #106)
      const searchContext = `${a.action || ''} ${a.responsible || ''} ${rcaTitle} ${a.moc_number || ''} ${assetName} ${a.date || ''}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      return {
        ...a,
        rcaTitle,
        assetName: assetName,
        areaId,
        equipmentId,
        subgroupId,
        categoryId,
        specialtyId,
        searchContext,
        yearStr,
        monthStr
      };
    });

    setActions(resolvedActions);
  }, [rawActions, records, assets]);

  const handleSave = (action: ActionRecord) => {
    if (!action.id) action.id = generateId('ACT');

    if (editingAction) {
      updateAction(action);
    } else {
      addAction(action);
    }

    setIsModalOpen(false);
    setEditingAction(null);
  };

  const handleDelete = (id: string) => {
    setActionToDelete(id);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (actionToDelete) {
      deleteAction(actionToDelete);
    }
    setDeleteModalOpen(false);
    setActionToDelete(null);
  };

  const cancelDelete = () => {
    setDeleteModalOpen(false);
    setActionToDelete(null);
  };

  const openNew = () => {
    setEditingAction(null);
    setIsModalOpen(true);
  };

  const openEdit = (action: ActionViewModel) => {
    // Remove propriedades de ViewModel para retornar ao formato de registro base (Record)
    const { rcaTitle, assetName, areaId, equipmentId, subgroupId, categoryId, specialtyId, ...record } = action;
    setEditingAction(record);
    setIsModalOpen(true);
  };

  return {
    actions, rcaList, isModalOpen, setIsModalOpen, editingAction,
    openNew, openEdit, handleSave, handleDelete,
    deleteModalOpen, confirmDelete, cancelDelete
  };
};