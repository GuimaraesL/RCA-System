import React, { useEffect, useState, useMemo } from 'react';
import { RcaRecord, AssetNode, TaxonomyConfig } from '../types';
import { getAssets, getTaxonomy, getActions } from '../services/storageService';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { TrendingUp, Clock, AlertCircle, DollarSign } from 'lucide-react';
import { FilterBar, FilterState } from './FilterBar';
import { useFilterPersistence } from '../hooks/useFilterPersistence';

interface DashboardProps {
    records: RcaRecord[];
}

export const Dashboard: React.FC<DashboardProps> = ({ records }) => {
  const [assets, setAssets] = useState<AssetNode[]>([]);
  const [taxonomy, setTaxonomy] = useState<TaxonomyConfig | null>(null);
  const [allSystemActions, setAllSystemActions] = useState<any[]>([]);
  
  // --- Persistent Filter State ---
  const defaultFilters: FilterState = {
      searchTerm: '',
      dateStart: '',
      dateEnd: '',
      status: 'ALL',
      area: 'ALL',
      category: 'ALL'
  };

  const { showFilters, setShowFilters, filters, setFilters, handleReset } = useFilterPersistence(
      'rca_dashboard', 
      defaultFilters,
      false // Default closed for dashboard
  );

  useEffect(() => {
    setAssets(getAssets());
    setTaxonomy(getTaxonomy());
    setAllSystemActions(getActions());
  }, [records]);

  // --- Helpers ---
  const getStatusName = (id: string) => {
      if(!taxonomy) return id;
      const s = taxonomy.analysisStatuses.find(t => t.id === id);
      return s ? s.name : id;
  };
  
  const getModeName = (id: string) => {
      if(!taxonomy) return id;
      const m = taxonomy.failureModes.find(t => t.id === id);
      return m ? m.name : id;
  };

  const getAreaName = (areaId: string) => {
      const findRecursive = (nodes: AssetNode[]): string | undefined => {
          for(const n of nodes) {
              if(n.id === areaId) return n.name;
              if(n.children) {
                  const found = findRecursive(n.children);
                  if(found) return found;
              }
          }
      };
      return findRecursive(assets) || areaId;
  };

  // --- Filtering Logic ---
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesSearch = !filters.searchTerm || 
            r.what?.toLowerCase().includes(searchLower) ||
            r.problem_description?.toLowerCase().includes(searchLower) ||
            r.id.toLowerCase().includes(searchLower);

        const rDate = new Date(r.failure_date);
        const start = filters.dateStart ? new Date(filters.dateStart) : null;
        const end = filters.dateEnd ? new Date(filters.dateEnd) : null;
        const matchesDate = (!start || rDate >= start) && (!end || rDate <= end);

        const matchesStatus = filters.status === 'ALL' || r.status === filters.status;
        const matchesArea = filters.area === 'ALL' || r.area_id === filters.area;
        const matchesCategory = filters.category === 'ALL' || r.failure_category_id === filters.category;

        return matchesSearch && matchesDate && matchesStatus && matchesArea && matchesCategory;
    });
  }, [records, filters]);

  // --- Filter Options ---
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
  const availableStatuses = taxonomy?.analysisStatuses || [];

  // --- KPI Calculations (Based on Filtered Data) ---
  const totalCost = filteredRecords.reduce((acc, r) => acc + (r.financial_impact || 0), 0);
  const totalDowntime = filteredRecords.reduce((acc, r) => acc + (r.downtime_minutes || 0), 0);
  
  const activeAnalyses = filteredRecords.filter(r => {
      const name = getStatusName(r.status);
      return name !== 'Concluída' && name !== 'Cancelada';
  }).length;

  // Calculate Actions Linked to Filtered Records
  const filteredRecordIds = new Set(filteredRecords.map(r => r.id));
  const linkedActions = allSystemActions.filter(a => filteredRecordIds.has(a.rca_id));
  const openActionCount = linkedActions.filter(a => a.status !== '3' && a.status !== '4').length;

  // --- Chart Data Preparation ---
  const statusCounts = filteredRecords.reduce((acc: any, curr) => {
      const s = getStatusName(curr.status || 'Unknown');
      acc[s] = (acc[s] || 0) + 1;
      return acc;
  }, {});

  const statusData = Object.keys(statusCounts).map((key, index) => ({
      name: key,
      value: statusCounts[key],
      color: key === 'Concluída' ? '#10b981' : 
             key === 'Em Andamento' ? '#3b82f6' : 
             key === 'Em Aberto' ? '#94a3b8' : 
             key === 'Cancelada' ? '#ef4444' : 
             `hsl(${index * 45}, 70%, 50%)`
  }));

  const costByArea = filteredRecords.reduce((acc: any, r) => {
    const areaName = getAreaName(r.area_id) || 'Unknown';
    acc[areaName] = (acc[areaName] || 0) + (r.financial_impact || 0);
    return acc;
  }, {});

  const costChartData = Object.keys(costByArea)
    .map(k => ({ name: k, cost: costByArea[k] }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 5);

  const failureModeCount = filteredRecords.reduce((acc: any, r) => {
    const mode = getModeName(r.failure_mode_id || 'Unspecified');
    acc[mode] = (acc[mode] || 0) + 1;
    return acc;
  }, {});

  const failureModeData = Object.keys(failureModeCount)
    .map(k => ({ name: k, count: failureModeCount[k] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Executive Dashboard</h1>
          <p className="text-slate-500 mt-1">High-level reliability metrics and operational insights.</p>
        </div>
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
              showArea: true,
              showCategory: true,
              dateLabel: "Failure Date Range"
          }}
          options={{
              statuses: availableStatuses,
              areas: availableAreas,
              categories: availableCategories
          }}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
            <div className="flex items-start justify-between">
                <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Total Impact</div>
                <div className="p-2 bg-red-50 text-red-600 rounded-lg min-w-0"><DollarSign size={20}/></div>
            </div>
            <div className="text-2xl font-bold text-slate-800 mt-2">
                ${totalCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
            <div className="flex items-start justify-between">
                <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Total Downtime</div>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg min-w-0"><Clock size={20}/></div>
            </div>
            <div className="text-2xl font-bold text-slate-800 mt-2">{totalDowntime} <span className="text-sm font-normal text-slate-400">min</span></div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
             <div className="flex items-start justify-between">
                <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Open Actions (Linked)</div>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg min-w-0"><AlertCircle size={20}/></div>
            </div>
            <div className="text-2xl font-bold text-slate-800 mt-2">{openActionCount}</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
            <div className="flex items-start justify-between">
                <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Active Analyses</div>
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg min-w-0"><TrendingUp size={20}/></div>
            </div>
            <div className="text-2xl font-bold text-slate-800 mt-2">{activeAnalyses}</div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 min-w-0 flex flex-col">
            <h3 className="font-bold text-slate-700 mb-6">Financial Impact by Area (Top 5)</h3>
            <div className="w-full flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={costChartData} margin={{bottom: 20, right: 20, left: 20}}>
                        <XAxis dataKey="name" tick={{fontSize: 10}} interval={0} angle={-15} textAnchor="end" height={60} />
                        <YAxis tickFormatter={(val) => `$${val/1000}k`} width={60} />
                        <Tooltip formatter={(val: number) => `$${val.toLocaleString()}`} />
                        <Bar dataKey="cost" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 min-w-0 flex flex-col">
            <h3 className="font-bold text-slate-700 mb-6">Analysis Status Distribution</h3>
            <div className="w-full flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                            {statusData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>

       {/* Charts Row 2 */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 min-w-0 flex flex-col">
            <h3 className="font-bold text-slate-700 mb-6">Top Failure Modes</h3>
            <div className="w-full flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={failureModeData} layout="vertical" margin={{left: 10, right: 30}}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={150} tick={{fontSize: 11}} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 border-dashed flex items-center justify-center text-slate-400 text-sm italic min-w-0">
            Select 'Action Plans' in the menu to manage corrective actions for RCAs.
        </div>
       </div>
    </div>
  );
};
