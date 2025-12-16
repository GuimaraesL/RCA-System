
import React, { useMemo } from 'react';
import { RcaRecord, AssetNode, TaxonomyConfig } from '../types';
import { Plus, FileText } from 'lucide-react';
import { FilterBar, FilterState } from './FilterBar';
import { useFilterPersistence } from '../hooks/useFilterPersistence';
import { useRcaContext } from '../context/RcaContext';
import { filterAssetsByUsage } from '../services/storageService';

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
      analysisType: 'ALL',
      failureMode: 'ALL',
      failureCategory: 'ALL',
      componentType: 'ALL',
      rootCause6M: 'ALL'
  };

  const { showFilters, setShowFilters, filters, setFilters, handleReset } = useFilterPersistence(
      'rca_analyses_view_v3', 
      defaultFilters,
      true
  );

  // --- Helpers ---
  const getName = (type: keyof TaxonomyConfig, id: string) => {
      if (!taxonomy || !id) return id;
      const item = (taxonomy[type] as any[]).find((t: any) => t.id === id);
      return item ? item.name : id;
  };

  // --- Strict Cross-Filtering Logic for Options ---
  // Same logic as Dashboard to ensure consistency across the app.
  const dynamicOptions = useMemo(() => {
    // Helper: Global filters (Date, Search)
    const matchesGlobal = (r: any) => {
         const searchLower = filters.searchTerm.toLowerCase();
         const matchesSearch = !filters.searchTerm || 
            r.what?.toLowerCase().includes(searchLower) ||
            r.problem_description?.toLowerCase().includes(searchLower) ||
            r.id.toLowerCase().includes(searchLower);

        const rDate = new Date(r.failure_date);
        const matchesYear = !filters.year || rDate.getFullYear().toString() === filters.year;
        
        const rMonth = (rDate.getMonth() + 1).toString().padStart(2, '0');
        const matchesMonth = filters.months.length === 0 || filters.months.includes(rMonth);
        
        return matchesSearch && matchesYear && matchesMonth;
    };

    // Helper: Asset filters
    const matchesAssets = (r: any) => {
        if (filters.subgroup !== 'ALL' && r.subgroup_id !== filters.subgroup) return false;
        if (filters.equipment !== 'ALL' && r.equipment_id !== filters.equipment) return false;
        if (filters.area !== 'ALL' && r.area_id !== filters.area) return false;
        return true;
    };
    
    // Helper: Attribute filters
    const matchesAttributes = (r: any, ignore: 'status' | 'type' | 'specialty' | null) => {
        if (ignore !== 'status' && filters.status !== 'ALL' && r.status !== filters.status) return false;
        if (ignore !== 'type' && filters.analysisType !== 'ALL' && r.analysis_type !== filters.analysisType) return false;
        if (ignore !== 'specialty' && filters.specialty !== 'ALL' && r.specialty_id !== filters.specialty) return false;
        return true;
    };

    // 1. Assets: Match Global + Attributes
    const recordsForAssets = records.filter(r => matchesGlobal(r) && matchesAttributes(r, null));
    const usedAssetIds = new Set<string>();
    recordsForAssets.forEach(r => {
        if(r.area_id) usedAssetIds.add(r.area_id);
        if(r.equipment_id) usedAssetIds.add(r.equipment_id);
        if(r.subgroup_id) usedAssetIds.add(r.subgroup_id);
    });

    // 2. Statuses: Match Global + Assets + Attributes(ignore Status)
    const recordsForStatuses = records.filter(r => matchesGlobal(r) && matchesAssets(r) && matchesAttributes(r, 'status'));
    const usedStatuses = new Set(recordsForStatuses.map(r => r.status));

    // 3. Specialties: Match Global + Assets + Attributes(ignore Specialty)
    const recordsForSpecialties = records.filter(r => matchesGlobal(r) && matchesAssets(r) && matchesAttributes(r, 'specialty'));
    const usedSpecialties = new Set(recordsForSpecialties.map(r => r.specialty_id));

    // 4. Types: Match Global + Assets + Attributes(ignore Type)
    const recordsForTypes = records.filter(r => matchesGlobal(r) && matchesAssets(r) && matchesAttributes(r, 'type'));
    const usedTypes = new Set(recordsForTypes.map(r => r.analysis_type));

    return {
        assets: filterAssetsByUsage(assets, usedAssetIds),
        statuses: taxonomy.analysisStatuses.filter(s => usedStatuses.has(s.id)),
        specialties: taxonomy.specialties.filter(s => usedSpecialties.has(s.id)),
        analysisTypes: taxonomy.analysisTypes.filter(t => usedTypes.has(t.id))
    };
  }, [records, assets, taxonomy, filters]);

  // --- Filtering Logic (View) ---
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
              statuses: dynamicOptions.statuses,
              analysisTypes: dynamicOptions.analysisTypes,
              specialties: dynamicOptions.specialties,
              assets: dynamicOptions.assets
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
