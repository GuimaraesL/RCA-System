
import { useState, useEffect } from 'react';
import { ActionRecord, AssetNode } from '../types';
import { generateId } from '../services/utils';
import { useRcaContext } from '../context/RcaContext';

// ViewModel includes resolved RCA name and context IDs for filtering
export interface ActionViewModel extends ActionRecord {
  rcaTitle: string;
  assetName: string;
  areaId: string;
  equipmentId: string;
  subgroupId: string;
  categoryId: string;
  specialtyId: string; // Added for dynamic filtering
}

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

      return {
        ...a,
        rcaTitle: rca ? rca.what : 'Unknown Analysis',
        assetName: assetName,
        areaId,
        equipmentId,
        subgroupId,
        categoryId,
        specialtyId
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
