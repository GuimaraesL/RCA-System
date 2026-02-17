/**
 * Proposta: Vista principal de listagem e gestão de Planos de Ação (CAPA).
 * Fluxo: Renderiza uma tabela de ações corretivas com suporte a filtros cruzados, ordenação e vinculação direta com as análises de origem.
 */

import React, { useMemo, useState } from 'react';
import { useRcaContext } from '../../context/RcaContext';
import { useActionsLogic } from '../../hooks/useActionsLogic';
import { Plus, Edit2, Trash2, ExternalLink, CheckCircle2, Clock, ShieldCheck, Award } from 'lucide-react';
import { ShortcutLabel } from '../ui/ShortcutLabel';
import { FilterBar, FilterState } from '../layout/FilterBar';
import { useFilterPersistence } from '../../hooks/useFilterPersistence';
import { ConfirmModal } from '../modals/ConfirmModal';
import { ActionModal } from '../modals/ActionModal';
import { useSorting } from '../../hooks/useSorting';
import { SortHeader } from '../ui/SortHeader';
import { useLanguage } from '../../context/LanguageDefinition';

import { useFilteredData } from '../../hooks/useFilteredData';
import { ACTION_STATUS_IDS } from '../../constants/SystemConstants';

interface ActionsViewProps {
  onOpenRca?: (id: string) => void;
}

export const ActionsView: React.FC<ActionsViewProps> = ({ onOpenRca }) => {
  const { t, formatDate } = useLanguage();

  /**
   * Helper para renderização de badges de status baseado na lógica de 'Box' do sistema.
   */
  const getStatusBadge = (status: string) => {
    switch (status) {
      case ACTION_STATUS_IDS.APPROVED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider border border-emerald-100 shadow-sm">
            <CheckCircle2 size={12} strokeWidth={3} />
            {t('actionModal.statusOptions.approved')}
          </span>
        );
      case ACTION_STATUS_IDS.IN_PROGRESS:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-wider border border-amber-100 shadow-sm">
            <Clock size={12} strokeWidth={3} />
            {t('actionModal.statusOptions.inProgress')}
          </span>
        );
      case ACTION_STATUS_IDS.COMPLETED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-wider border border-blue-100 shadow-sm">
            <ShieldCheck size={12} strokeWidth={3} />
            {t('actionModal.statusOptions.completed')}
          </span>
        );
      case ACTION_STATUS_IDS.VERIFIED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-wider border border-slate-200 shadow-sm">
            <Award size={12} strokeWidth={3} />
            {t('actionModal.statusOptions.verified')}
          </span>
        );
      default: return <span className="inline-flex items-center px-2 py-1 rounded bg-gray-100 text-gray-500 text-xs font-mono">{status || '-'}</span>;
    }
  };

  const { actions, rcaList, isModalOpen, setIsModalOpen, editingAction, openNew, openEdit, handleSave, handleDelete, deleteModalOpen, confirmDelete, cancelDelete } = useActionsLogic();
  const { assets, taxonomy } = useRcaContext();

  // --- Gestão de Estado dos Filtros ---
  const defaultFilters: FilterState = {
    searchTerm: '', year: '', months: [], status: 'ALL', area: 'ALL',
    equipment: 'ALL', subgroup: 'ALL', specialty: 'ALL',
    analysisType: 'ALL', failureMode: 'ALL', failureCategory: 'ALL', componentType: 'ALL', rootCause6M: 'ALL'
  };

  const { filters, setFilters, showFilters, setShowFilters, handleReset, isGlobal, toggleGlobal } = useFilterPersistence(
    'rca_actions_view',
    defaultFilters,
    true
  );

  // Hook de filtragem cruzada inteligente
  const { filteredActions: filteredContent, availableOptions } = useFilteredData(filters);

  const dynamicOptions = useMemo(() => {
    return {
      assets: assets,
      statuses: ['1', '2', '3', '4'],
      specialties: taxonomy?.specialties || []
    };
  }, [assets, taxonomy]);

  // Hook de ordenação
  const { sortedItems: filteredActions, sortConfig, handleSort } = useSorting(filteredContent, { key: 'date', direction: 'desc' });

  // --- Gestão de Paginação ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  React.useEffect(() => {
    setCurrentPage(1);
  }, [filters, sortConfig]);

  return (
    <div className="p-8 lg:p-12 max-w-[1600px] mx-auto h-full flex flex-col space-y-8">
      {/* Cabeçalho da Vista */}
      <div className="flex justify-between items-end flex-shrink-0 animate-in fade-in slide-in-from-top-4 duration-700">
        <div>
          <h1 className="text-4xl font-black text-slate-900 font-display tracking-tight">{t('sidebar.actions')}</h1>
          <p className="text-slate-500 mt-2 font-medium">{t('actionsPage.subtitle')}</p>
        </div>
        <button
          onClick={openNew}
          accessKey="o"
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all active:scale-95"
          title="Alt+O"
        >
          <Plus size={20} strokeWidth={3} /><ShortcutLabel text={t('table.actions')} shortcutLetter="O" />
        </button>
      </div>

      <div className="animate-in fade-in slide-in-from-top-4 duration-700 delay-100">
        <FilterBar
          isOpen={showFilters}
          onToggle={() => setShowFilters(!showFilters)}
          filters={filters}
          onFilterChange={setFilters}
          onReset={() => handleReset(defaultFilters)}
          totalResults={filteredActions.length}
          config={{
            showSearch: true, showDate: true, showStatus: true,
            showAssetHierarchy: true, showSpecialty: true,
            showAnalysisType: false, showComponentType: true
          }}
          options={{
            statuses: dynamicOptions.statuses.map(s => ({ id: s, name: `Box ${s}` })),
            assets: dynamicOptions.assets,
            specialties: dynamicOptions.specialties,
            failureModes: taxonomy.failureModes,
            failureCategories: taxonomy.failureCategories,
            componentTypes: taxonomy.componentTypes,
            rootCause6Ms: taxonomy.rootCauseMs
          }}
          isGlobal={isGlobal}
          onGlobalToggle={toggleGlobal}
          availableOptions={availableOptions}
        />
      </div>

      {/* Grade de Dados */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden flex flex-col min-h-0 animate-in fade-in duration-1000 delay-200">
        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="w-full text-left text-sm text-slate-600 border-separate border-spacing-0">
            <thead className="bg-slate-50 text-slate-500 font-black border-b border-slate-100 sticky top-0 z-10">
              <tr>
                <SortHeader label={t('table.status')} sortKey="status" currentSort={sortConfig} onSort={handleSort} width="w-48" className="px-8 py-5 text-[10px] uppercase tracking-widest border-b border-slate-100" />
                <SortHeader label={t('table.what')} sortKey="action" currentSort={sortConfig} onSort={handleSort} className="px-8 py-5 text-[10px] uppercase tracking-widest border-b border-slate-100" />
                <SortHeader label={t('table.responsible')} sortKey="responsible" currentSort={sortConfig} onSort={handleSort} className="px-8 py-5 text-[10px] uppercase tracking-widest border-b border-slate-100" />
                <SortHeader label={t('table.dueDate')} sortKey="date" currentSort={sortConfig} onSort={handleSort} className="px-8 py-5 text-[10px] uppercase tracking-widest border-b border-slate-100" />
                <SortHeader label={t('sidebar.analyses')} sortKey="rcaTitle" currentSort={sortConfig} onSort={handleSort} className="px-8 py-5 text-[10px] uppercase tracking-widest border-b border-slate-100" />
                <th className="px-8 py-5 text-right border-b border-slate-100 text-[10px] uppercase tracking-widest font-black text-slate-400">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredActions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(action => (
                <tr
                  key={action.id}
                  className="hover:bg-blue-50/30 cursor-pointer transition-all group"
                  onClick={() => openEdit(action)}
                >
                  <td className="px-8 py-6">{getStatusBadge(action.status)}</td>
                  <td className="px-8 py-6 font-bold text-slate-800 max-w-xs truncate" title={action.action}>{action.action}</td>
                  <td className="px-8 py-6 font-medium text-slate-500">{action.responsible}</td>
                  <td className="px-8 py-6 font-mono text-xs font-bold text-slate-400">{formatDate(action.date)}</td>
                  <td className="px-8 py-6">
                    <button
                      onClick={(e) => { e.stopPropagation(); onOpenRca && onOpenRca(action.rca_id); }}
                      className="group text-left focus:outline-none"
                      title={t('common.tooltips.viewDetails')}
                    >
                      <div className="text-xs font-black text-blue-600 truncate max-w-[200px] flex items-center gap-1.5 group-hover:underline">
                        {action.rcaTitle}
                        <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-all" />
                      </div>
                      <div className="text-[10px] font-bold text-slate-400 group-hover:text-blue-400 transition-colors mt-0.5">{action.assetName}</div>
                    </button>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={(e) => { e.stopPropagation(); openEdit(action); }} className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit2 size={16} /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(action.id); }} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredActions.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-20 text-center text-slate-400">
                    <div className="bg-slate-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 size={40} className="opacity-20" />
                    </div>
                    <p className="text-lg font-bold text-slate-300">{t('actionsPage.noActions')}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Paginação */}
          {filteredActions.length > 0 && (
            <div className="p-6 flex items-center justify-between border-t border-slate-100 bg-slate-50/50">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {t('pagination.showing')} <span className="text-slate-900 font-black">{(currentPage - 1) * itemsPerPage + 1}</span> {t('pagination.to')} <span className="text-slate-900 font-black">{Math.min(currentPage * itemsPerPage, filteredActions.length)}</span> {t('pagination.of')} <span className="text-slate-900 font-black">{filteredActions.length}</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white hover:border-slate-400 transition-all shadow-sm active:scale-95"
                  title="←"
                >
                  {t('pagination.previous')}
                </button>
                <button
                  onClick={() => setCurrentPage(prev => (prev * itemsPerPage < filteredActions.length ? prev + 1 : prev))}
                  disabled={currentPage * itemsPerPage >= filteredActions.length}
                  className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white hover:border-slate-400 transition-all shadow-sm active:scale-95"
                  title="→"
                >
                  {t('pagination.next')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ActionModal
        isOpen={isModalOpen}
        initialData={editingAction}
        rcaList={rcaList}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
      />

      <ConfirmModal
        isOpen={deleteModalOpen}
        title={t('modals.deleteTitle')}
        message={t('modals.deleteActionMessage')}
        confirmText={t('modals.confirm')}
        cancelText={t('modals.cancel')}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        variant="danger"
      />
    </div>
  );
};
