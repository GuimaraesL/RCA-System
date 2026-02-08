
import React, { useMemo, useState, useEffect } from 'react';
import { AssetNode, RcaRecord } from '../types';
import { STATUS_IDS } from '../constants/SystemConstants';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { Clock, TrendingUp, AlertCircle, CheckCircle, PieChart as PieIcon, Activity, MousePointerClick } from 'lucide-react';
import { FilterBar, FilterState } from './FilterBar';
import { useFilterPersistence } from '../hooks/useFilterPersistence';
import { useRcaContext } from '../context/RcaContext';
import { useLanguage } from '../context/LanguageDefinition'; // i18n
import { filterAssetsByUsage } from '../services/utils';
import { AnimatedCounter } from './ui/AnimatedCounter';
import { useEnterAnimation } from '../hooks/useEnterAnimation';
import { Skeleton } from './ui/Skeleton';
import { SafeResponsiveContainer } from './ui/SafeResponsiveContainer';
import { Info } from 'lucide-react';

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

// --- Reusable Chart Card ---
const ChartCard: React.FC<{
    title: string;
    children: React.ReactNode;
    isInteractive?: boolean;
    isLoading?: boolean;
}> = ({ title, children, icon, isInteractive, isLoading }) => {
    const { t } = useLanguage();
    return (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col min-h-[420px] transition-all hover:shadow-md relative group overflow-hidden">
            <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2 flex-shrink-0">
                <div className="flex items-center gap-2">
                    {icon && <span className="text-slate-400">{icon}</span>}
                    <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">{title}</h3>
                </div>
                {isInteractive && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-blue-500 flex items-center gap-1">
                        <MousePointerClick size={12} /> {t('common.filter')}
                    </div>
                )}
            </div>
            <div className="flex-1 w-full relative">
                {isLoading ? (
                    <div className="h-full w-full flex flex-col gap-4">
                        <Skeleton className="flex-1 w-full" />
                        <div className="flex justify-between gap-2">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-20" />
                        </div>
                    </div>
                ) : children}
            </div>
        </div>
    );
};

export const Dashboard: React.FC = () => {
    const { records, assets, taxonomy, isLoading } = useRcaContext();
    const { t, language } = useLanguage();

    // Animation Refs
    const kpiRef = useEnterAnimation([]);
    const chartsRef = useEnterAnimation([]);

    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);

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
        const item = (taxonomy[type] as any[]).find((i: any) => i.id === id);
        return item ? item.name : id;
    };

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

    const dynamicOptions = useMemo(() => {
        const matchesGlobal = (r: RcaRecord) => {
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

            return matchesSearch && matchesYear && matchesMonth;
        };

        const matchesAssets = (r: RcaRecord) => {
            if (filters.subgroup !== 'ALL' && r.subgroup_id !== filters.subgroup) return false;
            if (filters.equipment !== 'ALL' && r.equipment_id !== filters.equipment) return false;
            if (filters.area !== 'ALL' && r.area_id !== filters.area) return false;
            return true;
        };

        const matchesAttributes = (r: RcaRecord, ignore: 'status' | 'type' | 'specialty' | null) => {
            if (ignore !== 'status' && filters.status !== 'ALL' && r.status !== filters.status) return false;
            if (ignore !== 'type' && filters.analysisType !== 'ALL' && r.analysis_type !== filters.analysisType) return false;
            if (ignore !== 'specialty' && filters.specialty !== 'ALL' && r.specialty_id !== filters.specialty) return false;
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

        const usedRootCauses = new Set<string>();
        records.filter(r => matchesGlobal(r) && matchesAssets(r) && matchesAttributes(r, null)).forEach(r => {
            r.root_causes?.forEach(rc => {
                if (rc.root_cause_m_id) usedRootCauses.add(rc.root_cause_m_id);
            });
        });

        return {
            assets: filterAssetsByUsage(assets, usedAssetIds),
            statuses: taxonomy.analysisStatuses.filter(s => usedStatuses.has(s.id)),
            specialties: taxonomy.specialties.filter(s => usedSpecialties.has(s.id)),
            analysisTypes: taxonomy.analysisTypes.filter(t => usedTypes.has(t.id)),
            rootCause6Ms: taxonomy.rootCauseMs.filter(rc => usedRootCauses.has(rc.id))
        };
    }, [records, assets, taxonomy, filters]);

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

            let matchesRootCause = filters.rootCause6M === 'ALL' || r.root_causes?.some(rc => rc.root_cause_m_id === filters.rootCause6M);

            return matchesSearch && matchesYear && matchesMonth && matchesStatus && matchesSpecialty && matchesType && matchesAsset && matchesRootCause;
        });
    }, [records, filters]);

    const handleChartClick = (field: keyof FilterState, id: string) => {
        if (!id) return;
        setFilters((prev) => {
            const currentValue = prev[field];
            const newValue = currentValue === id ? 'ALL' : id;
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

    const aggregateCount = (keyFn: (r: any) => string, nameResolver: (id: string) => string) => {
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

    const translateStatus = (id: string, name: string) => {
        switch (id) {
            case STATUS_IDS.IN_PROGRESS: return t('status.inProgress');
            case STATUS_IDS.CONCLUDED: return t('status.completed');
            case STATUS_IDS.WAITING_VERIFICATION: return t('status.waiting');
            case STATUS_IDS.CANCELLED: return t('status.canceled');
            case STATUS_IDS.DELAYED: return t('status.delayed');
            default: return name || id;
        }
    };

    const dataStatus = aggregateCount(r => r.status, id => {
        const rawName = resolveTaxonomyName('analysisStatuses', id);
        return translateStatus(id, rawName);
    });
    const dataType = aggregateCount(r => r.analysis_type, id => resolveTaxonomyName('analysisTypes', id));
    const dataEquip = aggregateCount(r => r.equipment_id, id => resolveAssetName(id));
    const dataSub = aggregateCount(r => r.subgroup_id, id => resolveAssetName(id));
    const dataComp = aggregateCount(r => r.component_type, id => resolveTaxonomyName('componentTypes', id));
    const dataMode = aggregateCount(r => r.failure_mode_id, id => resolveTaxonomyName('failureModes', id));
    const dataCat = aggregateCount(r => r.failure_category_id, id => resolveTaxonomyName('failureCategories', id));

    const dataRootCause = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredRecords.forEach(r => {
            r.root_causes?.forEach(rc => {
                if (rc.root_cause_m_id) counts[rc.root_cause_m_id] = (counts[rc.root_cause_m_id] || 0) + 1;
            });
        });
        return Object.keys(counts)
            .map(id => ({ id, name: resolveTaxonomyName('rootCauseMs', id), count: counts[id] }))
            .sort((a, b) => b.count - a.count);
    }, [filteredRecords, taxonomy]);

    const totalDowntimeMin = filteredRecords.reduce((acc, r) => acc + (r.downtime_minutes || 0), 0);
    const totalDowntimeHours = totalDowntimeMin / 60;
    const totalCost = filteredRecords.reduce((acc, r) => acc + (r.financial_impact || 0), 0);

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
                        assets: dynamicOptions.assets,
                        rootCause6Ms: dynamicOptions.rootCause6Ms
                    }}
                    isGlobal={isGlobal}
                    onGlobalToggle={toggleGlobal}
                />
            </div>

            {/* KPI Cards */}
            <div ref={kpiRef as any} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: t('dashboard.kpi.durationMin'), value: totalDowntimeMin, icon: <Clock size={14} />, color: 'text-blue-600', tooltip: t('dashboard.tooltips.durationMin') },
                    { label: t('dashboard.kpi.durationHours'), value: Number(totalDowntimeHours.toFixed(1)), icon: <Clock size={14} />, color: 'text-indigo-600', tooltip: t('dashboard.tooltips.durationHours') },
                    { label: t('dashboard.kpi.totalCost'), value: totalCost, icon: <TrendingUp size={14} />, color: 'text-emerald-600', prefix: language === 'pt' ? 'R$ ' : '$', tooltip: t('dashboard.tooltips.totalCost') },
                    { label: t('dashboard.kpi.totalRcas'), value: filteredRecords.length, icon: <PieIcon size={14} />, color: 'text-slate-500', tooltip: t('dashboard.tooltips.totalRcas') }
                ].map((kpi, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group hover:border-blue-300 transition-colors">
                        <div className={`text-xs ${kpi.color} font-bold uppercase tracking-wider mb-2 flex items-center justify-between`}>
                            <div className="flex items-center gap-1">{kpi.icon} {kpi.label}</div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity" title={kpi.tooltip}>
                                <Info size={14} className="text-slate-300 cursor-help" />
                            </div>
                        </div>
                        <div className="text-4xl font-bold text-slate-800 relative z-10">
                            {isLoading ? (
                                <Skeleton className="h-10 w-3/4" />
                            ) : (
                                <AnimatedCounter value={kpi.value} prefix={kpi.prefix} />
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Grid */}
            <div ref={chartsRef as any} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <ChartCard title={t('dashboard.charts.totalByStatus')} icon={<CheckCircle size={16} />} isInteractive isLoading={isLoading}>
                    {isMounted && dataStatus.length > 0 ? (
                        <SafeResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
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
                                >
                                    {dataStatus.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} opacity={filters.status !== 'ALL' && filters.status !== entry.id ? 0.2 : 1} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                            </PieChart>
                        </SafeResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-slate-300 text-sm">{t('dashboard.charts.noData')}</div>}
                </ChartCard>

                <ChartCard title={t('dashboard.charts.totalByType')} icon={<PieIcon size={16} />} isInteractive>
                    {isMounted && dataType.length > 0 ? (
                        <SafeResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
                            <PieChart>
                                <Pie
                                    data={dataType}
                                    cx="50%" cy="50%"
                                    outerRadius={100}
                                    dataKey="count"
                                    onClick={(data) => handleChartClick('analysisType', data.id)}
                                    cursor="pointer"
                                >
                                    {dataType.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} opacity={filters.analysisType !== 'ALL' && filters.analysisType !== entry.id ? 0.2 : 1} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </SafeResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-slate-300 text-sm">{t('dashboard.charts.noData')}</div>}
                </ChartCard>

                <ChartCard title={t('dashboard.charts.rootCause6M')} icon={<PieIcon size={16} />} isInteractive>
                    {isMounted && dataRootCause.length > 0 ? (
                        <SafeResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
                            <PieChart>
                                <Pie
                                    data={dataRootCause}
                                    cx="50%" cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={2}
                                    dataKey="count"
                                    onClick={(data) => handleChartClick('rootCause6M', data.id)}
                                    cursor="pointer"
                                >
                                    {dataRootCause.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} opacity={filters.rootCause6M !== 'ALL' && filters.rootCause6M !== entry.id ? 0.2 : 1} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                            </PieChart>
                        </SafeResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-slate-300 text-sm">{t('dashboard.charts.noData')}</div>}
                </ChartCard>

                <ChartCard title={t('dashboard.charts.topEquipments')} icon={<TrendingUp size={16} />} isInteractive>
                    {isMounted && dataEquip.length > 0 ? (
                        <SafeResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
                            <BarChart data={dataEquip} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 11 }} tickFormatter={(val) => truncateLabel(val)} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20} onClick={(data) => handleChartClick('equipment', data.id)} cursor="pointer">
                                    {dataEquip.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill="#3b82f6" opacity={filters.equipment !== 'ALL' && filters.equipment !== entry.id ? 0.2 : 1} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </SafeResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-slate-300 text-sm">{t('dashboard.charts.noData')}</div>}
                </ChartCard>

                <ChartCard title={t('dashboard.charts.topSubgroups')} icon={<TrendingUp size={16} />} isInteractive>
                    {isMounted && dataSub.length > 0 ? (
                        <SafeResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
                            <BarChart data={dataSub} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 11 }} tickFormatter={(val) => truncateLabel(val)} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20} onClick={(data) => handleChartClick('subgroup', data.id)} cursor="pointer">
                                    {dataSub.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill="#06b6d4" opacity={filters.subgroup !== 'ALL' && filters.subgroup !== entry.id ? 0.2 : 1} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </SafeResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-slate-300 text-sm">{t('dashboard.charts.noData')}</div>}
                </ChartCard>

                <ChartCard title={t('dashboard.charts.totalByComponent')} icon={<AlertCircle size={16} />} isInteractive>
                    {isMounted && dataComp.length > 0 ? (
                        <SafeResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
                            <BarChart data={dataComp} margin={{ bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} tickFormatter={(val) => truncateLabel(val)} />
                                <YAxis allowDecimals={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} onClick={(data) => handleChartClick('componentType', data.id)} cursor="pointer">
                                    {dataComp.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} opacity={filters.componentType !== 'ALL' && filters.componentType !== entry.id ? 0.2 : 1} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </SafeResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-slate-300 text-sm">{t('dashboard.charts.noData')}</div>}
                </ChartCard>

                <ChartCard title={t('dashboard.charts.failureMode')} icon={<AlertCircle size={16} />} isInteractive>
                    {isMounted && dataMode.length > 0 ? (
                        <SafeResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
                            <BarChart data={dataMode} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 11 }} tickFormatter={(val) => truncateLabel(val)} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={15} onClick={(data) => handleChartClick('failureMode', data.id)} cursor="pointer">
                                    {dataMode.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill="#8b5cf6" opacity={filters.failureMode !== 'ALL' && filters.failureMode !== entry.id ? 0.2 : 1} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </SafeResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-slate-300 text-sm">{t('dashboard.charts.noData')}</div>}
                </ChartCard>
            </div>
        </div>
    );
};
