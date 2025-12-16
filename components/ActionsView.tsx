
import React, { useState, useEffect, useMemo } from 'react';
import { useActionsLogic } from '../hooks/useActionsLogic';
import { ActionStatus, AssetNode, TaxonomyConfig } from '../types';
import { getAssets, getTaxonomy } from '../services/storageService';
import { Plus, Edit2, Trash2, ExternalLink } from 'lucide-react';
import { ActionModal } from './ActionModal';
import { FilterBar, FilterState } from './FilterBar';
import { useFilterPersistence } from '../hooks/useFilterPersistence';

interface ActionsViewProps {
    onOpenRca?: (rcaId: string) => void;
}

export const ActionsView: React.FC<ActionsViewProps> = ({ onOpenRca }) => {
  const { actions, rcaList, isModalOpen, setIsModalOpen, editingAction, openNew, openEdit, handleSave, handleDelete } = useActionsLogic();
  
  // --- Data for Filters ---
  const [assets, setAssets] = useState<AssetNode[]>([]);
  const [taxonomy, setTaxonomy] = useState<TaxonomyConfig | null>(null);

  useEffect(() => {
    setAssets(getAssets());
    setTaxonomy(getTaxonomy());
  }, []);

  // --- Persistent Filter State (Updated) ---
  const defaultFilters: FilterState = {
      searchTerm: '',
      year: '',
      months: [],
      status: 'ALL', // Box Status
      area: 'ALL',
      equipment: 'ALL',
      subgroup: 'ALL',
      specialty: 'ALL',
      analysisType: 'ALL'
  };

  const { showFilters, setShowFilters, filters, setFilters, handleReset } = useFilterPersistence(
      'rca_actions_view_v2', 
      defaultFilters,
      true
  );

  const boxStatusOptions = [
      { id: '1', name: '1 - Aprovada' },
      { id: '2', name: '2 - Em Andamento' },
      { id: '3', name: '3 - Concluída' },
      { id: '4', name: '4 - Ef. Comprovada' }
  ];

  // --- Filter Logic ---
  const filteredActions = useMemo(() => {
      return actions.filter(a => {
        // Search
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesSearch = !filters.searchTerm || 
                              a.action.toLowerCase().includes(searchLower) || 
                              a.responsible.toLowerCase().includes(searchLower) ||
                              a.rcaTitle.toLowerCase().includes(searchLower);
        
        // Status (Box)
        const matchesStatus = filters.status === 'ALL' || a.status === filters.status;

        // Date (Year/Month)
        const aDate = new Date(a.date);
        const matchesYear = !filters.year || aDate.getFullYear().toString() === filters.year;
        const matchesMonth = filters.months.length === 0 || filters.months.includes((aDate.getMonth()+1).toString().padStart(2, '0'));

        // Context Filters (Asset from Linked RCA)
        let matchesAsset = true;
        // Logic: actions ViewModel only has 'areaId'. For deep asset filtering, we'd need more data in ViewModel.
        // For now, we support Area filter only in Actions View as implemented in useActionsLogic hook (viewModel has areaId).
        // Deep asset filtering could be added if ViewModel is expanded, but Area is sufficient for general context.
        if (filters.area !== 'ALL') matchesAsset = a.areaId === filters.area;

        return matchesSearch && matchesStatus && matchesYear && matchesMonth && matchesAsset;
      });
  }, [actions, filters]);

  const getStatusBadge = (status: ActionStatus) => {
    switch(status) {
      case '1': return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">1 - Aprovada</span>;
      case '2': return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold">2 - Em Andamento</span>;
      case '3': return <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-bold">3 - Concluída</span>;
      case '4': return <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-bold">4 - Ef. Comprovada</span>;
      default: return null;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex justify-between items-center mb-6 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Action Plans</h1>
          <p className="text-slate-500 mt-1">Manage corrective actions linked to Root Cause Analyses.</p>
        </div>
        <button onClick={openNew} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-sm">
          <Plus size={18} /> New Action Plan
        </button>
      </div>

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
              showAssetHierarchy: true, // Only Area is effectively used in filtering logic currently
              showSpecialty: false,
              showAnalysisType: false,
          }}
          options={{
              statuses: boxStatusOptions,
              assets: assets // Passes tree for area select
          }}
      />

      {/* Data Grid */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-0">
         <div className="overflow-auto flex-1 custom-scrollbar">
            <table className="w-full text-left text-sm text-slate-600">
               <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 sticky top-0 bg-slate-50">
                  <tr>
                     <th className="px-6 py-3">Status (Box)</th>
                     <th className="px-6 py-3">Action Description</th>
                     <th className="px-6 py-3">Responsible</th>
                     <th className="px-6 py-3">Due Date</th>
                     <th className="px-6 py-3">Linked Analysis (RCA)</th>
                     <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {filteredActions.map(action => (
                     <tr key={action.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">{getStatusBadge(action.status)}</td>
                        <td className="px-6 py-4 font-medium text-slate-800 max-w-xs truncate" title={action.action}>{action.action}</td>
                        <td className="px-6 py-4">{action.responsible}</td>
                        <td className="px-6 py-4 font-mono">{action.date}</td>
                        <td className="px-6 py-4">
                            <button 
                                onClick={() => onOpenRca && onOpenRca(action.rca_id)}
                                className="group text-left focus:outline-none"
                                title="Click to view RCA details"
                            >
                                <div className="text-xs font-bold text-blue-600 truncate max-w-[200px] flex items-center gap-1 group-hover:underline">
                                    {action.rcaTitle} 
                                    <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <div className="text-[10px] text-slate-400 group-hover:text-blue-400 transition-colors">{action.assetName}</div>
                            </button>
                        </td>
                        <td className="px-6 py-4 text-right">
                           <button onClick={() => openEdit(action)} className="text-slate-400 hover:text-blue-600 mr-3"><Edit2 size={16}/></button>
                           <button onClick={() => handleDelete(action.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
                        </td>
                     </tr>
                  ))}
                  {filteredActions.length === 0 && (
                      <tr><td colSpan={6} className="p-8 text-center text-slate-400">No actions found matching criteria.</td></tr>
                  )}
               </tbody>
            </table>
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
    </div>
  );
};
