
import { useState, useEffect } from 'react';
import { ActionRecord } from '../types';
import { generateId } from '../services/storageService';
import { useRcaContext } from '../context/RcaContext';

// ViewModel includes resolved RCA name and context IDs for filtering
export interface ActionViewModel extends ActionRecord {
  rcaTitle: string;
  assetName: string;
  areaId: string;
  categoryId: string;
}

export const useActionsLogic = () => {
  const { actions: rawActions, records, addAction, updateAction, deleteAction } = useRcaContext();
  const [actions, setActions] = useState<ActionViewModel[]>([]);
  const [rcaList, setRcaList] = useState<{id: string, title: string}[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<ActionRecord | null>(null);

  // Load data and resolve relationships (ID -> Name)
  useEffect(() => {
    // Map RCA ID to Title for dropdown
    setRcaList(records.map(r => ({ id: r.id, title: r.what })));

    // Create ViewModel
    const resolvedActions: ActionViewModel[] = rawActions.map(a => {
      const rca = records.find(r => r.id === a.rca_id);
      return {
        ...a,
        rcaTitle: rca ? rca.what : 'Unknown Analysis',
        assetName: rca ? rca.asset_name_display || 'Unknown Asset' : '-',
        areaId: rca ? rca.area_id : '',
        categoryId: rca ? rca.failure_category_id : ''
      };
    });

    setActions(resolvedActions);
  }, [rawActions, records]);

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
    if (confirm('Delete this action plan?')) {
      deleteAction(id);
    }
  };

  const openNew = () => {
    setEditingAction(null);
    setIsModalOpen(true);
  };

  const openEdit = (action: ActionViewModel) => {
    // Strip ViewModel props to get back to Record
    const { rcaTitle, assetName, areaId, categoryId, ...record } = action;
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
    handleDelete
  };
};
