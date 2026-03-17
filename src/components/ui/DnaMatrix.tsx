import React, { useEffect, useState } from 'react';
import { RcaRecord, RootCauseItem } from '../../types';
import { RecurrenceInfo } from '../../services/aiService';
import { 
    X, 
    Zap, 
    Target, 
    ArrowRight, 
    CheckCircle2, 
    AlertCircle,
    Activity,
    ClipboardList,
    Layers
} from 'lucide-react';
import { Badge } from './Badge';
import { Button } from './Button';
import { useLanguage } from '../../context/LanguageDefinition';

import { fetchRecordById } from '../../services/apiService';

interface DnaMatrixProps {
    currentRca: RcaRecord;
    recurrence: RecurrenceInfo;
    onClose: () => void;
}

export const DnaMatrix: React.FC<DnaMatrixProps> = ({ currentRca, recurrence, onClose }) => {
    const { t } = useLanguage();
    const [recurrenceRecord, setRecurrenceRecord] = useState<RcaRecord | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const enrichRecord = (record: RcaRecord, info: RecurrenceInfo): RcaRecord => {
            return {
                ...record,
                // Fallback para Título se what estiver vazio
                what: record.what || info.title,
                // Fallback para Hierarquia se asset_name_display estiver vazio
                asset_name_display: record.asset_name_display || info.equipment_name || info.area_name
            };
        };

        const fetchFullData = async () => {
            setLoading(true);
            try {
                // 1. Tenta buscar no localStorage (mais rápido se disponível)
                const storedRecords = localStorage.getItem('rca_app_v1_records');
                if (storedRecords) {
                    const records: RcaRecord[] = JSON.parse(storedRecords);
                    const found = records.find(r => r.id === recurrence.rca_id);
                    if (found) {
                        setRecurrenceRecord(enrichRecord(found, recurrence));
                        setLoading(false);
                        return;
                    }
                }
                
                // 2. Se não encontrou no localStorage, tenta buscar via API real do Backend
                const apiRecord = await fetchRecordById(recurrence.rca_id);
                if (apiRecord) {
                    setRecurrenceRecord(enrichRecord(apiRecord, recurrence));
                    setLoading(false);
                    return;
                }
                
                // Fallback final: usar dados do RecurrenceInfo mapeados para RcaRecord parcial
                const partial: any = {
                    id: recurrence.rca_id,
                    what: recurrence.title,
                    problem_description: recurrence.title,
                    root_causes: (recurrence.root_causes || '').split('\n').filter(Boolean).map((c, i) => ({
                        id: `rc-${i}`,
                        cause: c
                    })),
                    failure_date: recurrence.failure_date,
                    asset_name_display: recurrence.equipment_name || recurrence.area_name,
                    ishikawa: {},
                    containment_actions: []
                };
                setRecurrenceRecord(partial);
            } catch (e) {
                console.error('Failed to enrich recurrence data', e);
            } finally {
                setLoading(false);
            }
        };

        fetchFullData();
    }, [recurrence]);

    const ComparisonRow = ({ label, icon: Icon, current, matched, isList = false }: any) => (
        <div className="group/row grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 last:mb-0">
            {/* Coluna Atual - Fundo Claro/Branco */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-slate-100 dark:border-white/5 flex flex-col gap-5 hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                        <Icon className="w-4 h-4 text-primary-500/50" /> {label}
                    </div>
                    <Badge variant="neutral" size="sm" className="text-[9px] uppercase font-bold opacity-70">{t('dnaMatrix.rcaAtual')}</Badge>
                </div>
                <div className="text-sm text-slate-900 dark:text-slate-200 leading-relaxed font-medium">
                    {isList ? (
                        <ul className="space-y-3">
                            {current.map((item: any, i: number) => (
                                <li key={i} className="flex gap-3 items-start animate-in slide-in-from-left duration-300" style={{ animationDelay: `${i * 100}ms` }}>
                                    <div className="w-5 h-5 rounded-lg bg-blue-50 dark:bg-slate-800 border border-blue-100 dark:border-white/5 flex items-center justify-center shrink-0 mt-1">
                                        <ArrowRight className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <span className="bg-slate-50 dark:bg-white/5 px-4 py-3 rounded-2xl border border-slate-100 dark:border-white/5 w-full text-slate-700 dark:text-slate-300">
                                        {item}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-2xl border border-slate-100 dark:border-white/5 text-slate-700 dark:text-slate-300 mb-2">
                            {current || '—'}
                        </div>
                    )}
                </div>
            </div>
            
            {/* Coluna Recorrência - Fundo Azulado Sólido */}
            <div className="bg-blue-50 dark:bg-slate-800 p-8 rounded-[32px] shadow-sm border border-blue-100 dark:border-white/5 flex flex-col gap-5 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-blue-600 dark:text-primary-400 uppercase tracking-widest">
                        <Icon className="w-4 h-4" /> {label}
                    </div>
                    <Badge variant="primary" size="sm" className="text-[9px] uppercase font-bold">{t('dnaMatrix.dnaMatch')}</Badge>
                </div>
                <div className="text-sm text-slate-900 dark:text-slate-100 leading-relaxed font-semibold">
                    {isList ? (
                        <ul className="space-y-3">
                            {matched.map((item: any, i: number) => (
                                <li key={i} className="flex gap-3 items-start animate-in slide-in-from-right duration-300" style={{ animationDelay: `${i * 100}ms` }}>
                                    <div className="w-5 h-5 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0 mt-1">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    </div>
                                    <span className="bg-white dark:bg-slate-900 px-4 py-3 rounded-2xl border border-blue-100 dark:border-white/10 w-full text-slate-800 dark:text-slate-200 italic">
                                        {item}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-blue-100 dark:border-white/10 text-slate-800 dark:text-slate-200 italic mb-2">
                            {matched || '—'}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    if (!recurrenceRecord) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-slate-900/60" onClick={onClose} />
            
            <div className="relative w-full max-w-6xl max-h-[90vh] bg-white dark:bg-slate-950 rounded-[40px] shadow-2xl border border-white/20 overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-8 border-b border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900">
                    <div className="flex items-center gap-5">
                        <div className="p-4 rounded-2xl bg-blue-50 dark:bg-slate-800 shadow-sm border border-blue-100 dark:border-white/10">
                            <Layers className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight font-display">{t('dnaMatrix.title')}</h2>
                                <Badge variant="primary" size="sm">{t('dnaMatrix.gapAnalysis')}</Badge>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                                {t('dnaMatrix.subtitle')}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 dark:text-slate-500 transition-all transform hover:rotate-90"
                    >
                        <X className="w-7 h-7" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50 dark:bg-slate-950">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Activity className="w-12 h-12 text-primary-500 animate-spin" />
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">{t('dnaMatrix.loading')}</p>
                        </div>
                    ) : (
                        <div className="max-w-4xl mx-auto space-y-8">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 gap-6">
                                <div className="p-8 rounded-[32px] bg-white dark:bg-slate-900 shadow-2xl shadow-slate-200 dark:shadow-none border border-slate-100 dark:border-white/5 relative overflow-hidden group">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Badge className="bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 border-primary-100 dark:border-primary-500/20 px-3 py-1 text-[10px] font-bold tracking-widest uppercase">
                                            {t('dnaMatrix.rcaAtual')}
                                        </Badge>
                                    </div>
                                    <h4 className="text-xl font-black leading-tight mb-4 text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                        {currentRca.what}
                                    </h4>
                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-white/5 p-3 rounded-2xl border border-slate-100 dark:border-white/5">
                                        <AlertCircle className="w-3.5 h-3.5 text-primary-500" /> 
                                        {(currentRca.asset_name_display || currentRca.subgroup_id || t('dnaMatrix.noLocation'))}
                                    </div>
                                </div>

                                <div className="p-8 rounded-[32px] bg-blue-50 dark:bg-slate-800 shadow-sm border border-blue-100 dark:border-white/5 relative overflow-hidden group">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Badge variant="primary" size="sm" className="px-3 py-1 text-[10px] font-bold tracking-widest uppercase">
                                            {t('dnaMatrix.recurrenceSelected')}
                                        </Badge>
                                    </div>
                                    <h4 className="text-xl font-black leading-tight mb-4 text-slate-900 dark:text-white drop-shadow-sm">
                                        {recurrenceRecord.what}
                                    </h4>
                                    <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-100 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-blue-100 dark:border-white/10">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 
                                        {recurrenceRecord.asset_name_display || t('dnaMatrix.locationOmitted')}
                                    </div>
                                </div>
                            </div>

                            {/* Comparison Blocks */}
                            <div className="space-y-4">
                                <ComparisonRow 
                                    label={t('dnaMatrix.rootCause')}
                                    icon={Target}
                                    current={currentRca.root_causes?.map(rc => rc.cause) || []}
                                    matched={recurrenceRecord.root_causes?.map(rc => rc.cause) || []}
                                    isList={true}
                                />
                                
                                <ComparisonRow 
                                    label={t('dnaMatrix.problemDefinition')}
                                    icon={Zap}
                                    current={currentRca.problem_description}
                                    matched={recurrenceRecord.problem_description}
                                />

                                <ComparisonRow 
                                    label={t('dnaMatrix.ishikawa')}
                                    icon={ClipboardList}
                                    current={
                                        Object.entries(currentRca.ishikawa || {})
                                            .filter(([_, list]: any) => list.length > 0)
                                            .map(([key, list]: any) => `${key.toUpperCase()}: ${list.join(', ')}`)
                                    }
                                    matched={
                                        Object.entries(recurrenceRecord.ishikawa || {})
                                            .filter(([_, list]: any) => list.length > 0)
                                            .map(([key, list]: any) => `${key.toUpperCase()}: ${list.join(', ')}`)
                                    }
                                    isList={true}
                                />

                                <ComparisonRow 
                                    label={t('dnaMatrix.previousActions')}
                                    icon={Activity}
                                    current={currentRca.containment_actions?.map(a => a.action) || []}
                                    matched={recurrenceRecord.containment_actions?.map(a => a.action) || []}
                                    isList={true}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-white/5 flex justify-end gap-4 shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
                    <Button variant="secondary" onClick={onClose} size="md">
                        {t('dnaMatrix.close')}
                    </Button>
                    <Button 
                        variant="primary" 
                        onClick={() => window.open(`#/rca/${recurrenceRecord.id}`, '_blank')}
                        size="md"
                        leftIcon={<Activity className="w-4 h-4" />}
                    >
                        {t('dnaMatrix.openFull')}
                    </Button>
                </div>
            </div>
        </div>
    );
};
