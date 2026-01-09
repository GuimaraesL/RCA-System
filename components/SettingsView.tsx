
import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, Settings as SettingsIcon, Lock } from 'lucide-react';
import { useSettingsLogic } from '../hooks/useSettingsLogic';
import { TaxonomyConfig, TaxonomyItem } from '../types';
import { ConfirmModal } from './ConfirmModal';

export const SettingsView: React.FC = () => {
  const { taxonomy, addItem, removeItem, updateItem } = useSettingsLogic();

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; field: keyof TaxonomyConfig | null; id: string | null; name: string }>({
    isOpen: false,
    field: null,
    id: null,
    name: ''
  });

  const ListManager: React.FC<{
    title: string;
    field: keyof TaxonomyConfig;
    items: TaxonomyItem[];
  }> = ({ title, field, items }) => {
    const [newItemName, setNewItemName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');

    const safeItems = items || [];

    const handleAdd = () => {
      addItem(field, newItemName);
      setNewItemName('');
    };

    const confirmRemove = (id: string, name: string) => {
      setDeleteModal({ isOpen: true, field, id, name });
    };

    const startEdit = (id: string, name: string) => {
      setEditingId(id);
      setEditValue(name);
    };

    const saveEdit = (id: string) => {
      updateItem(field, id, editValue);
      setEditingId(null);
    };

    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 flex flex-col h-full">
        <h3 className="text-sm font-bold text-slate-800 uppercase mb-4 pb-2 border-b">{title}</h3>

        <div className="flex-1 overflow-y-auto space-y-2 mb-4 max-h-60 custom-scrollbar">
          {safeItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-2 bg-slate-50 rounded group border border-transparent hover:border-slate-200">
              {editingId === item.id ? (
                <div className="flex-1 flex gap-2">
                  <input
                    autoFocus
                    className="flex-1 border border-blue-300 rounded px-2 py-1 text-sm outline-none bg-white text-slate-900"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                  />
                  <button onClick={() => saveEdit(item.id)} className="text-green-600 hover:text-green-700"><Check size={16} /></button>
                  <button onClick={() => setEditingId(null)} className="text-red-500 hover:text-red-600"><X size={16} /></button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col">
                    <span className="text-sm text-slate-700 font-medium">{item.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1"><Lock size={8} /> {item.id}</span>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEdit(item.id, item.name)} className="text-slate-400 hover:text-blue-600"><Edit2 size={14} /></button>
                    <button onClick={() => confirmRemove(item.id, item.name)} className="text-slate-400 hover:text-red-600"><Trash2 size={14} /></button>
                  </div>
                </>
              )}
            </div>
          ))}
          {safeItems.length === 0 && (
            <div className="text-xs text-slate-400 italic text-center py-4">No items defined.</div>
          )}
        </div>

        <div className="flex gap-2 mt-auto pt-2 border-t border-slate-100">
          <input
            type="text"
            placeholder="Add new item..."
            className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm outline-none bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500"
            value={newItemName}
            onChange={e => setNewItemName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button
            onClick={handleAdd}
            disabled={!newItemName.trim()}
            className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-slate-200 rounded-lg text-slate-700">
          <SettingsIcon size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">System Settings</h1>
          <p className="text-slate-500">Manage classification lists with unique System IDs.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
        <ListManager title="Analysis Types" field="analysisTypes" items={taxonomy.analysisTypes} />
        <ListManager title="Analysis Statuses" field="analysisStatuses" items={taxonomy.analysisStatuses} />
        <ListManager title="Trigger Statuses" field="triggerStatuses" items={taxonomy.triggerStatuses} />
        <ListManager title="Component Types" field="componentTypes" items={taxonomy.componentTypes} />
        <ListManager title="Specialties" field="specialties" items={taxonomy.specialties} />
        <ListManager title="Failure Modes" field="failureModes" items={taxonomy.failureModes} />
        <ListManager title="Failure Categories" field="failureCategories" items={taxonomy.failureCategories} />
        <ListManager title="Root Cause Ms (6M)" field="rootCauseMs" items={taxonomy.rootCauseMs} />
      </div>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Excluir Item"
        message={`Você tem certeza que deseja excluir "${deleteModal.name}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={() => {
          if (deleteModal.field && deleteModal.id) {
            removeItem(deleteModal.field, deleteModal.id);
          }
          setDeleteModal({ isOpen: false, field: null, id: null, name: '' });
        }}
        onCancel={() => setDeleteModal({ isOpen: false, field: null, id: null, name: '' })}
      />
    </div>
  );
};
