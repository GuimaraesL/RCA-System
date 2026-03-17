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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-slate-200 dark:bg-white/10 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 mb-6 last:mb-0">
            <div className="bg-white dark:bg-slate-900 p-6 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    <Icon className="w-3.5 h-3.5" /> {label} (Atual)
                </div>
                <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {isList ? (
                        <ul className="space-y-2">
                            {current.map((item: any, i: number) => (
                                <li key={i} className="flex gap-2 items-start">
                                    <ArrowRight className="w-3.5 h-3.5 mt-0.5 text-primary-500 shrink-0" />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    ) : current || '—'}
                </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 p-6 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-[10px] font-bold text-primary-500 dark:text-primary-400 uppercase tracking-widest">
                    <Icon className="w-3.5 h-3.5" /> {label} (Recorrência)
                </div>
                <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {isList ? (
                        <ul className="space-y-2">
                            {matched.map((item: any, i: number) => (
                                <li key={i} className="flex gap-2 items-start">
                                    <ArrowRight className="w-3.5 h-3.5 mt-0.5 text-primary-500 shrink-0" />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    ) : matched || '—'}
                </div>
            </div>
        </div>
    );

    if (!recurrenceRecord) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative w-full max-w-6xl max-h-[90vh] bg-white dark:bg-slate-950 rounded-[40px] shadow-2xl border border-white/20 overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-8 border-b border-slate-100 dark:border-white/5 bg-gradient-to-r from-primary-600 to-indigo-700">
                    <div className="flex items-center gap-5">
                        <div className="p-4 rounded-3xl bg-white/10 shadow-inner backdrop-blur-xl">
                            <Layers className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h2 className="text-2xl font-black text-white tracking-tight">DNA Matrix</h2>
                                <Badge className="bg-white/20 text-white border-white/10">Gap Analysis</Badge>
                            </div>
                            <p className="text-primary-100 text-sm font-medium opacity-80">
                                Comparação técnica detalhada entre falhas recorrentes
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-3 rounded-2xl hover:bg-white/10 text-white transition-all transform hover:rotate-90"
                    >
                        <X className="w-7 h-7" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50 dark:bg-slate-950">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Activity className="w-12 h-12 text-primary-500 animate-spin" />
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Mapeando DNA da Recorrência...</p>
                        </div>
                    ) : (
                        <div className="max-w-4xl mx-auto space-y-8">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 gap-6">
                                <div className="p-6 rounded-3xl bg-primary-600 shadow-xl shadow-primary-600/20 text-white relative overflow-hidden group">
                                    <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
                                    <p className="text-[10px] font-bold text-primary-200 uppercase tracking-widest mb-3">RCA ATUAL</p>
                                    <h4 className="text-lg font-black leading-tight mb-4">{currentRca.what}</h4>
                                    <div className="flex items-center gap-2 text-xs font-medium text-primary-100 italic">
                                        <AlertCircle className="w-3.5 h-3.5" /> {(currentRca.asset_name_display || currentRca.subgroup_id || 'Localização não definida')}
                                    </div>
                                </div>
                                <div className="p-6 rounded-3xl bg-slate-900 border border-white/5 shadow-xl text-white relative overflow-hidden group">
                                    <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-primary-600/10 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">RECORRÊNCIA SELECIONADA</p>
                                    <h4 className="text-lg font-black leading-tight mb-4">{recurrenceRecord.what}</h4>
                                    <div className="flex items-center gap-2 text-xs font-medium text-slate-400 italic">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> {recurrenceRecord.asset_name_display || '—'}
                                    </div>
                                </div>
                            </div>

                            {/* Comparison Blocks */}
                            <div className="space-y-4">
                                <ComparisonRow 
                                    label="Causa Raiz" 
                                    icon={Target}
                                    current={currentRca.root_causes?.map(rc => rc.cause) || []}
                                    matched={recurrenceRecord.root_causes?.map(rc => rc.cause) || []}
                                    isList={true}
                                />
                                
                                <ComparisonRow 
                                    label="Definição do Problema" 
                                    icon={Zap}
                                    current={currentRca.problem_description}
                                    matched={recurrenceRecord.problem_description}
                                />

                                <ComparisonRow 
                                    label="Ishikawa (Diagrama)" 
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
                                    label="Ações Anteriores" 
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
                <div className="p-6 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5 flex justify-end gap-4">
                    <Button variant="outline" onClick={onClose} size="md">
                        Fechar Comparação
                    </Button>
                    <Button 
                        variant="primary" 
                        onClick={() => window.open(`#/rca/${recurrenceRecord.id}`, '_blank')}
                        size="md"
                        leftIcon={<Activity className="w-4 h-4" />}
                    >
                        Abrir RCA Completo
                    </Button>
                </div>
            </div>
        </div>
    );
};
