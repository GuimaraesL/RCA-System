
import React, { useMemo } from 'react';
import { AssetNode } from '../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { Clock, TrendingUp, AlertCircle, CheckCircle, PieChart as PieIcon, Activity } from 'lucide-react';
import { FilterBar, FilterState } from './FilterBar';
import { useFilterPersistence } from '../hooks/useFilterPersistence';
import { useRcaContext } from '../context/RcaContext';

// Professional Color Palette (Cool Tones + Accents)
const COLORS = [
    '#3b82f6', // Blue 500
    '#10b981', // Emerald 500
    '#f59e0b', // Amber 500
    '#6366f1', // Indigo 500
    '#ec4899', // Pink 500
    '#06b6d4', // Cyan 500
    '#8b5cf6', // Violet 500
    '#ef4444', // Red 500
    '#84cc16', // Lime 500 (kept as accent)
    '#14b8a6', // Teal 500
];

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/95 backdrop-blur-sm p-3 border border-slate-200 shadow-lg rounded-lg text-sm">
                <p className="font-bold text-slate-800 mb-1">{label || payload[0].name}</p>
                <p className="text-blue-600 font-medium">
                    {payload[0].value} <span className="text-slate-500 text-xs">registros</span>
                </p>
            </div>
        );
    }
    return null;
};

export const Dashboard: React.FC = () => {
  const { records, assets, taxonomy } = useRcaContext();
  
  const defaultFilters: FilterState = {
      searchTerm: '',
      year: new Date().getFullYear().toString(),
      months: [],
      status: 'ALL',
      area: 'ALL',
      equipment: 'ALL',
      subgroup: 'ALL',
      specialty: 'ALL',
      analysisType: 'ALL'
  };

  const { showFilters, setShowFilters, filters, setFilters, handleReset } = useFilterPersistence(
      'rca_dashboard_v3', 
      defaultFilters,
      false
  );

  const resolveTaxonomyName = (type: keyof typeof taxonomy, id: string) => {
      if(!taxonomy || !taxonomy[type]) return id;
      const item = (taxonomy[type] as any[]).find((t: any) => t.id === id);
      return item ? item.name : id;
  };

  const resolveAssetName = (id: string) => {
      const findRecursive = (nodes: AssetNode[]): string | undefined => {
          for(const n of nodes) {
              if(n.id === id) return n.name;
              if(n.children) {
                  const found = findRecursive(n.children);
                  if(found) return found;
              }
          }
      };
      return findRecursive(assets) || id;
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
        const rYear = rDate.getFullYear().toString();
        const rMonth = (rDate.getMonth() + 1).toString().padStart(2, '0');

        const matchesYear = !filters.year || rYear === filters.year;
        const matchesMonth = filters.months.length === 0 || filters.months.includes(rMonth);

        const matchesStatus = filters.status === 'ALL' || r.status === filters.status;
        const matchesSpecialty = filters.specialty === 'ALL' || r.specialty_id === filters.specialty;
        const matchesType = filters.analysisType === 'ALL' || r.analysis_type === filters.analysisType;

        let matchesAsset = true;
        if (filters.subgroup !== 'ALL') matchesAsset = r.subgroup_id === filters.subgroup;
        else if (filters.equipment !== 'ALL') matchesAsset = r.equipment_id === filters.equipment;
        else if (filters.area !== 'ALL') matchesAsset = r.area_id === filters.area;

        return matchesSearch && matchesYear && matchesMonth && matchesStatus && matchesSpecialty && matchesType && matchesAsset;
    });
  }, [records, filters]);

  // --- Aggregation Functions ---
  const aggregateCount = (keyFn: (r: any) => string) => {
      const counts: Record<string, number> = {};
      filteredRecords.forEach(r => {
          const key = keyFn(r);
          if(key) counts[key] = (counts[key] || 0) + 1;
      });
      return Object.keys(counts)
          .map(k => ({ name: k, count: counts[k] }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
  };

  // 1. Data Prep
  const dataStatus = aggregateCount(r => resolveTaxonomyName('analysisStatuses', r.status));
  const dataType = aggregateCount(r => resolveTaxonomyName('analysisTypes', r.analysis_type));
  const dataEquip = aggregateCount(r => r.equipment_id ? resolveAssetName(r.equipment_id) : '');
  const dataSub = aggregateCount(r => r.subgroup_id ? resolveAssetName(r.subgroup_id) : '');
  const dataComp = aggregateCount(r => r.component_type ? resolveTaxonomyName('componentTypes', r.component_type) : '');
  const dataMode = aggregateCount(r => r.failure_mode_id ? resolveTaxonomyName('failureModes', r.failure_mode_id) : '');
  const dataCat = aggregateCount(r => r.failure_category_id ? resolveTaxonomyName('failureCategories', r.failure_category_id) : '');

  // 6M Special Aggregation
  const rootCauseCounts: Record<string, number> = {};
  filteredRecords.forEach(r => {
      r.root_causes?.forEach(rc => {
          if(rc.root_cause_m_id) {
              const name = resolveTaxonomyName('rootCauseMs', rc.root_cause_m_id);
              rootCauseCounts[name] = (rootCauseCounts[name] || 0) + 1;
          }
      });
  });
  const data6M = Object.keys(rootCauseCounts).map(k => ({ name: k, count: rootCauseCounts[k] })).sort((a, b) => b.count - a.count);

  // KPIs
  const totalDowntimeMin = filteredRecords.reduce((acc, r) => acc + (r.downtime_minutes || 0), 0);
  const totalDowntimeHours = (totalDowntimeMin / 60).toFixed(1);
  const totalCost = filteredRecords.reduce((acc, r) => acc + (r.financial_impact || 0), 0);

  // --- Reusable Chart Card ---
  const ChartCard: React.FC<{ 
      title: string; 
      children: React.ReactNode; 
      icon?: React.ReactNode;
  }> = ({ title, children, icon }) => (
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-[350px] transition-all hover:shadow-md">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-50 pb-2">
              {icon && <span className="text-slate-400">{icon}</span>}
              <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">{title}</h3>
          </div>
          <div className="flex-1 w-full min-h-0 relative">
             {children}
          </div>
      </div>
  );

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-500 pb-20">
      
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Activity className="text-blue-600"/> Painel Geral
          </h1>
          <p className="text-slate-500 mt-1">Visão consolidada de falhas, custos e performance.</p>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar 
          isOpen={showFilters}
          onToggle={() => setShowFilters(!showFilters)}
          filters={filters}
          onFilterChange={setFilters}
          onReset={() => handleReset(defaultFilters)}
          totalResults={filteredRecords.length}
          config={{ showSearch: true, showDate: true, showStatus: true, showAssetHierarchy: true, showSpecialty: true, showAnalysisType: true }}
          options={{ statuses: taxonomy.analysisStatuses, specialties: taxonomy.specialties, analysisTypes: taxonomy.analysisTypes, assets: assets }}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-white to-blue-50 p-6 rounded-2xl shadow-sm border border-blue-100 relative overflow-hidden group">
              <div className="absolute right-0 top-0 w-24 h-24 bg-blue-100 rounded-full -mr-8 -mt-8 opacity-50 group-hover:scale-110 transition-transform"></div>
              <div className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-2 flex items-center gap-1"><Clock size={14}/> Duração (Min)</div>
              <div className="text-4xl font-bold text-slate-800 relative z-10">{totalDowntimeMin.toLocaleString()}</div>
          </div>
          <div className="bg-gradient-to-br from-white to-indigo-50 p-6 rounded-2xl shadow-sm border border-indigo-100 relative overflow-hidden group">
              <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-100 rounded-full -mr-8 -mt-8 opacity-50 group-hover:scale-110 transition-transform"></div>
              <div className="text-xs text-indigo-600 font-bold uppercase tracking-wider mb-2 flex items-center gap-1"><Clock size={14}/> Duração (Horas)</div>
              <div className="text-4xl font-bold text-slate-800 relative z-10">{totalDowntimeHours}</div>
          </div>
          <div className="bg-gradient-to-br from-white to-emerald-50 p-6 rounded-2xl shadow-sm border border-emerald-100 relative overflow-hidden group">
              <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-100 rounded-full -mr-8 -mt-8 opacity-50 group-hover:scale-110 transition-transform"></div>
              <div className="text-xs text-emerald-600 font-bold uppercase tracking-wider mb-2 flex items-center gap-1"><TrendingUp size={14}/> Custo Total Est.</div>
              <div className="text-4xl font-bold text-slate-800 relative z-10">
                ${totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group">
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2 flex items-center gap-1"><PieIcon size={14}/> Total RCAs</div>
              <div className="text-4xl font-bold text-slate-800 relative z-10">{filteredRecords.length}</div>
              <div className="text-xs text-slate-400 mt-2">Registros filtrados</div>
          </div>
      </div>

      {/* Main Grid: 2 Columns for better readability */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Row 1: High Level Distribution */}
          <ChartCard title="Total por Status" icon={<CheckCircle size={16}/>}>
             {dataStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={dataStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="count">
                            {dataStatus.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                    </PieChart>
                </ResponsiveContainer>
             ) : <div className="h-full flex items-center justify-center text-slate-300 text-sm">Sem dados</div>}
          </ChartCard>

          <ChartCard title="Total por Tipo de Análise" icon={<PieIcon size={16}/>}>
             {dataType.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={dataType} cx="50%" cy="50%" outerRadius={100} dataKey="count" label={({name, percent}) => `${(percent * 100).toFixed(0)}%`}>
                             {dataType.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index + 3 % COLORS.length]} stroke="white" strokeWidth={2} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                </ResponsiveContainer>
             ) : <div className="h-full flex items-center justify-center text-slate-300 text-sm">Sem dados</div>}
          </ChartCard>

          {/* Row 2: Assets */}
          <ChartCard title="Top Equipamentos (Pareto)" icon={<TrendingUp size={16}/>}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dataEquip} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                         <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                         <XAxis type="number" allowDecimals={false} hide />
                         <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 11, fill: '#64748b'}} />
                         <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
                         <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Top Subgrupos" icon={<TrendingUp size={16}/>}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dataSub} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                         <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                         <XAxis type="number" allowDecimals={false} hide />
                         <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 11, fill: '#64748b'}} />
                         <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
                         <Bar dataKey="count" fill="#06b6d4" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
          </ChartCard>

          {/* Row 3: Technical Details */}
          <ChartCard title="Distribuição 6M (Causas Raízes)" icon={<AlertCircle size={16}/>}>
             {data6M.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={data6M} cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={5} dataKey="count" label>
                            {data6M.map((entry, index) => {
                                // Assign specific colors based on 6M if possible, else cycle
                                return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />;
                            })}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
             ) : <div className="h-full flex items-center justify-center text-slate-300 text-sm">Sem causas raízes definidas</div>}
          </ChartCard>

          <ChartCard title="Total por Componente" icon={<AlertCircle size={16}/>}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dataComp} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                         <XAxis dataKey="name" tick={{fontSize: 10, fill: '#64748b'}} interval={0} angle={-45} textAnchor="end" height={60} />
                         <YAxis allowDecimals={false} tick={{fontSize: 11}} />
                         <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
                         <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30}>
                            {dataComp.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                         </Bar>
                    </BarChart>
                </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Modo de Falha" icon={<AlertCircle size={16}/>}>
               <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dataMode} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                         <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                         <XAxis type="number" allowDecimals={false} hide />
                         <YAxis dataKey="name" type="category" width={140} tick={{fontSize: 11, fill: '#64748b'}} />
                         <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
                         <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={15} />
                    </BarChart>
                </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Categoria da Falha" icon={<AlertCircle size={16}/>}>
               <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dataCat} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                         <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                         <XAxis type="number" allowDecimals={false} hide />
                         <YAxis dataKey="name" type="category" width={140} tick={{fontSize: 11, fill: '#64748b'}} />
                         <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
                         <Bar dataKey="count" fill="#ec4899" radius={[0, 4, 4, 0]} barSize={15} />
                    </BarChart>
                </ResponsiveContainer>
          </ChartCard>

      </div>
    </div>
  );
};
