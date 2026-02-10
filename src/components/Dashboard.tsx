/**
 * Proposta: Painel analítico principal (Dashboard) para visualização de KPIs e tendências.
 * Fluxo: Agrega dados filtrados em tempo real (O(N)), resolve nomes via taxonomia e renderiza gráficos interativos usando Recharts.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { AssetNode, RcaRecord } from '../types';
import { STATUS_IDS, STATUS_COLORS, ROOT_CAUSE_COLORS } from '../constants/SystemConstants';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { Clock, TrendingUp, AlertCircle, CheckCircle, PieChart as PieIcon, Activity, MousePointerClick } from 'lucide-react';
import { FilterBar, FilterState } from './FilterBar';
import { useFilterPersistence } from '../hooks/useFilterPersistence';
import { useRcaContext } from '../context/RcaContext';
import { translateStatus, translate6M } from '../utils/statusUtils';
import { useLanguage } from '../context/LanguageDefinition'; 
import { useFilteredData } from '../hooks/useFilteredData';
import { filterAssetsByUsage } from '../services/utils';
import { AnimatedCounter } from './ui/AnimatedCounter';
import { useEnterAnimation } from '../hooks/useEnterAnimation';
import { Skeleton } from './ui/Skeleton';
import { SafeResponsiveContainer } from './ui/SafeResponsiveContainer';
import { Info } from 'lucide-react';

// Paleta de Cores Profissional (Tons Frios + Acentos)
const COLORS = [
    '#3b82f6', // Blue 500
    '#10b981', // Emerald 500
    '#f59e0b', // Amber 500
    '#6366f1', // Indigo 500
    '#ec4899', // Pink 500
    '#06b6d4', // Cyan 500
    '#6366f1', // Indigo 500
    '#ef4444', // Red 500
    '#84cc16', // Lime 500
    '#14b8a6', // Teal 500
];

/**
 * Retorna uma cor estável para um ID, garantindo que o mesmo item sempre tenha a mesma cor.
 */
const getStableColor = (id: string, mapping?: Record<string, string>) => {
    if (mapping && mapping[id]) return mapping[id];

    // Seleção baseada em hash para consistência visual
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return COLORS[Math.abs(hash) % COLORS.length];
};

const CustomTooltip = ({ active, payload, label }: any) => {
    const { t, language } = useLanguage();
    const locale = language === 'pt' ? 'pt-BR' : 'en-US';
    
    if (active && payload && payload.length) {
        const formattedValue = new Intl.NumberFormat(locale).format(payload[0].value);
        return (
            <div className="bg-white/95 backdrop-blur-sm p-3 border border-slate-200 shadow-lg rounded-lg text-sm z-50">
                <p className="font-bold text-slate-800 mb-1">{label || payload[0].payload.name}</p>
                <p className="text-blue-600 font-medium">
                    {formattedValue} <span className="text-slate-500 text-xs">{t('dashboard.tooltips.records')}</span>
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

// --- Componente de Card de Gráfico Reutilizável ---
const ChartCard: React.FC<{
    title: string;
    children: React.ReactNode;
    icon?: React.ReactNode;
    isInteractive?: boolean;
    isLoading?: boolean;
    tooltip?: string;
}> = ({ title, children, icon, isInteractive, isLoading, tooltip }) => {
    const { t } = useLanguage();
    return (
        <div title={tooltip} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col min-h-[420px] transition-all hover:shadow-md relative group overflow-hidden cursor-help">
            <div title={tooltip} className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2 flex-shrink-0">
                <div title={tooltip} className="flex items-center gap-2">
                    {icon && <span title={tooltip} className="text-slate-400">{icon}</span>}
                    <h3 title={tooltip} className="font-bold text-slate-700 text-sm uppercase tracking-wider">{title}</h3>
                </div>
                {isInteractive && (
                    <div title={tooltip} className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-blue-500 flex items-center gap-1">
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

    const kpiRef = useEnterAnimation([]);
    const chartsRef = useEnterAnimation([]);

    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);

    const defaultFilters: FilterState = {
        searchTerm: '', year: '', months: [], status: 'ALL', area: 'ALL',
        equipment: 'ALL', subgroup: 'ALL', specialty: 'ALL', analysisType: 'ALL',
        failureMode: 'ALL', failureCategory: 'ALL', componentType: 'ALL', rootCause6M: 'ALL'
    };

    const { showFilters, setShowFilters, filters, setFilters, handleReset, isGlobal, toggleGlobal } = useFilterPersistence(
        'rca_dashboard_v3',
        defaultFilters,
        false
    );

    // Orquestrador de filtros cruzados inteligentes
    const { filteredRCAs: filteredRecords } = useFilteredData(filters);

    const resolveTaxonomyName = (type: keyof typeof taxonomy, id: string) => {
        if (!taxonomy || !taxonomy[type]) return id;
        const item = (taxonomy[type] as any[]).find((i: any) => i.id === id);
        return item ? item.name : id;
    };

    /**
     * Mapeia IDs de ativos para nomes em tempo O(N) para buscas rápidas.
     */
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
        // Identifica quais ativos possuem dados vinculados para otimizar os filtros do cabeçalho
        const usedAssetIds = new Set<string>();
        records.forEach(r => {
            if (r.area_id) usedAssetIds.add(r.area_id);
            if (r.equipment_id) usedAssetIds.add(r.equipment_id);
            if (r.subgroup_id) usedAssetIds.add(r.subgroup_id);
        });

        return {
            assets: filterAssetsByUsage(assets, usedAssetIds),
            statuses: taxonomy.analysisStatuses,
            specialties: taxonomy.specialties,
            analysisTypes: taxonomy.analysisTypes,
            rootCause6Ms: taxonomy.rootCauseMs
        };
    }, [records, assets, taxonomy]);

    /**
     * Agregador de passagem única (O(N)): Processa todos os dados dos gráficos em um único loop.
     * Crucial para manter a performance com grandes volumes de dados.
     */
    const chartData = useMemo(() => {
        const counts: Record<string, Record<string, number>> = {
            status: {}, type: {}, equip: {}, sub: {}, comp: {}, mode: {}, cat: {}, root: {}
        };

        filteredRecords.forEach(r => {
            if (r.status) counts.status[r.status] = (counts.status[r.status] || 0) + 1;
            if (r.analysis_type) counts.type[r.analysis_type] = (counts.type[r.analysis_type] || 0) + 1;
            if (r.equipment_id) counts.equip[r.equipment_id] = (counts.equip[r.equipment_id] || 0) + 1;
            if (r.subgroup_id) counts.sub[r.subgroup_id] = (counts.sub[r.subgroup_id] || 0) + 1;
            if (r.component_type) counts.comp[r.component_type] = (counts.comp[r.component_type] || 0) + 1;
            if (r.failure_mode_id) counts.mode[r.failure_mode_id] = (counts.mode[r.failure_mode_id] || 0) + 1;
            if (r.failure_category_id) counts.cat[r.failure_category_id] = (counts.cat[r.failure_category_id] || 0) + 1;

            r.root_causes?.forEach(rc => {
                if (rc.root_cause_m_id) counts.root[rc.root_cause_m_id] = (counts.root[rc.root_cause_m_id] || 0) + 1;
            });
        });

        const toChart = (data: Record<string, number>, resolver: (id: string) => string) =>
            Object.entries(data)
                .map(([id, count]) => ({ id, name: resolver(id), count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);

        return {
            status: toChart(counts.status, id => translateStatus(id, resolveTaxonomyName('analysisStatuses', id), t)),
            type: toChart(counts.type, id => resolveTaxonomyName('analysisTypes', id)),
            equip: toChart(counts.equip, id => resolveAssetName(id)),
            sub: toChart(counts.sub, id => resolveAssetName(id)),
            comp: toChart(counts.comp, id => resolveTaxonomyName('componentTypes', id)),
            mode: toChart(counts.mode, id => resolveTaxonomyName('failureModes', id)),
            cat: toChart(counts.cat, id => resolveTaxonomyName('failureCategories', id)),
            root: toChart(counts.root, id => translate6M(id, resolveTaxonomyName('rootCauseMs', id), t))
        };
    }, [filteredRecords, taxonomy, assetMap, t]); 

    const { status: dataStatus, type: dataType, equip: dataEquip, sub: dataSub, comp: dataComp, mode: dataMode, cat: dataCat, root: dataRootCause } = chartData;

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

    const totalDowntimeMin = useMemo(() => filteredRecords.reduce((acc, r) => acc + (r.downtime_minutes || 0), 0), [filteredRecords]);
    const totalDowntimeHours = totalDowntimeMin / 60;
    const totalCost = useMemo(() => filteredRecords.reduce((acc, r) => acc + (r.financial_impact || 0), 0), [filteredRecords]);

    return (
        <div className="p-8 space-y-8 max-w-[1600px] mx-auto pb-20">
            {/* Cabeçalho */}
            <div className="flex justify-between items-end animate-in fade-in duration-700 slide-in-from-top-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <Activity className="text-blue-600" /> {t('dashboard.title')}
                    </h1>
                    <p className="text-slate-500 mt-1">{t('dashboard.description')}</p>
                </div>
            </div>

            {/* Barra de Filtros */}
            <div className="animate-in fade-in duration-700 slide-in-from-top-4 delay-100">
                <FilterBar
                    isOpen={showFilters}
                    onToggle={() => setShowFilters(!showFilters)}
                    filters={filters}
                    onFilterChange={setFilters}
                    onReset={() => handleReset(defaultFilters)}
                    totalResults={filteredRecords.length}
                    config={{ showSearch: true, showDate: true, showStatus: true, showAssetHierarchy: true, showSpecialty: true, showAnalysisType: true, showComponentType: true }}
                    options={{
                        statuses: dynamicOptions.statuses,
                        specialties: dynamicOptions.specialties,
                        analysisTypes: dynamicOptions.analysisTypes,
                        assets: dynamicOptions.assets,
                        rootCause6Ms: dynamicOptions.rootCause6Ms,
                        componentTypes: taxonomy.componentTypes,
                        failureModes: taxonomy.failureModes,
                        failureCategories: taxonomy.failureCategories
                    }}
                    isGlobal={isGlobal}
                    onGlobalToggle={toggleGlobal}
                />
            </div>

            {/* Cartões de KPI */}
            <div ref={kpiRef as any} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: t('dashboard.kpi.durationMin'), value: totalDowntimeMin, icon: <Clock size={14} />, color: 'text-blue-600', tooltip: t('dashboard.tooltips.durationMin') },
                    { label: t('dashboard.kpi.durationHours'), value: Number(totalDowntimeHours.toFixed(1)), icon: <Clock size={14} />, color: 'text-indigo-600', tooltip: t('dashboard.tooltips.durationHours') },
                    { label: t('dashboard.kpi.totalCost'), value: totalCost, icon: <TrendingUp size={14} />, color: 'text-emerald-600', prefix: language === 'pt' ? 'R$ ' : '$', tooltip: t('dashboard.tooltips.totalCost') },
                    { label: t('dashboard.kpi.totalRcas'), value: filteredRecords.length, icon: <PieIcon size={14} />, color: 'text-slate-500', tooltip: t('dashboard.tooltips.totalRcas') }
                ].map((kpi, i) => (
                    <div key={i} title={kpi.tooltip} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group hover:border-blue-300 transition-colors cursor-help pointer-events-auto">
                        <div title={kpi.tooltip} className={`text-xs ${kpi.color} font-bold uppercase tracking-wider mb-2 flex items-center justify-between`}>
                            <div title={kpi.tooltip} className="flex items-center gap-1">{kpi.icon} {kpi.label}</div>
                            <div title={kpi.tooltip} className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <Info size={14} className="text-slate-300" />
                            </div>
                        </div>
                        <div title={kpi.tooltip} className="text-3xl font-black text-slate-800 relative z-10 whitespace-nowrap truncate leading-tight">
                            {isLoading ? (
                                <Skeleton className="h-10 w-3/4" />
                            ) : (
                                <AnimatedCounter value={kpi.value} prefix={kpi.prefix} />
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Grade Principal de Gráficos */}
            <div ref={chartsRef as any} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <ChartCard 
                    title={t('dashboard.charts.totalByStatus')} 
                    icon={<CheckCircle size={16} />} 
                    isInteractive 
                    isLoading={isLoading}
                    tooltip={t('dashboard.tooltips.clickToFilter')}
                >
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
                                    {dataStatus.map((entry) => (
                                        <Cell
                                            key={`cell-${entry.id}`}
                                            fill={getStableColor(entry.id, STATUS_COLORS)}
                                            opacity={filters.status !== 'ALL' && filters.status !== entry.id ? 0.2 : 1}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    verticalAlign="middle"
                                    align="right"
                                    layout="vertical"
                                    iconType="circle"
                                    onClick={(data: any) => handleChartClick('status', data.payload.id)}
                                    wrapperStyle={{ cursor: 'pointer' }}
                                />
                            </PieChart>
                        </SafeResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-slate-300 text-sm">{t('dashboard.charts.noData')}</div>}
                </ChartCard>

                <ChartCard 
                    title={t('dashboard.charts.totalByType')} 
                    icon={<PieIcon size={16} />} 
                    isInteractive
                    tooltip={t('dashboard.tooltips.clickToFilter')}
                >
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
                                    {dataType.map((entry) => (
                                        <Cell
                                            key={`cell-${entry.id}`}
                                            fill={getStableColor(entry.id)}
                                            opacity={filters.analysisType !== 'ALL' && filters.analysisType !== entry.id ? 0.2 : 1}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    onClick={(data: any) => handleChartClick('analysisType', data.payload.id)}
                                    wrapperStyle={{ cursor: 'pointer' }}
                                />
                            </PieChart>
                        </SafeResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-slate-300 text-sm">{t('dashboard.charts.noData')}</div>}
                </ChartCard>

                <ChartCard 
                    title={t('dashboard.charts.rootCause6M')} 
                    icon={<PieIcon size={16} />} 
                    isInteractive
                    tooltip={t('dashboard.tooltips.clickToFilter')}
                >
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
                                    {dataRootCause.map((entry) => (
                                        <Cell
                                            key={`cell-${entry.id}`}
                                            fill={getStableColor(entry.id, ROOT_CAUSE_COLORS)}
                                            opacity={filters.rootCause6M !== 'ALL' && filters.rootCause6M !== entry.id ? 0.2 : 1}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    verticalAlign="middle"
                                    align="right"
                                    layout="vertical"
                                    iconType="circle"
                                    onClick={(data: any) => handleChartClick('rootCause6M', data.payload.id)}
                                    wrapperStyle={{ cursor: 'pointer' }}
                                />
                            </PieChart>
                        </SafeResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-slate-300 text-sm">{t('dashboard.charts.noData')}</div>}
                </ChartCard>

                <ChartCard 
                    title={t('dashboard.charts.topEquipments')} 
                    icon={<TrendingUp size={16} />} 
                    isInteractive
                    tooltip={t('dashboard.tooltips.clickToFilter')}
                >
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

                <ChartCard 
                    title={t('dashboard.charts.topSubgroups')} 
                    icon={<TrendingUp size={16} />} 
                    isInteractive
                    tooltip={t('dashboard.tooltips.clickToFilter')}
                >
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

                <ChartCard 
                    title={t('dashboard.charts.totalByComponent')} 
                    icon={<AlertCircle size={16} />} 
                    isInteractive
                    tooltip={t('dashboard.tooltips.clickToFilter')}
                >
                    {isMounted && dataComp.length > 0 ? (
                        <SafeResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
                            <BarChart data={dataComp} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 11 }} tickFormatter={(val) => truncateLabel(val)} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} onClick={(data) => handleChartClick('componentType', data.id)} cursor="pointer">
                                    {dataComp.map((entry) => (
                                        <Cell
                                            key={`cell-${entry.id}`}
                                            fill={getStableColor(entry.id)}
                                            opacity={filters.componentType !== 'ALL' && filters.componentType !== entry.id ? 0.2 : 1}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </SafeResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-slate-300 text-sm">{t('dashboard.charts.noData')}</div>}
                </ChartCard>

                <ChartCard 
                    title={t('dashboard.charts.failureMode')} 
                    icon={<AlertCircle size={16} />} 
                    isInteractive
                    tooltip={t('dashboard.tooltips.clickToFilter')}
                >
                    {isMounted && dataMode.length > 0 ? (
                        <SafeResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
                            <BarChart data={dataMode} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 11 }} tickFormatter={(val) => truncateLabel(val)} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={15} onClick={(data) => handleChartClick('failureMode', data.id)} cursor="pointer">
                                    {dataMode.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill="#6366f1" opacity={filters.failureMode !== 'ALL' && filters.failureMode !== entry.id ? 0.2 : 1} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </SafeResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-slate-300 text-sm">{t('dashboard.charts.noData')}</div>}
                </ChartCard>

                <ChartCard 
                    title={t('dashboard.charts.failureCategory')} 
                    icon={<Activity size={16} />} 
                    isInteractive
                    tooltip={t('dashboard.tooltips.clickToFilter')}
                >
                    {isMounted && dataCat.length > 0 ? (
                        <SafeResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
                            <BarChart data={dataCat} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 11 }} tickFormatter={(val) => truncateLabel(val)} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={15} onClick={(data) => handleChartClick('failureCategory', data.id)} cursor="pointer">
                                    {dataCat.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill="#f59e0b" opacity={filters.failureCategory !== 'ALL' && filters.failureCategory !== entry.id ? 0.2 : 1} />
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