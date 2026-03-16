import React, { useEffect } from 'react';
import { useAi } from '../../context/AIContext';
import { useLanguage } from '../../context/LanguageDefinition';
import { RcaRecord } from '../../types';
import {
    History,
    Activity,
    MapPin,
    ArrowUpRight,
    Search,
    Inbox,
    Target,
    RefreshCw,
    Network,
    FileSearch
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { RecurrenceGraph } from '../ui/RecurrenceGraph';
import { DnaMatrix } from '../ui/DnaMatrix';
import { RecurrenceInfo } from '../../services/aiService';

interface Step8RecurrencesProps {
    data: RcaRecord;
    onChange: (field: string, value: any) => void;
}

export const Step8Recurrences: React.FC<Step8RecurrencesProps> = ({ data }) => {
    const { t } = useLanguage();
    const { recurrenceData, loadRecurrences, loadingRecurrences } = useAi();
    const [showGraph, setShowGraph] = React.useState(true);
    const [showDiscarded, setShowDiscarded] = React.useState(false);
    const [selectedRecurrence, setSelectedRecurrence] = React.useState<RecurrenceInfo | null>(null);

    // Carregamento automático da última análise (do cache se disponível)
    useEffect(() => {
        if (!recurrenceData.subgroup.length && !recurrenceData.equipment.length && !recurrenceData.area.length) {
            loadRecurrences(data);
        }
    }, [data, loadRecurrences]);

    // Optional: Sort items globally by failure_date to find earliest/latest if needed
    const getSectionGroupDate = (items: any[]) => {
        if (!items || items.length === 0) return undefined;
        // Obter todas as datas validas da lista
        const validDates = items
            .map(i => i.failure_date)
            .filter(d => Boolean(d))
            .map(d => new Date(d).getTime());
            
        if (validDates.length > 0) {
            // Pode retornar a data mais recente ou a mais antiga desse grupo
            const maxDate = new Date(Math.max(...validDates));
            return maxDate.toLocaleDateString();
        }
        return undefined;
    };

    if (!recurrenceData) return null;

    const RecurrenceTable = ({
        title,
        icon: Icon,
        items,
        colorClass,
        accentClass,
        groupDate
    }: {
        title: string,
        icon: any,
        items: any[],
        colorClass: string,
        accentClass: string,
        groupDate?: string
    }) => (
        <div className="relative mb-12 last:mb-0">
            {/* Section Header with Dot */}
            <div className={`absolute -left-[52px] top-4 w-6 h-6 rounded-full ${accentClass} border-[3px] border-slate-50 dark:border-[#0f172a] flex items-center justify-center shadow-lg z-20`}>
                <Icon className="w-3 h-3 text-white" />
            </div>

            <div className="space-y-6">
                <div className={`p-4 rounded-2xl bg-gradient-to-r ${colorClass} border border-white/10 shadow-sm relative w-fit mb-4`}>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white leading-none">
                        {title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
                        {items.length} {items.length === 1 ? t('wizard.step8.occurrenceFound') : t('wizard.step8.occurrencesFound')}
                    </p>
                </div>

                <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm backdrop-blur-sm">
                    <div className="relative">
                        <table className="w-full text-left border-collapse min-w-[600px]">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/10">
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest w-2/5">{t('fields.rootCauses')}</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest w-32">{t('table.id')}</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('table.what')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                                {items.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-12 text-center text-slate-400 italic text-xs">
                                            {t('analysesPage.noRecords')}
                                        </td>
                                    </tr>
                                ) : (
                                    [...items]
                                        .sort((a, b) => {
                                            const dateA = a.failure_date ? new Date(a.failure_date).getTime() : 0;
                                            const dateB = b.failure_date ? new Date(b.failure_date).getTime() : 0;
                                            return dateA - dateB;
                                        })
                                        .map((item) => (
                                        <tr 
                                            key={item.rca_id} 
                                            className="group hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors duration-200 cursor-pointer relative"
                                            onClick={() => window.open(`#/rca/${item.rca_id}`, '_blank')}
                                        >
                                            <td className="px-6 py-4 align-top relative">
                                                {/* THE DATE - Absolute Left Outside Table Buffer */}
                                                <div className="absolute -left-[160px] top-1/2 -translate-y-1/2 w-28 text-right pr-4 pointer-events-none z-30">
                                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight whitespace-nowrap">
                                                        {item.failure_date ? new Date(item.failure_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : t('wizard.step8.noDate')}
                                                    </span>
                                                </div>

                                                {/* Small Connection Dot on Line */}
                                                <div className="absolute -left-[47px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700 border-2 border-slate-50 dark:border-[#0f172a] z-30 group-hover:bg-primary-500 group-hover:scale-125 transition-all shadow-sm" />

                                                <div className="flex flex-wrap gap-2">
                                                    {(item.root_causes || '—').split('\n')
                                                        .map((c: string) => c.replace(/^[-\*\s]+/, '').trim())
                                                        .filter(Boolean)
                                                        .map((cause: string, i: number) => (
                                                            <Badge key={i} variant="danger" className="text-[10px] bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 border-red-100 dark:border-red-500/20 whitespace-normal text-left">
                                                                <Target className="w-3 h-3 inline-block mr-1 opacity-60"/>{cause}
                                                            </Badge>
                                                        ))
                                                    }
                                                </div>
                                                {item.validation_reason && (() => {
                                                    // Regex robusto para detectar as tags (case-insensitive e com/sem acento)
                                                    const isIdentica = /\[(IDÊNTICA|IDENTICA)\]/i.test(item.validation_reason);
                                                    const isSimilar = /\[(SEMELHANTE|SIMILAR)\]/i.test(item.validation_reason);
                                                    
                                                    // Limpeza de todas as variações possíveis de tags no início do texto
                                                    const cleanReason = item.validation_reason
                                                        .replace(/\[+(IDÊNTICA|IDENTICA|SEMELHANTE|SIMILAR)\]+/gi, '')
                                                        .trim()
                                                        .replace(/^[:\-\s]+/, '');

                                                    return (
                                                        <div className={`mt-3 p-2.5 rounded-xl border transition-all duration-300 ${
                                                            isIdentica 
                                                                ? 'bg-rose-50/50 dark:bg-rose-500/5 border-rose-200/50 dark:border-rose-500/20' 
                                                                : isSimilar
                                                                    ? 'bg-amber-50/50 dark:bg-amber-500/5 border-amber-200/50 dark:border-amber-500/20'
                                                                    : 'bg-primary-50/50 dark:bg-primary-500/5 border-primary-100/50 dark:border-primary-500/10'
                                                        }`}>
                                                            <div className="flex items-center justify-between mb-1.5">
                                                                <p className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${
                                                                    isIdentica ? 'text-rose-600 dark:text-rose-400' : 
                                                                    isSimilar ? 'text-amber-600 dark:text-amber-400' : 
                                                                    'text-primary-600 dark:text-primary-400'
                                                                }`}>
                                                                    <Activity className="w-3 h-3" /> {t('wizard.step8.aiValidation')}
                                                                </p>
                                                                {isIdentica && <Badge variant="danger" size="sm" className="h-4 text-[8px] animate-pulse">IDÊNTICA</Badge>}
                                                                {isSimilar && <Badge variant="warning" size="sm" className="h-4 text-[8px]">SEMELHANTE</Badge>}
                                                            </div>
                                                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic">
                                                                "{cleanReason}"
                                                            </p>
                                                        </div>
                                                    );
                                                })()}
                                                {item.discard_reason && (
                                                    <div className="mt-3 p-2.5 rounded-xl bg-red-50/50 dark:bg-red-500/5 border border-red-100/50 dark:border-red-500/10 opacity-70">
                                                        <p className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                                            <Activity className="w-3 h-3" /> {t('wizard.step8.discardReason')}
                                                        </p>
                                                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic">
                                                            "{item.discard_reason}"
                                                        </p>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                <Badge variant="neutral" className="bg-slate-100 dark:bg-white/10 border-slate-200 dark:border-white/10 font-mono text-[10px] text-primary-600 dark:text-primary-300">
                                                    {item.rca_id?.substring(0, 8)}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                <div className="text-sm font-bold text-slate-900 dark:text-white leading-tight mb-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                                    {item.title}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 bg-slate-100/50 dark:bg-white/5 w-fit px-2 py-0.5 rounded-md italic font-medium">
                                                        <History className="w-3 h-3" /> {item.equipment_name || t('wizard.step8.noEquipment')}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
            <div className="max-w-[1600px] mx-auto">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-primary-600 shadow-lg shadow-primary-600/20">
                            <Search className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                {t('wizard.step8.title')}
                            </h2>
                            <div className="flex flex-col">
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                                    {t('wizard.step8.searchHint')}
                                </p>
                                {recurrenceData.lastAnalyzedAt && (
                                    <p className="text-[10px] text-primary-500 dark:text-primary-400 font-bold uppercase tracking-tight mt-0.5">
                                        {t('wizard.step8.lastAnalysis')}: {new Date(recurrenceData.lastAnalyzedAt).toLocaleString()}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            onClick={() => setShowGraph(!showGraph)}
                            variant="outline"
                            size="md"
                            className="bg-white/50 dark:bg-white/5 border-slate-200 dark:border-white/10"
                            leftIcon={<Network className={`w-4 h-4 ${showGraph ? 'text-primary-500' : 'text-slate-400'}`} />}
                        >
                            {showGraph ? 'Esconder Mapa' : 'Ver Mapa'}
                        </Button>

                        <Button
                            onClick={() => loadRecurrences(data, true)}
                            isLoading={loadingRecurrences}
                            leftIcon={<RefreshCw className="w-4 h-4" />}
                            variant="primary"
                            size="md"
                        >
                            {t('wizard.step8.searchButton')}
                        </Button>
                    </div>
                </div>

                {/* Neural Map Integration */}
                {showGraph && (
                    <div className="mt-10 animate-in zoom-in-95 duration-500">
                        <RecurrenceGraph 
                            centralRca={data}
                            recurrences={recurrenceData}
                            showDiscarded={showDiscarded}
                            onNodeClick={(rec) => setSelectedRecurrence(rec)}
                        />
                        
                        <div className="mt-4 flex justify-end">
                            <button 
                                onClick={() => setShowDiscarded(!showDiscarded)}
                                className="flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest hover:text-primary-500 transition-colors"
                            >
                                <FileSearch className="w-4 h-4" />
                                {showDiscarded ? 'Ocultar Itens Descartados' : 'Mostrar Itens Descartados (RAG Transparency)'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Timeline Container */}
            <div className="relative border-l-2 border-slate-300 dark:border-slate-700 ml-36 pl-10 space-y-16 pb-4">
                {!loadingRecurrences && recurrenceData.subgroup.length === 0 && recurrenceData.equipment.length === 0 && recurrenceData.area.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center animate-pulse">
                        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-4">
                            <Search className="w-8 h-8 text-slate-300" />
                        </div>
                        <h4 className="text-slate-400 font-medium italic">{t('wizard.step8.emptyHistory')}</h4>
                    </div>
                ) : (
                    <>
                        {/* Same Subgroup Section */}
                        <RecurrenceTable
                            title={t('wizard.step8.recurrenceLevels.subgroup')}
                            icon={Activity}
                            items={recurrenceData.subgroup}
                            colorClass="from-primary-50 dark:from-primary-500/10 to-transparent"
                            accentClass="bg-primary-600"
                            groupDate={getSectionGroupDate(recurrenceData.subgroup)}
                        />

                        {/* Same Equipment Section */}
                        <RecurrenceTable
                            title={t('wizard.step8.recurrenceLevels.equipment')}
                            icon={History}
                            items={recurrenceData.equipment}
                            colorClass="from-amber-50 dark:from-amber-500/10 to-transparent"
                            accentClass="bg-amber-500"
                            groupDate={getSectionGroupDate(recurrenceData.equipment)}
                        />

                        {/* Different Equipment Section */}
                        <RecurrenceTable
                            title={t('wizard.step8.recurrenceLevels.area')}
                            icon={MapPin}
                            items={recurrenceData.area}
                            colorClass="from-emerald-50 dark:from-emerald-500/10 to-transparent"
                            accentClass="bg-emerald-500"
                            groupDate={getSectionGroupDate(recurrenceData.area)}
                        />

                        {/* Discarded Section */}
                        {recurrenceData.discarded && recurrenceData.discarded.length > 0 && (
                            <RecurrenceTable
                                title={t('wizard.step8.recurrenceLevels.discarded')}
                                icon={Inbox}
                                items={recurrenceData.discarded}
                                colorClass="from-slate-50 dark:from-slate-500/10 to-transparent opacity-60"
                                accentClass="bg-slate-400"
                                groupDate={getSectionGroupDate(recurrenceData.discarded)}
                            />
                        )}
                    </>
                )}
            </div>

            {/* DNA Matrix Modal */}
            {selectedRecurrence && (
                <DnaMatrix 
                    currentRca={data}
                    recurrence={selectedRecurrence}
                    onClose={() => setSelectedRecurrence(null)}
                />
            )}
        </div>
    );
};
