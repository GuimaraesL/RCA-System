
import { useState, useEffect } from 'react';
import { ActionRecord, AssetNode, ActionViewModel } from '../types';
import { generateId } from '../services/utils';
import { useRcaContext } from '../context/RcaContext';

// ViewModel includes resolved RCA name and context IDs for filtering

// Helper to find asset name recursively by ID
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

  // State para modal de confirmação de exclusão
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [actionToDelete, setActionToDelete] = useState<string | null>(null);

  // Load data and resolve relationships (ID -> Name)
  useEffect(() => {
    // Map RCA ID to Title for dropdown
    setRcaList(records.map(r => ({
      id: r.id,
      title: r.what || r.id // Fallback se 'what' estiver vazio
    })));

    // Create ViewModel
    const resolvedActions: ActionViewModel[] = rawActions.map(a => {
      const rca = records.find(r => r.id === a.rca_id);

      let assetName = 'Unknown Asset';
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
          // Fallback: try to resolve via ID from assets tree
          const targetId = rca.subgroup_id || rca.equipment_id || rca.area_id;
          if (targetId) {
            const resolved = findAssetNameById(assets, targetId);
            assetName = resolved || targetId;
          }
        }
      } else {
        assetName = '-';
      }

      // Pre-compute search context and date parts for optimized filtering
      const rcaTitle = rca ? (rca.what || 'Unknown Analysis') : 'Unknown Analysis';
      const aDate = new Date(a.date);
      const yearStr = isNaN(aDate.getTime()) ? '' : aDate.getFullYear().toString();
      const monthStr = isNaN(aDate.getTime()) ? '' : (aDate.getMonth() + 1).toString().padStart(2, '0');
      const searchContext = `${a.action || ''} ${a.responsible || ''} ${rcaTitle}`
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
    // Strip ViewModel props to get back to Record
    const { rcaTitle, assetName, areaId, equipmentId, subgroupId, categoryId, specialtyId, ...record } = action;
    setEditingAction(record);
    setIsModalOpen(true);
  };

  return {
    actions,
    rcaList,
    isModalOpen,
    setIsModalOpen,
    editingAction,
    openNew,
    openEdit,
    handleSave,
    handleDelete,
    // Estado para modal de confirmação
    deleteModalOpen,
    confirmDelete,
    cancelDelete
  };
};
