
import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, Settings as SettingsIcon, Lock } from 'lucide-react';
import { useSettingsLogic } from '../hooks/useSettingsLogic';
import { TaxonomyConfig, TaxonomyItem } from '../types';
import { ConfirmModal } from './ConfirmModal';
import { useLanguage } from '../context/LanguageDefinition';
import { MandatoryFieldSelector } from './MandatoryFieldSelector';


// Sub-component defined outside to prevent re-creation on every render
const ListManager: React.FC<{
  title: string;
  field: keyof TaxonomyConfig;
  items: TaxonomyItem[];
  addItem: (field: keyof TaxonomyConfig, name: string) => void;
  removeItem: (field: keyof TaxonomyConfig, id: string) => void;
  updateItem: (field: keyof TaxonomyConfig, id: string, name: string) => void;
  t: (key: string) => string;
}> = ({ title, field, items, addItem, removeItem, updateItem, t }) => {
  const [newItemName, setNewItemName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deleteData, setDeleteData] = useState<{ id: string, name: string } | null>(null); // Local delete state

  const safeItems = Array.isArray(items) ? items : [];

  const handleAdd = () => {
    addItem(field, newItemName);
    setNewItemName('');
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
    <div className="bg-white rounded-xl shadow-soft border border-slate-100 p-6 flex flex-col h-full transition-all duration-300 hover:shadow-lg">
      <h3 className="text-sm font-bold text-slate-800 uppercase mb-5 pb-2 border-b border-slate-100 font-display tracking-wider">{title}</h3>

      <div className="flex-1 overflow-y-auto space-y-3 mb-4 max-h-60 custom-scrollbar pr-1">
        {safeItems.map((item) => (
          <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-lg group border border-slate-100 shadow-sm transition-all duration-200 hover:shadow-md hover:border-blue-100 hover:-translate-y-0.5">
            {editingId === item.id ? (
              <div className="flex-1 flex gap-2 items-center">
                <input
                  id={`editInput_${item.id}`}
                  name={`editInput_${item.id}`}
                  autoFocus
                  className="flex-1 border-2 border-blue-400 rounded-md px-3 py-1.5 text-sm outline-none bg-white text-slate-900 shadow-sm"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  aria-label={`${t('settings.editItemLabel') || 'Editar item'} - ${item.name}`}
                />
                <button aria-label={t('common.save')} onClick={() => saveEdit(item.id)} className="p-1.5 bg-green-50 text-green-600 rounded-md hover:bg-green-100 transition-colors"><Check size={16} /></button>
                <button aria-label={t('common.cancel')} onClick={() => setEditingId(null)} className="p-1.5 bg-red-50 text-red-500 rounded-md hover:bg-red-100 transition-colors"><X size={16} /></button>
              </div>
            ) : (
              <>
                <div className="flex flex-col">
                  <span className="text-sm text-slate-700 font-semibold group-hover:text-blue-700 transition-colors">{item.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5"><Lock size={8} /> {item.id}</span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button aria-label={`${t('common.edit')} - ${item.name}`} onClick={() => startEdit(item.id, item.name)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"><Edit2 size={15} /></button>
                  <button aria-label={`${t('common.delete')} - ${item.name}`} onClick={() => setDeleteData({ id: item.id, name: item.name })} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"><Trash2 size={15} /></button>
                </div>
              </>
            )}
          </div>
        ))}
        {safeItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-slate-400 border-2 border-dashed border-slate-100 rounded-lg bg-slate-50/50">
            <span className="text-xs italic">{t('settings.emptyList')}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-auto pt-4 border-t border-slate-50">
        <input
          id={`newItemInput_${field}`}
          name={`newItemInput_${field}`}
          type="text"
          placeholder={t('settings.addItemPlaceholder')}
          aria-label={`${t('settings.addItemPlaceholder')} - ${title}`}
          className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
          value={newItemName}
          onChange={e => setNewItemName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button
          onClick={handleAdd}
          disabled={!newItemName.trim()}
          aria-label={`${t('settings.addItemButton')} - ${title}`}
          className="bg-blue-600 text-white p-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-200 transition-all active:scale-95"
        >
          <Plus size={18} />
        </button>
      </div>

      <ConfirmModal
        isOpen={!!deleteData}
        title={t('settings.deleteItemTitle')}
        message={deleteData ? t('settings.deleteItemMessage').replace('{0}', deleteData.name) : ''}
        confirmText={t('modals.confirm')}
        cancelText={t('modals.cancel')}
        variant="danger"
        onConfirm={() => {
          if (deleteData) {
            removeItem(field, deleteData.id);
            setDeleteData(null);
          }
        }}
        onCancel={() => setDeleteData(null)}
      />
    </div>
  );
};

export const SettingsView: React.FC = () => {
  const { taxonomy, addItem, removeItem, updateItem, updateMandatoryConfig } = useSettingsLogic();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'taxonomy' | 'validation'>('taxonomy');

  if (!taxonomy) {
    return <div className="p-8 text-center text-slate-500 animate-pulse">{t('common.loading')}</div>;
  }

  // Define Fields Options
  const rcaFields = [
    { value: 'what', label: t('fields.what') },
    { value: 'analysis_type', label: t('fields.analysisType') },
    { value: 'failure_date', label: t('fields.failureDate') },
    { value: 'subgroup_id', label: t('fields.locationSubgroup') },
    { value: 'component_type', label: t('fields.componentType') },
    { value: 'who', label: t('fields.who') },
    { value: 'when', label: t('fields.when') },
    { value: 'where_description', label: t('fields.whereDescription') },
    { value: 'problem_description', label: t('fields.problemDescription') },
    { value: 'specialty_id', label: t('fields.specialty') },
    { value: 'failure_mode_id', label: t('fields.failureMode') },
    { value: 'failure_category_id', label: t('fields.failureCategory') },
    { value: 'participants', label: t('fields.participants') }
  ];

  const rcaConclusionFields = [
    ...rcaFields,
    { value: 'root_causes', label: t('fields.rootCauses') },
    { value: 'five_whys', label: t('fields.fiveWhys') },
    { value: 'ishikawa', label: t('fields.ishikawa') },
    { value: 'actions', label: t('fields.actions') }
  ];

  const triggerFields = [
    { value: 'area_id', label: t('fields.area') },
    { value: 'equipment_id', label: t('fields.equipment') },
    { value: 'subgroup_id', label: t('fields.subgroup') },
    { value: 'start_date', label: t('fields.startDate') },
    { value: 'end_date', label: t('fields.endDate') },
    { value: 'stop_type', label: t('fields.stopType') },
    { value: 'stop_reason', label: t('fields.stopReason') },
    { value: 'analysis_type_id', label: t('fields.analysisTypeIndicated') },
    { value: 'responsible', label: t('fields.responsible') },
    { value: 'comments', label: t('fields.comments') }
  ];

  const handleMandatoryUpdate = (category: 'trigger' | 'rca', sub: string, newVal: string[]) => {
    const currentConfig = taxonomy.mandatoryFields || {
      trigger: { save: [] },
      rca: { create: [], conclude: [] }
    };

    // Deep clone sub-objects to guarantee React re-renders correctly
    const newConfig = {
      trigger: { ...currentConfig.trigger },
      rca: { ...currentConfig.rca }
    };

    if (category === 'trigger' && sub === 'save') newConfig.trigger.save = newVal;
    if (category === 'rca' && sub === 'create') newConfig.rca.create = newVal;
    if (category === 'rca' && sub === 'conclude') newConfig.rca.conclude = newVal;

    updateMandatoryConfig(newConfig);
  }

  // Ensure config exists
  const config = taxonomy.mandatoryFields || {
    trigger: { save: [] },
    rca: { create: [], conclude: [] }
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto h-full flex flex-col animate-in fade-in bg-page-gradient min-h-screen">
      <div className="flex items-center gap-4 mb-10">
        <div className="p-3 bg-white shadow-soft rounded-2xl text-blue-600 ring-1 ring-slate-100">
          <SettingsIcon size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-800 font-display tracking-tight">{t('settings.title')}</h1>
          <p className="text-slate-500 mt-1">{t('settings.description')}</p>
        </div>
      </div>

      {/* Modern Tabs */}
      <div className="flex bg-slate-100/80 p-1.5 rounded-xl w-fit mb-8 shadow-inner self-start">
        <button
          onClick={() => setActiveTab('taxonomy')}
          className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${activeTab === 'taxonomy' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}
        >
          {t('settings.tabs.general')}
        </button>
        <button
          onClick={() => setActiveTab('validation')}
          className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${activeTab === 'validation' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}
        >
          {t('settings.tabs.validation')}
        </button>
      </div>

      {activeTab === 'taxonomy' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
          <ListManager t={t} title={t('settings.analysisTypes')} field="analysisTypes" items={taxonomy.analysisTypes} addItem={addItem} removeItem={removeItem} updateItem={updateItem} />
          <ListManager t={t} title={t('settings.analysisStatuses')} field="analysisStatuses" items={taxonomy.analysisStatuses} addItem={addItem} removeItem={removeItem} updateItem={updateItem} />
          <ListManager t={t} title={t('settings.triggerStatuses')} field="triggerStatuses" items={taxonomy.triggerStatuses} addItem={addItem} removeItem={removeItem} updateItem={updateItem} />
          <ListManager t={t} title={t('settings.componentTypes')} field="componentTypes" items={taxonomy.componentTypes} addItem={addItem} removeItem={removeItem} updateItem={updateItem} />
          <ListManager t={t} title={t('settings.specialties')} field="specialties" items={taxonomy.specialties} addItem={addItem} removeItem={removeItem} updateItem={updateItem} />
          <ListManager t={t} title={t('settings.failureModes')} field="failureModes" items={taxonomy.failureModes} addItem={addItem} removeItem={removeItem} updateItem={updateItem} />
          <ListManager t={t} title={t('settings.failureCategories')} field="failureCategories" items={taxonomy.failureCategories} addItem={addItem} removeItem={removeItem} updateItem={updateItem} />
          <ListManager t={t} title={t('settings.rootCauseMs')} field="rootCauseMs" items={taxonomy.rootCauseMs} addItem={addItem} removeItem={removeItem} updateItem={updateItem} />
        </div>
      )}

      {activeTab === 'validation' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
          <MandatoryFieldSelector
            title={t('settings.validation.rcaSaveTitle')}
            description={t('settings.validation.rcaSaveDesc')}
            availableFields={rcaFields}
            selectedFields={config.rca.create}
            onChange={(val) => handleMandatoryUpdate('rca', 'create', val)}
          />
          <MandatoryFieldSelector
            title={t('settings.validation.rcaConcludeTitle')}
            description={t('settings.validation.rcaConcludeDesc')}
            availableFields={rcaConclusionFields}
            selectedFields={config.rca.conclude}
            onChange={(val) => handleMandatoryUpdate('rca', 'conclude', val)}
          />
          <MandatoryFieldSelector
            title={t('settings.validation.triggersTitle')}
            description={t('settings.validation.triggersDesc')}
            availableFields={triggerFields}
            selectedFields={config.trigger.save}
            onChange={(val) => handleMandatoryUpdate('trigger', 'save', val)}
          />
        </div>
      )}
    </div>
  );
};
