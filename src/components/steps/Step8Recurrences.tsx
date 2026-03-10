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
    Target
} from 'lucide-react';
import { Badge } from '../ui/Badge';

interface Step8RecurrencesProps {
    data: RcaRecord;
    onChange: (field: string, value: any) => void;
}

export const Step8Recurrences: React.FC<Step8RecurrencesProps> = ({ data }) => {
    const { t } = useLanguage();
    const { recurrenceData, loadRecurrences } = useAi();

    useEffect(() => {
        if (!recurrenceData.subgroup.length && !recurrenceData.equipment.length && !recurrenceData.area.length) {
            loadRecurrences(data);
        }
    }, [data, loadRecurrences, recurrenceData]);

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
                        {items.length} {items.length === 1 ? 'ocorrência detectada' : 'ocorrências detectadas'}
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
                                                        {item.failure_date ? new Date(item.failure_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'S/ DATA'}
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
                                                        <History className="w-3 h-3" /> {item.equipment_name || 'Equipamento não informado'}
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
            {/* Introductory Header */}
            <div className="flex items-center gap-4 px-2">
                <div className="p-3 rounded-2xl bg-primary-600 shadow-lg shadow-primary-600/20">
                    <Search className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                        {t('wizard.step8.title')}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                        Exploração contextual de falhas sistêmicas para evitar reincidências
                    </p>
                </div>
            </div>

            {/* Timeline Container */}
            <div className="relative border-l-2 border-slate-300 dark:border-slate-700 ml-36 pl-10 space-y-16 pb-4">
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
            </div>
        </div>
    );
};
