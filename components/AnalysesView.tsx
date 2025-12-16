
import React, { useMemo } from 'react';
import { RcaRecord, AssetNode, TaxonomyConfig } from '../types';
import { Plus, FileText } from 'lucide-react';
import { FilterBar, FilterState } from './FilterBar';
import { useFilterPersistence } from '../hooks/useFilterPersistence';
import { useRcaContext } from '../context/RcaContext';

interface AnalysesViewProps {
  onNew: () => void;
  onEdit: (rec: RcaRecord) => void;
}

export const AnalysesView: React.FC<AnalysesViewProps> = ({ onNew, onEdit }) => {
  const { records, assets, taxonomy } = useRcaContext();

  // --- Persistent Filter State (Updated) ---
  const defaultFilters: FilterState = {
      searchTerm: '',
      year: '', // Optional in list view
      months: [],
      status: 'ALL',
      area: 'ALL',
      equipment: 'ALL',
      subgroup: 'ALL',
      specialty: 'ALL',
      analysisType: 'ALL'
  };

  const { showFilters, setShowFilters, filters, setFilters, handleReset } = useFilterPersistence(
      'rca_analyses_view_v2', 
      defaultFilters,
      true
  );

  // --- Helpers ---
  const getName = (type: keyof TaxonomyConfig, id: string) => {
      if (!taxonomy || !id) return id;
      const item = (taxonomy[type] as any[]).find((t: any) => t.id === id);
      return item ? item.name : id;
  };

  // --- Filtering Logic (Matches Dashboard logic roughly) ---
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
        // Text Search
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesSearch = !filters.searchTerm || 
            r.what?.toLowerCase().includes(searchLower) ||
            r.problem_description?.toLowerCase().includes(searchLower) ||
            r.id.toLowerCase().includes(searchLower);

        // Date (Year Only if set)
        const rDate = new Date(r.failure_date);
        const matchesYear = !filters.year || rDate.getFullYear().toString() === filters.year;
        
        // Month
        const rMonth = (rDate.getMonth() + 1).toString().padStart(2, '0');
        const matchesMonth = filters.months.length === 0 || filters.months.includes(rMonth);

        // Filters
        const matchesStatus = filters.status === 'ALL' || r.status === filters.status;
        const matchesType = filters.analysisType === 'ALL' || r.analysis_type === filters.analysisType;
        const matchesSpecialty = filters.specialty === 'ALL' || r.specialty_id === filters.specialty;

        // Assets
        let matchesAsset = true;
        if (filters.subgroup !== 'ALL') matchesAsset = r.subgroup_id === filters.subgroup;
        else if (filters.equipment !== 'ALL') matchesAsset = r.equipment_id === filters.equipment;
        else if (filters.area !== 'ALL') matchesAsset = r.area_id === filters.area;

        return matchesSearch && matchesYear && matchesMonth && matchesStatus && matchesAsset && matchesType && matchesSpecialty;
    });
  }, [records, filters]);

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 flex-shrink-0">
        <div>
            <h1 className="text-3xl font-bold text-slate-900">Failure Analyses</h1>
            <p className="text-slate-500 mt-1">Manage, search, and edit reliability records.</p>
        </div>
        <button 
          onClick={onNew}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors"
        >
          <Plus size={18} /> New Analysis
        </button>
      </div>

      <FilterBar 
          isOpen={showFilters}
          onToggle={() => setShowFilters(!showFilters)}
          filters={filters}
          onFilterChange={setFilters}
          onReset={() => handleReset(defaultFilters)}
          totalResults={filteredRecords.length}
          config={{
              showSearch: true,
              showDate: true,
              showStatus: true,
              showAssetHierarchy: true,
              showAnalysisType: true,
              showSpecialty: true
          }}
          options={{
              statuses: taxonomy.analysisStatuses,
              analysisTypes: taxonomy.analysisTypes,
              specialties: taxonomy.specialties,
              assets: assets
          }}
      />

      {/* Data Table */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-0">
        <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
            <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                        <th className="px-6 py-4">ID / Type</th>
                        <th className="px-6 py-4">Title / Problem</th>
                        <th className="px-6 py-4">Asset Location</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Impact</th>
                        <th className="px-6 py-4">Date</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredRecords.length === 0 && (
                        <tr>
                            <td colSpan={6} className="p-12 text-center text-slate-400">
                                <FileText size={48} className="mx-auto mb-3 opacity-20" />
                                No records found matching your criteria.
                            </td>
                        </tr>
                    )}
                    {filteredRecords.map(r => {
                        const statusName = getName('analysisStatuses', r.status);
                        return (
                            <tr key={r.id} onClick={() => onEdit(r)} className="hover:bg-blue-50 cursor-pointer transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="font-mono text-xs text-slate-500">{r.id}</div>
                                    <div className="text-xs font-bold text-blue-600">{getName('analysisTypes', r.analysis_type)}</div>
                                </td>
                                <td className="px-6 py-4 max-w-sm">
                                    <div className="font-medium text-slate-900 truncate" title={r.what}>{r.what}</div>
                                    <div className="text-xs text-slate-400 truncate" title={r.problem_description}>{r.problem_description}</div>
                                </td>
                                <td className="px-6 py-4 max-w-xs">
                                    <div className="text-slate-700 truncate" title={r.asset_name_display}>{r.asset_name_display}</div>
                                    <div className="text-xs text-slate-400 truncate">{getName('componentTypes', r.component_type)}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                        statusName === 'Concluída' ? 'bg-green-100 text-green-700' : 
                                        statusName === 'Cancelada' ? 'bg-red-100 text-red-700' :
                                        statusName === 'Em Aberto' ? 'bg-slate-100 text-slate-600' :
                                        'bg-blue-100 text-blue-700'
                                    }`}>
                                        {statusName}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-slate-900 font-medium">${r.financial_impact?.toLocaleString()}</div>
                                    <div className="text-xs text-slate-400">{r.downtime_minutes} min</div>
                                </td>
                                <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                                    {r.failure_date}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};
