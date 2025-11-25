
import React, { useState, useMemo, useEffect } from 'react';
import { RcaRecord, AssetNode, TaxonomyConfig } from '../types';
import { getAssets, getTaxonomy } from '../services/storageService';
import { Plus, Search, Filter, RefreshCw, ChevronUp, ChevronDown, Calendar, FileText } from 'lucide-react';

interface AnalysesViewProps {
  records: RcaRecord[];
  onNew: () => void;
  onEdit: (rec: RcaRecord) => void;
}

export const AnalysesView: React.FC<AnalysesViewProps> = ({ records, onNew, onEdit }) => {
  // --- Filter State ---
  const [showFilters, setShowFilters] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [areaFilter, setAreaFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

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
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = !searchTerm || 
            r.what?.toLowerCase().includes(searchLower) ||
            r.problem_description?.toLowerCase().includes(searchLower) ||
            r.id.toLowerCase().includes(searchLower) ||
            r.os_number?.toLowerCase().includes(searchLower) ||
            r.asset_name_display?.toLowerCase().includes(searchLower);

        // Date Range
        const rDate = new Date(r.failure_date);
        const start = dateStart ? new Date(dateStart) : null;
        const end = dateEnd ? new Date(dateEnd) : null;
        const matchesDate = (!start || rDate >= start) && (!end || rDate <= end);

        // Dropdowns
        const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
        const matchesArea = areaFilter === 'ALL' || r.area_id === areaFilter;
        const matchesCategory = categoryFilter === 'ALL' || r.failure_category_id === categoryFilter;

        return matchesSearch && matchesDate && matchesStatus && matchesArea && matchesCategory;
    });
  }, [records, searchTerm, dateStart, dateEnd, statusFilter, areaFilter, categoryFilter]);

  const clearFilters = () => {
      setSearchTerm('');
      setDateStart('');
      setDateEnd('');
      setStatusFilter('ALL');
      setAreaFilter('ALL');
      setCategoryFilter('ALL');
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

      {/* Filter Bar */}
      <div className={`bg-white rounded-xl shadow-sm border border-slate-200 transition-all duration-300 overflow-hidden mb-6 ${showFilters ? 'p-6' : 'p-0 border-0 h-0'}`}>
         {showFilters && (
             <div className="animate-in fade-in slide-in-from-top-2">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                        <Filter size={16} /> Filter Criteria
                    </h3>
                    <button onClick={clearFilters} className="text-xs text-slate-500 hover:text-red-500 flex items-center gap-1">
                        <RefreshCw size={12} /> Reset
                    </button>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Search */}
                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Search</label>
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Search by Title, ID, Asset..." 
                                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Date */}
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Failure Date Range</label>
                        <div className="flex gap-2 items-center">
                            <input type="date" className="w-full border border-slate-300 rounded-lg p-2 text-sm" value={dateStart} onChange={e => setDateStart(e.target.value)} />
                            <span className="text-slate-400">-</span>
                            <input type="date" className="w-full border border-slate-300 rounded-lg p-2 text-sm" value={dateEnd} onChange={e => setDateEnd(e.target.value)} />
                        </div>
                    </div>

                    {/* Status */}
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                        <select 
                            className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                        >
                            <option value="ALL">All Statuses</option>
                            {availableStatuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>

                    {/* Area */}
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Area</label>
                        <select 
                            className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
                            value={areaFilter}
                            onChange={e => setAreaFilter(e.target.value)}
                        >
                            <option value="ALL">All Areas</option>
                            {availableAreas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Failure Category</label>
                        <select 
                            className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
                            value={categoryFilter}
                            onChange={e => setCategoryFilter(e.target.value)}
                        >
                            <option value="ALL">All Categories</option>
                            {availableCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                 </div>
             </div>
         )}
      </div>

      {/* Toolbar */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
            <button 
                onClick={() => setShowFilters(!showFilters)} 
                className="text-sm font-medium text-blue-600 flex items-center gap-1 hover:underline"
            >
                {showFilters ? <><ChevronUp size={14}/> Hide Filters</> : <><ChevronDown size={14}/> Show Filters</>}
            </button>
        </div>
        <div className="text-sm text-slate-500">
            Showing <strong>{filteredRecords.length}</strong> records
        </div>
      </div>

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
