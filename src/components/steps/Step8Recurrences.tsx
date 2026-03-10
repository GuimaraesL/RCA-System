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
    Inbox
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

    const RecurrenceTable = ({
        title,
        icon: Icon,
        items,
        colorClass,
        accentClass
    }: {
        title: string,
        icon: any,
        items: any[],
        colorClass: string,
        accentClass: string
    }) => (
        <div className="space-y-4">
            <div className={`flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r ${colorClass} border border-white/10 shadow-sm`}>
                <div className={`p-2 rounded-xl ${accentClass} shadow-inner`}>
                    <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-white leading-none">
                        {title}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                        {items.length} {items.length === 1 ? 'ocorrência detectada' : 'ocorrências detectadas'}
                    </p>
                </div>
            </div>

            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm backdrop-blur-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/10">
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest w-24">{t('table.id')}</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest w-1/3">{t('table.what')}</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest w-1/4">{t('fields.rootCauses')}</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('table.actions')}</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest w-16 text-center">{t('common.view')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                            {items.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center opacity-40">
                                            <Inbox className="w-8 h-8 mb-2" />
                                            <span className="text-sm italic font-medium">{t('analysesPage.noRecords')}</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                items.map((item) => (
                                    <tr key={item.rca_id} className="group hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors duration-200">
                                        <td className="px-6 py-4 align-top">
                                            <Badge variant="neutral" className="bg-slate-100 dark:bg-white/10 border-slate-200 dark:border-white/10 font-mono text-[10px] text-primary-600 dark:text-primary-300">
                                                {item.rca_id?.substring(0, 8)}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 align-top">
                                            <div className="text-sm font-bold text-slate-900 dark:text-white leading-tight mb-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                                {item.title}
                                            </div>
                                            <div className="text-[10px] text-slate-400 dark:text-slate-500 bg-slate-100/50 dark:bg-white/5 w-fit px-2 py-0.5 rounded-md mt-1 italic">
                                                {item.equipment_name || 'Equipamento não informado'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 align-top">
                                            <div className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed whitespace-pre-wrap font-medium">
                                                {item.root_causes || '—'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 align-top">
                                            <div className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed whitespace-pre-wrap font-medium">
                                                {item.actions || '—'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 align-top text-center">
                                            <a
                                                href={`#/rca/${item.rca_id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex p-2 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-400 hover:bg-primary-600 hover:text-white dark:hover:bg-primary-500 transition-all duration-300 shadow-sm"
                                            >
                                                <ArrowUpRight className="w-4 h-4" />
                                            </a>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
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

            {/* Same Subgroup Section */}
            <RecurrenceTable
                title={t('wizard.step8.recurrenceLevels.subgroup')}
                icon={Activity}
                items={recurrenceData.subgroup}
                colorClass="from-primary-50 dark:from-primary-500/10 to-transparent"
                accentClass="bg-primary-600"
            />

            {/* Same Equipment Section */}
            <RecurrenceTable
                title={t('wizard.step8.recurrenceLevels.equipment')}
                icon={History}
                items={recurrenceData.equipment}
                colorClass="from-amber-50 dark:from-amber-500/10 to-transparent"
                accentClass="bg-amber-500"
            />

            {/* Different Equipment Section */}
            <RecurrenceTable
                title={t('wizard.step8.recurrenceLevels.area')}
                icon={MapPin}
                items={recurrenceData.area}
                colorClass="from-emerald-50 dark:from-emerald-500/10 to-transparent"
                accentClass="bg-emerald-600"
            />
        </div>
    );
};
