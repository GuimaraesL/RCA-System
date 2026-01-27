
import React, { useMemo } from 'react';
import { AssetNode } from '../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { Clock, TrendingUp, AlertCircle, CheckCircle, PieChart as PieIcon, Activity, MousePointerClick } from 'lucide-react';
import { FilterBar, FilterState } from './FilterBar';
import { useFilterPersistence } from '../hooks/useFilterPersistence';
import { useRcaContext } from '../context/RcaContext';
import { useLanguage } from '../context/LanguageDefinition'; // i18n
import { filterAssetsByUsage } from '../services/utils';
import { AnimatedCounter } from './ui/AnimatedCounter';
import { useEnterAnimation } from '../hooks/useEnterAnimation';

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
    const { t } = useLanguage();
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/95 backdrop-blur-sm p-3 border border-slate-200 shadow-lg rounded-lg text-sm z-50">
                <p className="font-bold text-slate-800 mb-1">{label || payload[0].payload.name}</p>
                <p className="text-blue-600 font-medium">
                    {payload[0].value} <span className="text-slate-500 text-xs">{t('dashboard.tooltips.records')}</span>
                </p>
                {payload[0].payload.id && (
                    <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wide">
                        {t('dashboard.tooltips.clickToFilter')}
                    </p>
                )}
            </div>
        );
    }
    return null;
};

const truncateLabel = (text: string, maxLength: number = 25) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
};

export const Dashboard: React.FC = () => {
    const { records, assets, taxonomy } = useRcaContext();
    const { t, language } = useLanguage();

    // Animation Refs
    const kpiRef = useEnterAnimation([]);
    const chartsRef = useEnterAnimation([]);

    const defaultFilters: FilterState = {
        searchTerm: '',
        year: '',
        months: [],
        status: 'ALL',
        area: 'ALL',
        equipment: 'ALL',
        subgroup: 'ALL',
        specialty: 'ALL',
        analysisType: 'ALL',
        // New filters
        failureMode: 'ALL',
        failureCategory: 'ALL',
        componentType: 'ALL',
        rootCause6M: 'ALL'
    };

    const { showFilters, setShowFilters, filters, setFilters, handleReset, isGlobal, toggleGlobal } = useFilterPersistence(
        'rca_dashboard_v3',
        defaultFilters,
        false
    );

    const resolveTaxonomyName = (type: keyof typeof taxonomy, id: string) => {
        if (!taxonomy || !taxonomy[type]) return id;
        const item = (taxonomy[type] as any[]).find((t: any) => t.id === id);
        return item ? item.name : id;
    };

    // Performance Optimization: Flatten Asset Tree to Map O(1)
    // --- Optimization: O(1) Asset Lookup ---
    // Instead of recursive search O(N*M) inside the loop, we flatten the tree once O(N)
    // and use a Hash Map for instant retrieval O(1).
    const assetMap = useMemo(() => {
        const map = new Map<string, string>();
        const traverse = (nodes: AssetNode[]) => {
            nodes.forEach(n => {
                map.set(n.id, n.name);
                if (n.children) traverse(n.children);
            });
        };
        traverse(assets);
        return map;
    }, [assets]);

    const resolveAssetName = (id: string) => assetMap.get(id) || id;

    // --- Strict Cross-Filtering Logic for Options ---
    const dynamicOptions = useMemo(() => {
        // Basic Global Filters
        const matchesGlobal = (r: any) => {
            const searchLower = filters.searchTerm.toLowerCase();
            const matchesSearch = !filters.searchTerm ||
                r.what?.toLowerCase().includes(searchLower) ||
                r.problem_description?.toLowerCase().includes(searchLower) ||
                r.id.toLowerCase().includes(searchLower) ||
                // Extended Search (Task 44/53)
                r.who?.toLowerCase().includes(searchLower) ||
                r.where_description?.toLowerCase().includes(searchLower) ||
                r.participants?.some((p: string) => p.toLowerCase().includes(searchLower)) ||
                r.root_causes?.some((rc: any) => rc.cause.toLowerCase().includes(searchLower));

            const rDate = new Date(r.failure_date);
            const rYear = rDate.getFullYear().toString();
            const rMonth = (rDate.getMonth() + 1).toString().padStart(2, '0');
            const matchesYear = !filters.year || rYear === filters.year;
            const matchesMonth = filters.months.length === 0 || filters.months.includes(rMonth);

            return matchesSearch && matchesYear && matchesMonth;
        };

        // Asset Filters
        const matchesAssets = (r: any) => {
            if (filters.subgroup !== 'ALL' && r.subgroup_id !== filters.subgroup) return false;
            if (filters.equipment !== 'ALL' && r.equipment_id !== filters.equipment) return false;
            if (filters.area !== 'ALL' && r.area_id !== filters.area) return false;
            return true;
        };

        // Technical Filters
        const matchesAttributes = (r: any, ignore: 'status' | 'type' | 'specialty' | null) => {
            if (ignore !== 'status' && filters.status !== 'ALL' && r.status !== filters.status) return false;
            if (ignore !== 'type' && filters.analysisType !== 'ALL' && r.analysis_type !== filters.analysisType) return false;
            if (ignore !== 'specialty' && filters.specialty !== 'ALL' && r.specialty_id !== filters.specialty) return false;

            // Deep filters (Chart Clicks)
            if (filters.failureMode !== 'ALL' && r.failure_mode_id !== filters.failureMode) return false;
            if (filters.failureCategory !== 'ALL' && r.failure_category_id !== filters.failureCategory) return false;
            if (filters.componentType !== 'ALL' && r.component_type !== filters.componentType) return false;
            if (filters.rootCause6M !== 'ALL') {
                // 6M Logic: Pass if ANY root cause matches the filter
                const hasCause = r.root_causes?.some((rc: any) => rc.root_cause_m_id === filters.rootCause6M);
                if (!hasCause) return false;
            }

            return true;
        };

        const recordsForAssets = records.filter(r => matchesGlobal(r) && matchesAttributes(r, null));
        const usedAssetIds = new Set<string>();
        recordsForAssets.forEach(r => {
            if (r.area_id) usedAssetIds.add(r.area_id);
            if (r.equipment_id) usedAssetIds.add(r.equipment_id);
            if (r.subgroup_id) usedAssetIds.add(r.subgroup_id);
        });

        const recordsForStatuses = records.filter(r => matchesGlobal(r) && matchesAssets(r) && matchesAttributes(r, 'status'));
        const usedStatuses = new Set(recordsForStatuses.map(r => r.status));

        const recordsForSpecialties = records.filter(r => matchesGlobal(r) && matchesAssets(r) && matchesAttributes(r, 'specialty'));
        const usedSpecialties = new Set(recordsForSpecialties.map(r => r.specialty_id));

        const recordsForTypes = records.filter(r => matchesGlobal(r) && matchesAssets(r) && matchesAttributes(r, 'type'));
        const usedTypes = new Set(recordsForTypes.map(r => r.analysis_type));

        return {
            assets: filterAssetsByUsage(assets, usedAssetIds),
            statuses: taxonomy.analysisStatuses.filter(s => usedStatuses.has(s.id)),
            specialties: taxonomy.specialties.filter(s => usedSpecialties.has(s.id)),
            analysisTypes: taxonomy.analysisTypes.filter(t => usedTypes.has(t.id))
        };
    }, [records, assets, taxonomy, filters]);

    // --- Main Filtering Logic ---
    const filteredRecords = useMemo(() => {
        return records.filter(r => {
            const searchLower = filters.searchTerm.toLowerCase();
            const matchesSearch = !filters.searchTerm ||
                r.what?.toLowerCase().includes(searchLower) ||
                r.problem_description?.toLowerCase().includes(searchLower) ||
                r.id.toLowerCase().includes(searchLower) ||
                // Extended Search (Task 44/53)
                r.who?.toLowerCase().includes(searchLower) ||
                r.where_description?.toLowerCase().includes(searchLower) ||
                r.participants?.some((p: string) => p.toLowerCase().includes(searchLower)) ||
                r.root_causes?.some((rc: any) => rc.cause.toLowerCase().includes(searchLower));

            const rDate = new Date(r.failure_date);
            const rYear = rDate.getFullYear().toString();
            const rMonth = (rDate.getMonth() + 1).toString().padStart(2, '0');

            const matchesYear = !filters.year || rYear === filters.year;
            const matchesMonth = filters.months.length === 0 || filters.months.includes(rMonth);

            // Standard dropdown filters
            const matchesStatus = filters.status === 'ALL' || r.status === filters.status;
            const matchesSpecialty = filters.specialty === 'ALL' || r.specialty_id === filters.specialty;
            const matchesType = filters.analysisType === 'ALL' || r.analysis_type === filters.analysisType;

            // Hierarchy
            let matchesAsset = true;
            if (filters.subgroup !== 'ALL') matchesAsset = r.subgroup_id === filters.subgroup;
            else if (filters.equipment !== 'ALL') matchesAsset = r.equipment_id === filters.equipment;
            else if (filters.area !== 'ALL') matchesAsset = r.area_id === filters.area;

            // Advanced Chart Filters (Click-through)
            const matchesFailureMode = filters.failureMode === 'ALL' || r.failure_mode_id === filters.failureMode;
            const matchesFailureCategory = filters.failureCategory === 'ALL' || r.failure_category_id === filters.failureCategory;
            const matchesComponent = filters.componentType === 'ALL' || r.component_type === filters.componentType;

            let matches6M = true;
            if (filters.rootCause6M !== 'ALL') {
                matches6M = r.root_causes?.some((rc: any) => rc.root_cause_m_id === filters.rootCause6M);
            }

            return matchesSearch && matchesYear && matchesMonth && matchesStatus && matchesSpecialty && matchesType && matchesAsset && matchesFailureMode && matchesFailureCategory && matchesComponent && matches6M;
        });
    }, [records, filters]);

    // --- Cross Filtering Interaction ---
    const handleChartClick = (field: keyof FilterState, id: string) => {
        if (!id) return;

        setFilters((prev) => {
            const currentValue = prev[field];
            // Toggle logic: If clicking the already selected item, reset to ALL
            const newValue = currentValue === id ? 'ALL' : id;

            // Special handling for hierarchy reset if moving up/down (optional but cleaner)
            const updates: any = { [field]: newValue };
            if (field === 'area' && newValue === 'ALL') {
                updates.equipment = 'ALL';
                updates.subgroup = 'ALL';
            }
            if (field === 'equipment' && newValue === 'ALL') {
                updates.subgroup = 'ALL';
            }

            return { ...prev, ...updates };
        });
    };

    // --- Aggregation Functions (Modified to keep IDs) ---
    const aggregateCount = (
        keyFn: (r: any) => string,
        nameResolver: (id: string) => string
    ) => {
        const counts: Record<string, number> = {};
        filteredRecords.forEach(r => {
            const key = keyFn(r);
            if (key) counts[key] = (counts[key] || 0) + 1;
        });
        return Object.keys(counts)
            .map(id => ({ id, name: nameResolver(id), count: counts[id] }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    };

    // 1. Data Prep with IDs
    const dataStatus = aggregateCount(r => r.status, id => resolveTaxonomyName('analysisStatuses', id));
    const dataType = aggregateCount(r => r.analysis_type, id => resolveTaxonomyName('analysisTypes', id));
    const dataEquip = aggregateCount(r => r.equipment_id, id => resolveAssetName(id));
    const dataSub = aggregateCount(r => r.subgroup_id, id => resolveAssetName(id));

    // 2. New Data Preps for Bottom Charts
    const dataComp = aggregateCount(r => r.component_type, id => resolveTaxonomyName('componentTypes', id));
    const dataMode = aggregateCount(r => r.failure_mode_id, id => resolveTaxonomyName('failureModes', id));
    const dataCat = aggregateCount(r => r.failure_category_id, id => resolveTaxonomyName('failureCategories', id));

    // 3. 6M Special Aggregation (Fixed to use ID as Key)
    const rootCauseCounts: Record<string, number> = {};
    filteredRecords.forEach(r => {
        r.root_causes?.forEach(rc => {
            if (rc.root_cause_m_id) {
                // Use ID as key, not name, to allow filtering
                rootCauseCounts[rc.root_cause_m_id] = (rootCauseCounts[rc.root_cause_m_id] || 0) + 1;
            }
        });
    });
    const data6M = Object.keys(rootCauseCounts)
        .map(id => ({ id, name: resolveTaxonomyName('rootCauseMs', id), count: rootCauseCounts[id] }))
        .sort((a, b) => b.count - a.count);

    // KPIs
    const totalDowntimeMin = filteredRecords.reduce((acc, r) => acc + (r.downtime_minutes || 0), 0);
    const totalDowntimeHours = filteredRecords.reduce((acc, r) => acc + ((r.downtime_minutes || 0) / 60), 0);
    const totalCost = filteredRecords.reduce((acc, r) => acc + (r.financial_impact || 0), 0);

    // --- Reusable Chart Card ---
    const ChartCard: React.FC<{
        title: string;
        children: React.ReactNode;
        icon?: React.ReactNode;
        isInteractive?: boolean;
    }> = ({ title, children, icon, isInteractive }) => (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-[350px] transition-all hover:shadow-md relative group">
            <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2">
                <div className="flex items-center gap-2">
                    {icon && <span className="text-slate-400">{icon}</span>}
                    <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">{title}</h3>
                </div>
                {isInteractive && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-blue-500 flex items-center gap-1">
                        <MousePointerClick size={12} /> Filter
                    </div>
                )}
            </div>
            <div className="flex-1 w-full min-h-0 relative">
                {children}
            </div>
        </div>
    );

    return (
        <div className="p-8 space-y-8 max-w-[1600px] mx-auto pb-20">

            {/* Header */}
            <div className="flex justify-between items-end animate-in fade-in duration-700 slide-in-from-top-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <Activity className="text-blue-600" /> {t('dashboard.title')}
                    </h1>
                    <p className="text-slate-500 mt-1">{t('dashboard.description')}</p>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="animate-in fade-in duration-700 slide-in-from-top-4 delay-100">
                <FilterBar
                    isOpen={showFilters}
                    onToggle={() => setShowFilters(!showFilters)}
                    filters={filters}
                    onFilterChange={setFilters}
                    onReset={() => handleReset(defaultFilters)}
                    totalResults={filteredRecords.length}
                    config={{ showSearch: true, showDate: true, showStatus: true, showAssetHierarchy: true, showSpecialty: true, showAnalysisType: true }}
                    options={{
                        statuses: dynamicOptions.statuses,
                        specialties: dynamicOptions.specialties,
                        analysisTypes: dynamicOptions.analysisTypes,
                        assets: dynamicOptions.assets
                    }}
                    isGlobal={isGlobal}
                    onGlobalToggle={toggleGlobal}
                />
            </div>

            {/* KPI Cards */}
            <div ref={kpiRef as any} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-white to-blue-50 p-6 rounded-2xl shadow-sm border border-blue-100 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-blue-100 rounded-full -mr-8 -mt-8 opacity-50 group-hover:scale-110 transition-transform"></div>
                    <div className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-2 flex items-center gap-1"><Clock size={14} /> {t('dashboard.kpi.durationMin')}</div>
                    <div className="text-4xl font-bold text-slate-800 relative z-10">
                        <AnimatedCounter value={totalDowntimeMin} />
                    </div>
                </div>
                <div className="bg-gradient-to-br from-white to-indigo-50 p-6 rounded-2xl shadow-sm border border-indigo-100 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-100 rounded-full -mr-8 -mt-8 opacity-50 group-hover:scale-110 transition-transform"></div>
                    <div className="text-xs text-indigo-600 font-bold uppercase tracking-wider mb-2 flex items-center gap-1"><Clock size={14} /> {t('dashboard.kpi.durationHours')}</div>
                    <div className="text-4xl font-bold text-slate-800 relative z-10">
                        <AnimatedCounter value={Number(totalDowntimeHours.toFixed(1))} className="tabular-nums" />
                    </div>
                </div>
                <div className="bg-gradient-to-br from-white to-emerald-50 p-6 rounded-2xl shadow-sm border border-emerald-100 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-100 rounded-full -mr-8 -mt-8 opacity-50 group-hover:scale-110 transition-transform"></div>
                    <div className="text-xs text-emerald-600 font-bold uppercase tracking-wider mb-2 flex items-center gap-1"><TrendingUp size={14} /> {t('dashboard.kpi.totalCost')}</div>
                    <div className="text-4xl font-bold text-slate-800 relative z-10">
                        <AnimatedCounter value={totalCost} prefix={language === 'pt' ? 'R$ ' : '$'} className="tabular-nums" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group">
                    <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2 flex items-center gap-1"><PieIcon size={14} /> {t('dashboard.kpi.totalRcas')}</div>
                    <div className="text-4xl font-bold text-slate-800 relative z-10">
                        <AnimatedCounter value={filteredRecords.length} />
                    </div>
                    <div className="text-xs text-slate-400 mt-2">{t('dashboard.kpi.filteredRecords')}</div>
                </div>
            </div>

            {/* Main Grid: 2 Columns for better readability */}
            <div ref={chartsRef as any} className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Row 1: High Level Distribution (Interactive) */}
                <ChartCard title={t('dashboard.charts.totalByStatus')} icon={<CheckCircle size={16} />} isInteractive>
                    {dataStatus.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={dataStatus}
                                    cx="50%" cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={2}
                                    dataKey="count"
                                    onClick={(data) => handleChartClick('status', data.id)}
                                    cursor="pointer"
                                    isAnimationActive={true}
                                >
                                    {dataStatus.map((entry, index) => {
                                        const isDimmed = filters.status !== 'ALL' && filters.status !== entry.id;
                                        return (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={COLORS[index % COLORS.length]}
                                                stroke="none"
                                                opacity={isDimmed ? 0.2 : 1}
                                            />
                                        );
                                    })}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    verticalAlign="middle"
                                    align="right"
                                    layout="vertical"
                                    iconType="circle"
                                    onClick={(e: any) => handleChartClick('status', e.payload.id)}
                                    wrapperStyle={{ cursor: 'pointer' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-slate-300 text-sm">Sem dados</div>}
                </ChartCard>

                <ChartCard title={t('dashboard.charts.totalByType')} icon={<PieIcon size={16} />} isInteractive>
                    {dataType.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={dataType}
                                    cx="50%" cy="50%"
                                    outerRadius={100}
                                    dataKey="count"
                                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                    onClick={(data) => handleChartClick('analysisType', data.id)}
                                    cursor="pointer"
                                    isAnimationActive={true}
                                >
                                    {dataType.map((entry, index) => {
                                        const isDimmed = filters.analysisType !== 'ALL' && filters.analysisType !== entry.id;
                                        return (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={COLORS[(index + 3) % COLORS.length]}
                                                stroke="white"
                                                strokeWidth={2}
                                                opacity={isDimmed ? 0.2 : 1}
                                            />
                                        );
                                    })}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    onClick={(e: any) => handleChartClick('analysisType', e.payload.id)}
                                    wrapperStyle={{ cursor: 'pointer' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-slate-300 text-sm">Sem dados</div>}
                </ChartCard>

                {/* Row 2: Assets (Interactive) */}
                <ChartCard title={t('dashboard.charts.topEquipments')} icon={<TrendingUp size={16} />} isInteractive>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={dataEquip}
                            layout="vertical"
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                            <XAxis type="number" allowDecimals={false} hide />
                            <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(value) => truncateLabel(value)} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                            <Bar
                                dataKey="count"
                                radius={[0, 4, 4, 0]}
                                barSize={20}
                                onClick={(data) => handleChartClick('equipment', data.id)}
                                cursor="pointer"
                                isAnimationActive={true}
                            >
                                {dataEquip.map((entry, index) => {
                                    const isDimmed = filters.equipment !== 'ALL' && filters.equipment !== entry.id;
                                    return <Cell key={`cell-${index}`} fill="#3b82f6" opacity={isDimmed ? 0.2 : 1} />;
                                })}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title={t('dashboard.charts.topSubgroups')} icon={<TrendingUp size={16} />} isInteractive>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={dataSub}
                            layout="vertical"
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                            <XAxis type="number" allowDecimals={false} hide />
                            <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(value) => truncateLabel(value)} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                            <Bar
                                dataKey="count"
                                radius={[0, 4, 4, 0]}
                                barSize={20}
                                onClick={(data) => handleChartClick('subgroup', data.id)}
                                cursor="pointer"
                                isAnimationActive={true}
                            >
                                {dataSub.map((entry, index) => {
                                    const isDimmed = filters.subgroup !== 'ALL' && filters.subgroup !== entry.id;
                                    return <Cell key={`cell-${index}`} fill="#06b6d4" opacity={isDimmed ? 0.2 : 1} />;
                                })}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* Row 3: Technical Details (Interactive) */}
                <ChartCard title={t('dashboard.charts.rootCauses6M')} icon={<AlertCircle size={16} />} isInteractive>
                    {data6M.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data6M}
                                    cx="50%" cy="50%"
                                    innerRadius={60} // Increased inner radius for better look
                                    outerRadius={90} // Increased outer radius
                                    paddingAngle={5}
                                    dataKey="count"
                                    // Removed 'label' prop to clean up visualization
                                    onClick={(data) => handleChartClick('rootCause6M', data.id)}
                                    cursor="pointer"
                                    isAnimationActive={true}
                                >
                                    {data6M.map((entry, index) => {
                                        const isDimmed = filters.rootCause6M !== 'ALL' && filters.rootCause6M !== entry.id;
                                        return (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={COLORS[index % COLORS.length]}
                                                stroke="none"
                                                opacity={isDimmed ? 0.2 : 1}
                                            />
                                        );
                                    })}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    onClick={(e: any) => handleChartClick('rootCause6M', e.payload.id)}
                                    wrapperStyle={{ cursor: 'pointer' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-slate-300 text-sm">{t('dashboard.charts.noData')}</div>}
                </ChartCard>

                <ChartCard title={t('dashboard.charts.totalByComponent')} icon={<AlertCircle size={16} />} isInteractive>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dataComp} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} angle={-45} textAnchor="end" height={60} tickFormatter={(value) => truncateLabel(value)} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                            <Bar
                                dataKey="count"
                                fill="#10b981"
                                radius={[4, 4, 0, 0]}
                                barSize={30}
                                onClick={(data) => handleChartClick('componentType', data.id)}
                                cursor="pointer"
                                isAnimationActive={true}
                            >
                                {dataComp.map((entry, index) => {
                                    const isDimmed = filters.componentType !== 'ALL' && filters.componentType !== entry.id;
                                    return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} opacity={isDimmed ? 0.2 : 1} />;
                                })}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title={t('dashboard.charts.failureMode')} icon={<AlertCircle size={16} />} isInteractive>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={dataMode}
                            layout="vertical"
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                            <XAxis type="number" allowDecimals={false} hide />
                            <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(value) => truncateLabel(value)} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                            <Bar
                                dataKey="count"
                                fill="#8b5cf6"
                                radius={[0, 4, 4, 0]}
                                barSize={15}
                                onClick={(data) => handleChartClick('failureMode', data.id)}
                                cursor="pointer"
                                isAnimationActive={true}
                            >
                                {dataMode.map((entry, index) => {
                                    const isDimmed = filters.failureMode !== 'ALL' && filters.failureMode !== entry.id;
                                    return <Cell key={`cell-${index}`} fill="#8b5cf6" opacity={isDimmed ? 0.2 : 1} />;
                                })}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title={t('dashboard.charts.failureCategory')} icon={<AlertCircle size={16} />} isInteractive>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={dataCat}
                            layout="vertical"
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                            <XAxis type="number" allowDecimals={false} hide />
                            <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(value) => truncateLabel(value)} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                            <Bar
                                dataKey="count"
                                fill="#ec4899"
                                radius={[0, 4, 4, 0]}
                                barSize={15}
                                onClick={(data) => handleChartClick('failureCategory', data.id)}
                                cursor="pointer"
                                isAnimationActive={true}
                            >
                                {dataCat.map((entry, index) => {
                                    const isDimmed = filters.failureCategory !== 'ALL' && filters.failureCategory !== entry.id;
                                    return <Cell key={`cell-${index}`} fill="#ec4899" opacity={isDimmed ? 0.2 : 1} />;
                                })}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

            </div>
        </div>
    );
};
