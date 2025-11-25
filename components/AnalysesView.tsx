
import React, { useState, useMemo, useEffect } from 'react';
import { RcaRecord, AssetNode, TaxonomyConfig } from '../types';
import { getAssets, getTaxonomy } from '../services/storageService';
import { Plus, FileText } from 'lucide-react';
import { FilterBar, FilterState } from './FilterBar';

interface AnalysesViewProps {
  records: RcaRecord[];
  onNew: () => void;
  onEdit: (rec: RcaRecord) => void;
}

export const AnalysesView: React.FC<AnalysesViewProps> = ({ records, onNew, onEdit }) => {
  // --- Filter State ---
  const [showFilters, setShowFilters] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
      searchTerm: '',
      dateStart: '',
      dateEnd: '',
      status: 'ALL',
      area: 'ALL',
      category: 'ALL'
  });

  // --- Data Loading ---
  const [assets, setAssets] = useState<AssetNode[]>([]);
  const [taxonomy, setTaxonomy] = useState<TaxonomyConfig | null>(null);

  useEffect(() => {
    setAssets(getAssets());
    setTaxonomy(getTaxonomy());
  }, []);

  // --- Helpers for Display ---
  const getName = (type: keyof TaxonomyConfig, id: string) => {
      if (!taxonomy || !id) return id;
      const item = taxonomy[type].find(t => t.id === id);
      return item ? item.name : id;
  };

  // --- Derived Lists ---
  const availableAreas = useMemo(() => {
      const areas: {id: string, name: string}[] = [];
      const traverse = (nodes: AssetNode[]) => {
          nodes.forEach(n => {
              if (n.type === 'AREA') areas.push({id: n.id, name: n.name});
              if (n.children) traverse(n.children);
          });
      };
      traverse(assets);
      return areas;
  }, [assets]);

  const availableCategories = useMemo(() => {
      if(!taxonomy) return [];
      return taxonomy.failureCategories;
  }, [taxonomy]);

  const availableStatuses = useMemo(() => {
      if(!taxonomy) return [];
      return taxonomy.analysisStatuses;
  }, [taxonomy]);

  // --- Filtering Logic ---
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
        // Text Search
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesSearch = !filters.searchTerm || 
            r.what?.toLowerCase().includes(searchLower) ||
            r.problem_description?.toLowerCase().includes(searchLower) ||
            r.id.toLowerCase().includes(searchLower) ||
            r.os_number?.toLowerCase().includes(searchLower) ||
            r.asset_name_display?.toLowerCase().includes(searchLower);

        // Date Range
        const rDate = new Date(r.failure_date);
        const start = filters.dateStart ? new Date(filters.dateStart) : null;
        const end = filters.dateEnd ? new Date(filters.dateEnd) : null;
        const matchesDate = (!start || rDate >= start) && (!end || rDate <= end);

        // Dropdowns
        const matchesStatus = filters.status === 'ALL' || r.status === filters.status;
        const matchesArea = filters.area === 'ALL' || r.area_id === filters.area;
        const matchesCategory = filters.category === 'ALL' || r.failure_category_id === filters.category;

        return matchesSearch && matchesDate && matchesStatus && matchesArea && matchesCategory;
    });
  }, [records, filters]);

  const handleReset = () => {
      setFilters({
          searchTerm: '',
          dateStart: '',
          dateEnd: '',
          status: 'ALL',
          area: 'ALL',
          category: 'ALL'
      });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
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
          onReset={handleReset}
          totalResults={filteredRecords.length}
          config={{
              showSearch: true,
              showDate: true,
              showStatus: true,
              showArea: true,
              showCategory: true,
              searchPlaceholder: "Search by Title, ID, Asset...",
              dateLabel: "Failure Date Range"
          }}
          options={{
              statuses: availableStatuses,
              areas: availableAreas,
              categories: availableCategories
          }}
      />

      {/* Data Table */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
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
