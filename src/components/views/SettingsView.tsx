/**
 * Proposta: Vista de Configurações e Gestão da Taxonomia Global redimensionada com Sidebar Interna.
 * Fluxo: Utiliza um modelo de navegação lateral para gerenciar diferentes categorias de taxonomia e regras de validação, oferecendo feedback visual aprimorado e hierarquia clara.
 */

import React, { useState, useMemo, useId } from 'react';
import {
  Plus, Trash2, Edit2, Check, X,
  Settings as SettingsIcon, Lock,
  ClipboardList, Activity, Cpu,
  ShieldCheck, ChevronRight,
  ListTree, AlertCircle
} from 'lucide-react';
import { useSettingsLogic } from '../../hooks/useSettingsLogic';
import { TaxonomyConfig, TaxonomyItem } from '../../types';
import { ConfirmModal } from '../modals/ConfirmModal';
import { useLanguage } from '../../context/LanguageDefinition';
import { MandatoryFieldSelector } from '../selectors/MandatoryFieldSelector';

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
  const idPrefix = useId();

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
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200/60 dark:border-slate-700 flex flex-col h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-200 dark:hover:border-blue-800">
      <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
        <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{title}</h3>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 p-6 custom-scrollbar">
        {safeItems.map((item) => (
          <div key={item.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl group border border-slate-100 dark:border-slate-700 shadow-sm transition-all duration-200 hover:shadow-md hover:border-blue-100 dark:hover:border-blue-800 hover:-translate-y-0.5">
            {editingId === item.id ? (
              <div className="flex-1 flex gap-3 items-center">
                <input
                  id={`${idPrefix}-edit-${item.id}`}
                  name={`editInput_${item.id}`}
                  autoFocus
                  className="flex-1 border-2 border-blue-400 rounded-xl px-4 py-2 text-sm outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-bold"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveEdit(item.id)}
                  onKeyDownCapture={e => e.key === 'Escape' && setEditingId(null)}
                  aria-label={`${t('settings.editItemLabel')} - ${item.name}`}
                />
                <button type="button" aria-label={t('common.save')} onClick={() => saveEdit(item.id)} className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors shadow-sm"><Check size={18} strokeWidth={3} /></button>
                <button type="button" aria-label={t('common.cancel')} onClick={() => setEditingId(null)} className="p-2.5 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition-colors shadow-sm"><X size={18} strokeWidth={3} /></button>
              </div>
            ) : (
              <>
                <div className="flex flex-col">
                  <span className="text-sm text-slate-700 dark:text-slate-200 font-bold group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">{item.name}</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono flex items-center gap-1.5 mt-1 font-bold"><Lock size={10} className="opacity-50" /> {item.id}</span>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                  <button type="button" aria-label={`${t('common.edit')} - ${item.name}`} onClick={() => startEdit(item.id, item.name)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Edit2 size={16} /></button>
                  <button type="button" aria-label={`${t('common.delete')} - ${item.name}`} onClick={() => setDeleteData({ id: item.id, name: item.name })} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={16} /></button>
                </div>
              </>
            )}
          </div>
        ))}
        {safeItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-300 dark:text-slate-600 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2rem] bg-slate-50/30 dark:bg-slate-800/30">
            <AlertCircle size={32} className="mb-4 opacity-20" />
            <span className="text-xs font-black uppercase tracking-widest">{t('settings.emptyList')}</span>
          </div>
        )}
      </div>

      <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 mt-auto">
        <div className="flex gap-3">
          <input
            id={`${idPrefix}-new-item`}
            name={`newItemInput_${field}`}
            type="text"
            placeholder={t('settings.addItemPlaceholder')}
            aria-label={`${t('settings.addItemPlaceholder')} - ${title}`}
            className="flex-1 border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-3 text-sm outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm font-bold"
            value={newItemName}
            onChange={e => setNewItemName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newItemName.trim()}
            aria-label={`${t('settings.addItemButton')} - ${title}`}
            className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20 transition-all active:scale-95"
          >
            <Plus size={24} strokeWidth={3} />
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
    { id: 'rca-taxonomy', label: t('settings.categories.rcaTaxonomy'), icon: ClipboardList, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'trigger-taxonomy', label: t('settings.categories.triggerTaxonomy'), icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'components', label: t('settings.categories.components'), icon: Cpu, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { id: 'validation', label: t('settings.categories.validation'), icon: ShieldCheck, color: 'text-blue-600', bg: 'bg-blue-50' },
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
    { value: 'participants', label: t('fields.participants') },
    // Novos campos (Issue #67)
    { value: 'os_number', label: t('wizard.step1.osNumber') },
    { value: 'facilitator', label: t('wizard.step1.facilitator') },
    { value: 'start_date', label: t('wizard.step1.startDate') },
    { value: 'completion_date', label: t('wizard.step1.completionDate') },
    { value: 'analysis_duration_minutes', label: t('wizard.step1.analysisDuration') },
    { value: 'downtime_minutes', label: t('wizard.step3.downtimeMinutes') },
    { value: 'financial_impact', label: t('wizard.step3.financialImpact') },
    { value: 'potential_impacts', label: t('wizard.step2.potentialImpacts') },
    { value: 'quality_impacts', label: t('wizard.step2.qualityImpacts') },
    { value: 'lessons_learned', label: t('wizard.step7.lessonsLearned') },
    { value: 'precision_maintenance', label: t('wizard.step6.title') }
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
    <div className="h-full flex flex-col bg-slate-50/50 dark:bg-slate-950/50 overflow-hidden">
      {/* Header Compacto */}
      <div className="px-10 py-8 flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
        <div className="flex items-center gap-5">
          <div className="p-3 bg-blue-600 shadow-xl shadow-blue-600/20 rounded-2xl text-white">
            <SettingsIcon size={26} />
          </div>
          <div>
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white font-display tracking-tight leading-tight uppercase italic">{t('settings.title')}</h1>
              {isSaving && (
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full border border-blue-100 animate-pulse">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" />
                  <span className="text-[10px] font-black uppercase tracking-widest">{t('settings.syncing')}</span>
                </div>
              )}
            </div>
            <p className="text-sm text-slate-400 font-bold mt-1 uppercase tracking-tight">{t('settings.description')}</p>
          </div>
        </div>

        {/* Breadcrumb Visual */}
        <div className="hidden md:flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          <span className="opacity-50">{t('settings.title')}</span>
          <ChevronRight size={14} className="text-slate-300" />
          <span className="text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">{activeCategoryLabel}</span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Interna */}
        <aside className="w-80 border-r border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 flex flex-col gap-2 overflow-y-auto custom-scrollbar">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 px-4">{t('settings.systemMenu')}</p>
          <div className="space-y-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as SettingsCategory)}
                className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group ${activeCategory === cat.id
                  ? `${cat.bg} ${cat.color} shadow-lg shadow-blue-500/5 ring-1 ring-black/5 font-black scale-[1.02]`
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
              >
                <div className={`p-2 rounded-xl transition-colors ${activeCategory === cat.id ? 'bg-white dark:bg-slate-800 shadow-sm' : 'bg-slate-100 dark:bg-slate-800/50 group-hover:bg-white dark:group-hover:bg-slate-800 group-hover:shadow-sm'}`}>
                  <cat.icon size={20} strokeWidth={2.5} />
                </div>
                <span className={`text-sm truncate uppercase tracking-tight ${activeCategory !== cat.id ? 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white' : ''}`}>{cat.label}</span>
                {activeCategory === cat.id && (
                  <div className="ml-auto w-2 h-2 rounded-full bg-current shadow-[0_0_8px_currentColor]" />
                )}
              </button>
            ))}
          </div>

          <div className="mt-auto pt-8 border-t border-slate-100 dark:border-slate-800">
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-200/60 dark:border-slate-700 relative overflow-hidden group">
              <div className="flex items-center gap-3 text-slate-700 mb-2 relative z-10">
                <ListTree size={20} className="text-blue-600" />
                <span className="text-xs font-black uppercase tracking-widest">{t('settings.taxonomy') || 'Taxonomy'}</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed font-bold relative z-10">
                {t('settings.taxonomyIntegrity')}
              </p>
              <div className="absolute -right-4 -bottom-4 w-20 h-24 bg-blue-100/50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
            </div>
          </div>
        </aside>

        {/* Área de Conteúdo Principal */}
        <main className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50 custom-scrollbar">
          <div className="p-10 lg:p-16 max-w-7xl mx-auto animate-in fade-in slide-in-from-right-4 duration-700">

            {(activeCategory === 'rca-taxonomy' || activeCategory === 'trigger-taxonomy' || activeCategory === 'components') && (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 pb-20">
                {activeCategory === 'rca-taxonomy' && (
                  <>
                    <ListManager t={t} title={t('settings.analysisTypes')} field="analysisTypes" items={taxonomy.analysisTypes} addItem={addItem} removeItem={removeItem} updateItem={updateItem} />
                    <ListManager t={t} title={t('settings.analysisStatuses')} field="analysisStatuses" items={taxonomy.analysisStatuses} addItem={addItem} removeItem={removeItem} updateItem={updateItem} />
                    <ListManager t={t} title={t('settings.specialties')} field="specialties" items={taxonomy.specialties} addItem={addItem} removeItem={removeItem} updateItem={updateItem} />
                    <ListManager t={t} title={t('settings.failureModes')} field="failureModes" items={taxonomy.failureModes} addItem={addItem} removeItem={removeItem} updateItem={updateItem} />
                    <ListManager t={t} title={t('settings.failureCategories')} field="failureCategories" items={taxonomy.failureCategories} addItem={addItem} removeItem={removeItem} updateItem={updateItem} />
                  </>
                )}

                {activeCategory === 'trigger-taxonomy' && (
                  <>
                    <ListManager t={t} title={t('settings.triggerStatuses')} field="triggerStatuses" items={taxonomy.triggerStatuses} addItem={addItem} removeItem={removeItem} updateItem={updateItem} />
                    <ListManager t={t} title={t('settings.rootCauseMs')} field="rootCauseMs" items={taxonomy.rootCauseMs} addItem={addItem} removeItem={removeItem} updateItem={updateItem} />
                  </>
                )}

                {activeCategory === 'components' && (
                  <ListManager t={t} title={t('settings.componentTypes')} field="componentTypes" items={taxonomy.componentTypes} addItem={addItem} removeItem={removeItem} updateItem={updateItem} />
                )}
              </div>
            )}

            {activeCategory === 'validation' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 pb-20 items-start">
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
