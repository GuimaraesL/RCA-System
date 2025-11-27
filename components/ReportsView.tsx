
import React, { useState, useMemo, useEffect } from 'react';
import { RcaRecord, AssetNode, TaxonomyConfig, ActionRecord } from '../types';
import { getAssets, getTaxonomy, getActions } from '../services/storageService';
import { Printer, AlertCircle, Filter, Search, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

interface ReportsViewProps {
  records: RcaRecord[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({ records }) => {
  const [showFilters, setShowFilters] = useState(true);
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [areaFilter, setAreaFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [componentTypeFilter, setComponentTypeFilter] = useState<string>('ALL');
  
  // Asset & Taxonomy Data
  const [assets, setAssets] = useState<AssetNode[]>([]);
  const [taxonomy, setTaxonomy] = useState<TaxonomyConfig | null>(null);
  const [allSystemActions, setAllSystemActions] = useState<ActionRecord[]>([]);

  useEffect(() => {
    setAssets(getAssets());
    setTaxonomy(getTaxonomy());
    setAllSystemActions(getActions());
  }, []);

  // --- Helpers ---
  const getName = (type: keyof TaxonomyConfig, id: string) => {
      if (!taxonomy || !id) return id;
      const item = taxonomy[type].find(t => t.id === id);
      return item ? item.name : id;
  };

  const getStatusName = (id: string) => getName('analysisStatuses', id);

  // Derived Lists
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

  const availableCategories = taxonomy?.failureCategories || [];
  const availableComponentTypes = taxonomy?.componentTypes || [];
  const availableStatuses = taxonomy?.analysisStatuses || [];

  // Filtering Logic
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = !searchTerm || 
            r.what?.toLowerCase().includes(searchLower) ||
            r.problem_description?.toLowerCase().includes(searchLower) ||
            r.id.toLowerCase().includes(searchLower) ||
            r.os_number?.toLowerCase().includes(searchLower) ||
            r.asset_name_display?.toLowerCase().includes(searchLower);

        const rDate = new Date(r.failure_date);
        const start = dateStart ? new Date(dateStart) : null;
        const end = dateEnd ? new Date(dateEnd) : null;
        const matchesDate = (!start || rDate >= start) && (!end || rDate <= end);

        const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
        const matchesArea = areaFilter === 'ALL' || r.area_id === areaFilter;
        const matchesCategory = categoryFilter === 'ALL' || r.failure_category_id === categoryFilter;
        const matchesComponent = componentTypeFilter === 'ALL' || r.component_type === componentTypeFilter;

        return matchesSearch && matchesDate && matchesStatus && matchesArea && matchesCategory && matchesComponent;
    });
  }, [records, searchTerm, dateStart, dateEnd, statusFilter, areaFilter, categoryFilter, componentTypeFilter]);

  const clearFilters = () => {
      setSearchTerm('');
      setDateStart('');
      setDateEnd('');
      setStatusFilter('ALL');
      setAreaFilter('ALL');
      setCategoryFilter('ALL');
      setComponentTypeFilter('ALL');
  };

  // KPI Calculations
  const totalCost = filteredRecords.reduce((acc, r) => acc + (r.financial_impact || 0), 0);
  const totalDowntime = filteredRecords.reduce((acc, r) => acc + (r.downtime_minutes || 0), 0);
  
  // Resolve Actions for Filtered Records Only
  const filteredRecordIds = new Set(filteredRecords.map(r => r.id));
  const relevantActions = allSystemActions.filter(a => filteredRecordIds.has(a.rca_id));

  // Open: Status not 3 (Concluída) and not 4 (Ef. Comprovada)
  const openActions = relevantActions.filter(a => a.status !== '3' && a.status !== '4');
  const overdueActions = openActions.filter(a => new Date(a.date) < new Date());

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Reports & Insights</h1>
          <p className="text-slate-500 mt-1">Operational impact and action tracking summary.</p>
        </div>
        <div className="flex gap-2">
            <button onClick={() => setShowFilters(!showFilters)} className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 border transition-colors ${showFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-300 text-slate-700'}`}>
                <Filter size={18} /> Filters {showFilters ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
            </button>
            <button onClick={() => window.print()} className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-slate-50">
                <Printer size={18} /> Print
            </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-top-2">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2"><Search size={16} /> Advanced Search</h3>
                <button onClick={clearFilters} className="text-xs text-slate-500 hover:text-red-500 flex items-center gap-1"><RefreshCw size={12} /> Reset Filters</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Search Keywords</label>
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" placeholder="Search..." className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Date Range</label>
                    <div className="flex gap-2 items-center">
                        <input type="date" className="w-full border border-slate-300 rounded-lg p-2 text-sm" value={dateStart} onChange={e => setDateStart(e.target.value)} />
                        <span className="text-slate-400">-</span>
                        <input type="date" className="w-full border border-slate-300 rounded-lg p-2 text-sm" value={dateEnd} onChange={e => setDateEnd(e.target.value)} />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                    <select className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                        <option value="ALL">All Statuses</option>
                        {availableStatuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
            </div>
          </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">Total Financial Impact</div>
            <div className="text-2xl font-bold text-slate-800">${(totalCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">Total Downtime</div>
            <div className="text-2xl font-bold text-slate-800">{totalDowntime} <span className="text-sm text-slate-400 font-normal">min</span></div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">Open Actions</div>
            <div className="text-2xl font-bold text-blue-600">{openActions.length}</div>
            <div className="text-xs text-slate-400 mt-1">{overdueActions.length} overdue</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">Completion Rate</div>
            <div className="text-2xl font-bold text-green-600">
                {filteredRecords.length > 0 ? Math.round((filteredRecords.filter(r => getStatusName(r.status) === 'Concluída').length / filteredRecords.length) * 100) : 0}%
            </div>
        </div>
      </div>

      {/* Actions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><AlertCircle size={18} className="text-amber-500" /> Filtered Actions (Open)</h3>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-3">Due Date</th>
                        <th className="px-6 py-3">Action</th>
                        <th className="px-6 py-3">Responsible</th>
                        <th className="px-6 py-3">Box</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {openActions.length === 0 && (
                        <tr><td colSpan={4} className="p-8 text-center text-slate-400">No open actions found matching filters.</td></tr>
                    )}
                    {openActions.map((action, idx) => {
                        const isOverdue = new Date(action.date) < new Date();
                        return (
                            <tr key={`${action.rca_id}-${idx}`} className="hover:bg-slate-50">
                                <td className={`px-6 py-4 font-mono ${isOverdue ? 'text-red-600 font-bold' : ''}`}>
                                    {action.date} {isOverdue && <span className="ml-2 text-xs bg-red-100 text-red-600 px-1 py-0.5 rounded">LATE</span>}
                                </td>
                                <td className="px-6 py-4 max-w-xs truncate" title={action.action}>{action.action}</td>
                                <td className="px-6 py-4">{action.responsible}</td>
                                <td className="px-6 py-4"><span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs font-medium">Box {action.status}</span></td>
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
