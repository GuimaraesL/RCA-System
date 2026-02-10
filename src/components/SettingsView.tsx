/**
 * Proposta: Vista de Configurações e Gestão da Taxonomia Global redimensionada com Sidebar Interna.
 * Fluxo: Utiliza um modelo de navegação lateral para gerenciar diferentes categorias de taxonomia e regras de validação, oferecendo feedback visual aprimorado e hierarquia clara.
 */

import React, { useState, useMemo } from 'react';
import { 
  Plus, Trash2, Edit2, Check, X, 
  Settings as SettingsIcon, Lock, 
  ClipboardList, Activity, Cpu, 
  ShieldCheck, ChevronRight, 
  ListTree, AlertCircle
} from 'lucide-react';
import { useSettingsLogic } from '../hooks/useSettingsLogic';
import { TaxonomyConfig, TaxonomyItem } from '../types';
import { ConfirmModal } from './ConfirmModal';
import { useLanguage } from '../context/LanguageDefinition';
import { MandatoryFieldSelector } from './MandatoryFieldSelector';

/**
 * Sub-componente interno para gestão individual de listas de taxonomia com UI moderna.
 */
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
  const [deleteData, setDeleteData] = useState<{ id: string, name: string } | null>(null); 

  const safeItems = Array.isArray(items) ? items : [];

  const handleAdd = () => {
    if (!newItemName.trim()) return;
    addItem(field, newItemName);
    setNewItemName('');
  };

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditValue(name);
  };

  const saveEdit = (id: string) => {
    if (!editValue.trim()) return;
    updateItem(field, id, editValue);
    setEditingId(null);
  };

  return (
    <div className="bg-white rounded-2xl shadow-soft border border-slate-100 flex flex-col h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-blue-100/50">
      <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/30">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</h3>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 p-4 custom-scrollbar">
        {safeItems.map((item) => (
          <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-xl group border border-slate-50 shadow-sm transition-all duration-200 hover:shadow-md hover:border-blue-100 hover:-translate-y-0.5">
            {editingId === item.id ? (
              <div className="flex-1 flex gap-2 items-center">
                <input
                  id={`editInput_${item.id}`}
                  name={`editInput_${item.id}`}
                  autoFocus
                  className="flex-1 border-2 border-blue-400 rounded-lg px-3 py-1.5 text-sm outline-none bg-white text-slate-900 shadow-sm"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveEdit(item.id)}
                  onKeyDownCapture={e => e.key === 'Escape' && setEditingId(null)}
                  aria-label={`${t('settings.editItemLabel') || 'Editar item'} - ${item.name}`}
                />
                <button type="button" aria-label={t('common.save')} onClick={() => saveEdit(item.id)} className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors shadow-sm"><Check size={16} /></button>
                <button type="button" aria-label={t('common.cancel')} onClick={() => setEditingId(null)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors shadow-sm"><X size={16} /></button>
              </div>
            ) : (
              <>
                <div className="flex flex-col">
                  <span className="text-sm text-slate-700 font-semibold group-hover:text-blue-700 transition-colors">{item.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5"><Lock size={8} /> {item.id}</span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                  <button type="button" aria-label={`${t('common.edit')} - ${item.name}`} onClick={() => startEdit(item.id, item.name)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit2 size={14} /></button>
                  <button type="button" aria-label={`${t('common.delete')} - ${item.name}`} onClick={() => setDeleteData({ id: item.id, name: item.name })} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={14} /></button>
                </div>
              </>
            )}
          </div>
        ))}
        {safeItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
            <AlertCircle size={24} className="mb-2 opacity-20" />
            <span className="text-xs italic font-medium">{t('settings.emptyList')}</span>
          </div>
        )}
      </div>

      <div className="p-4 bg-slate-50/50 border-t border-slate-100 mt-auto">
        <div className="flex gap-2">
          <input
            id={`newItemInput_${field}`}
            name={`newItemInput_${field}`}
            type="text"
            placeholder={t('settings.addItemPlaceholder')}
            aria-label={`${t('settings.addItemPlaceholder')} - ${title}`}
            className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
            value={newItemName}
            onChange={e => setNewItemName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newItemName.trim()}
            aria-label={`${t('settings.addItemButton')} - ${title}`}
            className="bg-blue-600 text-white p-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20 transition-all active:scale-95"
          >
            <Plus size={20} strokeWidth={2.5} />
          </button>
        </div>
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

type SettingsCategory = 'rca-taxonomy' | 'trigger-taxonomy' | 'components' | 'validation';

export const SettingsView: React.FC = () => {
  const { taxonomy, addItem, removeItem, updateItem, updateMandatoryConfig, isSaving } = useSettingsLogic();
  const { t } = useLanguage();

  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('rca-taxonomy');

  const categories = useMemo(() => [
    { id: 'rca-taxonomy', label: t('settings.categories.rcaTaxonomy') || 'Taxonomia RCA', icon: ClipboardList, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'trigger-taxonomy', label: t('settings.categories.triggerTaxonomy') || 'Taxonomia de Gatilhos', icon: Activity, color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'components', label: t('settings.categories.components') || 'Componentes', icon: Cpu, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { id: 'validation', label: t('settings.categories.validation') || 'Regras de Validação', icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ], [t]);

  if (!taxonomy) {
    return <div className="p-8 text-center text-slate-500 animate-pulse">{t('common.loading')}</div>;
  }

  // Definição das opções de campos para regras de obrigatoriedade
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
    { value: 'status', label: t('common.status') },
    { value: 'comments', label: t('fields.comments') }
  ];

  const handleMandatoryUpdate = (category: 'trigger' | 'rca', sub: string, newVal: string[]) => {
    const currentConfig = taxonomy.mandatoryFields || {
      trigger: { save: [] },
      rca: { create: [], conclude: [] }
    };

    const newConfig = {
      trigger: { ...currentConfig.trigger },
      rca: { ...currentConfig.rca }
    };

    if (category === 'trigger' && sub === 'save') newConfig.trigger.save = newVal;
    if (category === 'rca' && sub === 'create') newConfig.rca.create = newVal;
    if (category === 'rca' && sub === 'conclude') newConfig.rca.conclude = newVal;

    updateMandatoryConfig(newConfig);
  }

  const config = taxonomy.mandatoryFields || {
    trigger: { save: [] },
    rca: { create: [], conclude: [] }
  };

  const activeCategoryLabel = categories.find(c => c.id === activeCategory)?.label;

  return (
    <div className="h-full flex flex-col bg-page-gradient overflow-hidden">
      {/* Header Compacto */}
      <div className="px-8 py-6 flex items-center justify-between border-b border-slate-200/60 bg-white/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-blue-600 shadow-lg shadow-blue-600/20 rounded-xl text-white">
            <SettingsIcon size={22} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-800 font-display tracking-tight leading-tight">{t('settings.title')}</h1>
              {isSaving && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100 animate-pulse">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Salvando...</span>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium">{t('settings.description')}</p>
          </div>
        </div>
        
        {/* Breadcrumb Visual */}
        <div className="hidden md:flex items-center gap-2 text-sm text-slate-400 font-medium">
          <span>Configurações</span>
          <ChevronRight size={14} />
          <span className="text-blue-600">{activeCategoryLabel}</span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Interna */}
        <aside className="w-72 border-r border-slate-200/60 bg-white/40 backdrop-blur-sm p-6 flex flex-col gap-1 overflow-y-auto">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 px-3">Navegação</p>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as SettingsCategory)}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group ${
                activeCategory === cat.id 
                  ? `${cat.bg} ${cat.color} shadow-sm ring-1 ring-black/5 font-bold` 
                  : 'text-slate-500 hover:bg-white hover:text-slate-800'
              }`}
            >
              <div className={`p-1.5 rounded-lg transition-colors ${activeCategory === cat.id ? 'bg-white shadow-sm' : 'bg-slate-100 group-hover:bg-slate-200'}`}>
                <cat.icon size={18} />
              </div>
              <span className="text-sm truncate">{cat.label}</span>
              {activeCategory === cat.id && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-current" />
              )}
            </button>
          ))}

          <div className="mt-auto pt-6 border-t border-slate-200/60">
            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
              <div className="flex items-center gap-2 text-blue-700 mb-1">
                <ListTree size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Taxonomia</span>
              </div>
              <p className="text-[10px] text-blue-600/70 leading-relaxed font-medium">
                IDs de sistema são gerados automaticamente para garantir integridade.
              </p>
            </div>
          </div>
        </aside>

        {/* Área de Conteúdo Principal */}
        <main className="flex-1 overflow-y-auto bg-slate-50/30 custom-scrollbar">
          <div className="p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-right-4 duration-500">
            
            {activeCategory === 'rca-taxonomy' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 pb-12">
                <ListManager t={t} title={t('settings.analysisTypes')} field="analysisTypes" items={taxonomy.analysisTypes} addItem={addItem} removeItem={removeItem} updateItem={updateItem} />
                <ListManager t={t} title={t('settings.analysisStatuses')} field="analysisStatuses" items={taxonomy.analysisStatuses} addItem={addItem} removeItem={removeItem} updateItem={updateItem} />
                <ListManager t={t} title={t('settings.specialties')} field="specialties" items={taxonomy.specialties} addItem={addItem} removeItem={removeItem} updateItem={updateItem} />
                <ListManager t={t} title={t('settings.failureModes')} field="failureModes" items={taxonomy.failureModes} addItem={addItem} removeItem={removeItem} updateItem={updateItem} />
                <ListManager t={t} title={t('settings.failureCategories')} field="failureCategories" items={taxonomy.failureCategories} addItem={addItem} removeItem={removeItem} updateItem={updateItem} />
              </div>
            )}

            {activeCategory === 'trigger-taxonomy' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 pb-12">
                <ListManager t={t} title={t('settings.triggerStatuses')} field="triggerStatuses" items={taxonomy.triggerStatuses} addItem={addItem} removeItem={removeItem} updateItem={updateItem} />
                <ListManager t={t} title={t('settings.rootCauseMs')} field="rootCauseMs" items={taxonomy.rootCauseMs} addItem={addItem} removeItem={removeItem} updateItem={updateItem} />
              </div>
            )}

            {activeCategory === 'components' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 pb-12">
                <ListManager t={t} title={t('settings.componentTypes')} field="componentTypes" items={taxonomy.componentTypes} addItem={addItem} removeItem={removeItem} updateItem={updateItem} />
              </div>
            )}

            {activeCategory === 'validation' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 pb-12 items-start">
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
        </main>
      </div>
    </div>
  );
};