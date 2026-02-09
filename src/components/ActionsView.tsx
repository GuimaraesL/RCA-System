
import React, { useMemo, useState, useRef } from 'react';
import { useRcaContext } from '../context/RcaContext';
import { useActionsLogic } from '../hooks/useActionsLogic';
import { Plus, Edit2, Trash2, ExternalLink } from 'lucide-react';
import { FilterBar, FilterState } from './FilterBar';
import { useFilterPersistence } from '../hooks/useFilterPersistence';
import { ConfirmModal } from './ConfirmModal';
import { ActionModal } from './ActionModal';
import { useSorting } from '../hooks/useSorting';
import { SortHeader } from './ui/SortHeader';
import { useLanguage } from '../context/LanguageDefinition'; // i18n
import { useFilteredData } from '../hooks/useFilteredData';
// useEnterAnimation disabled for performance (Issue #11)

interface ActionsViewProps {
  onOpenRca?: (id: string) => void;
}

export const ActionsView: React.FC<ActionsViewProps> = ({ onOpenRca }) => {
  const { t, formatDate } = useLanguage();

  // Helper for Status Badges
  const getStatusBadge = (status: string) => {
    switch (status) {
      case '1': return <span className="inline-flex items-center px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-bold">{t('actionModal.statusOptions.approved')}</span>;
      case '2': return <span className="inline-flex items-center px-2 py-1 rounded bg-amber-100 text-amber-700 text-xs font-bold">{t('actionModal.statusOptions.inProgress')}</span>;
      case '3': return <span className="inline-flex items-center px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs font-bold">{t('actionModal.statusOptions.completed')}</span>;
      case '4': return <span className="inline-flex items-center px-2 py-1 rounded bg-indigo-100 text-indigo-700 text-xs font-bold">{t('actionModal.statusOptions.verified')}</span>;
      default: return <span className="inline-flex items-center px-2 py-1 rounded bg-gray-100 text-gray-500 text-xs font-mono">{status || '-'}</span>;
    }
  };

  const { actions, rcaList, isModalOpen, setIsModalOpen, editingAction, openNew, openEdit, handleSave, handleDelete, deleteModalOpen, confirmDelete, cancelDelete } = useActionsLogic();
  const { assets, taxonomy } = useRcaContext();

  const defaultFilters: FilterState = {
    searchTerm: '',
    year: '',
    months: [],
    status: 'ALL',
    area: 'ALL',
    equipment: 'ALL',
    subgroup: 'ALL',
    specialty: 'ALL',
    analysisType: 'ALL', // Hidden
    failureMode: 'ALL', // Technical
    failureCategory: 'ALL', // Technical
    componentType: 'ALL', // Technical
    rootCause6M: 'ALL' // Technical
  };

  const { filters, setFilters, showFilters, setShowFilters, handleReset, isGlobal, toggleGlobal } = useFilterPersistence(
    'rca_actions_view',
    defaultFilters,
    true
  );

  // --- Intelligent Cross-Filtering Hook ---
  const { filteredActions: filteredContent } = useFilteredData(filters);

  const dynamicOptions = useMemo(() => {
    return {
      assets: assets,
      statuses: ['1', '2', '3', '4'],
      specialties: taxonomy?.specialties || []
    };
  }, [assets, taxonomy]);

  // --- Sorting Hook ---
  const { sortedItems: filteredActions, sortConfig, handleSort } = useSorting(filteredContent, { key: 'date', direction: 'desc' });

  // --- Pagination State ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  React.useEffect(() => {
    setCurrentPage(1);
  }, [filters, sortConfig]);

  // Animation disabled for performance with large datasets (Issue #11)

  return (
    <div className="p-8 max-w-[1600px] mx-auto h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 flex-shrink-0 animate-in fade-in slide-in-from-top-4 duration-500">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('sidebar.actions')}</h1>
          <p className="text-slate-500 mt-1">{t('actionsPage.subtitle')}</p>
        </div>
        <button onClick={openNew} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-sm">
          <Plus size={18} /> {t('table.actions')}
        </button>
      </div>

      <div className="animate-in fade-in slide-in-from-top-4 duration-500 delay-100">
        <FilterBar
          isOpen={showFilters}
          onToggle={() => setShowFilters(!showFilters)}
          filters={filters}
          onFilterChange={setFilters}
          onReset={() => handleReset(defaultFilters)}
          totalResults={filteredActions.length}
          config={{
            showSearch: true,
            showDate: true,
            showStatus: true,
            showAssetHierarchy: true,
            showSpecialty: true,
            showAnalysisType: false,
          }}
          options={{
            statuses: dynamicOptions.statuses.map(s => ({ id: s, name: `Box ${s}` })), // Format for FilterBar
            assets: dynamicOptions.assets,
            specialties: dynamicOptions.specialties,
            failureModes: taxonomy.failureModes,
            failureCategories: taxonomy.failureCategories,
            componentTypes: taxonomy.componentTypes,
            rootCause6Ms: taxonomy.rootCauseMs
          }}
          isGlobal={isGlobal}
          onGlobalToggle={toggleGlobal}
        />
      </div>

      {/* Data Grid */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-0 animate-in fade-in duration-700 delay-200">
        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 sticky top-0 bg-slate-50 group z-10">
              <tr>
                <SortHeader label={t('table.status')} sortKey="status" currentSort={sortConfig} onSort={handleSort} />
                <SortHeader label={t('table.what')} sortKey="action" currentSort={sortConfig} onSort={handleSort} />
                <SortHeader label={t('table.responsible')} sortKey="responsible" currentSort={sortConfig} onSort={handleSort} />
                <SortHeader label={t('table.dueDate')} sortKey="date" currentSort={sortConfig} onSort={handleSort} />
                <SortHeader label={t('sidebar.analyses')} sortKey="rcaTitle" currentSort={sortConfig} onSort={handleSort} />
                <th className="px-6 py-3 text-right">{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredActions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(action => (
                <tr
                  key={action.id}
                  className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                  onClick={() => openEdit(action)}
                >
                  <td className="px-6 py-4">{getStatusBadge(action.status)}</td>
                  <td className="px-6 py-4 font-medium text-slate-800 max-w-xs truncate" title={action.action}>{action.action}</td>
                  <td className="px-6 py-4">{action.responsible}</td>
                  <td className="px-6 py-4 font-mono">{formatDate(action.date)}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={(e) => { e.stopPropagation(); onOpenRca && onOpenRca(action.rca_id); }}
                      className="group text-left focus:outline-none"
                      title={t('common.tooltips.viewDetails')}
                    >
                      <div className="text-xs font-bold text-blue-600 truncate max-w-[200px] flex items-center gap-1 group-hover:underline">
                        {action.rcaTitle}
                        <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-[10px] text-slate-400 group-hover:text-blue-400 transition-colors">{action.assetName}</div>
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={(e) => { e.stopPropagation(); openEdit(action); }} className="text-slate-400 hover:text-blue-600 mr-3"><Edit2 size={16} /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(action.id); }} className="text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
              {filteredActions.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">{t('actionsPage.noActions')}</td></tr>
              )}
            </tbody>
          </table>
          {filteredActions.length > 0 && (
            <div className="p-4 flex items-center justify-between border-t border-slate-100 bg-slate-50">
              <div className="text-sm text-slate-500">
                {t('pagination.showing')} <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> {t('pagination.to')} <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredActions.length)}</span> {t('pagination.of')} <span className="font-medium">{filteredActions.length}</span> {t('pagination.results')}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-slate-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100"
                >
                  {t('pagination.previous')}
                </button>
                <button
                  onClick={() => setCurrentPage(prev => (prev * itemsPerPage < filteredActions.length ? prev + 1 : prev))}
                  disabled={currentPage * itemsPerPage >= filteredActions.length}
                  className="px-3 py-1 border border-slate-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100"
                >
                  {t('pagination.next')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Shared Action Modal */}
      <ActionModal
        isOpen={isModalOpen}
        initialData={editingAction}
        rcaList={rcaList}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
      />

      {/* Modal de Confirmação de Exclusão */}
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
