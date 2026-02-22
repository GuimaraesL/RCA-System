import React from 'react';
import { AlertCircle, ExternalLink, History } from 'lucide-react';
import { RecurrenceInfo } from '../../services/aiService';
import { useLanguage } from '../../context/LanguageDefinition';

interface RecurrenceBannerProps {
    recurrences: RecurrenceInfo[];
}

export const RecurrenceBanner: React.FC<RecurrenceBannerProps> = ({ recurrences }) => {
    const { t } = useLanguage();

    if (!recurrences || recurrences.length === 0) return null;

    const mostRelevant = recurrences[0];

    return (
        <div className="mb-6 animate-in slide-in-from-top duration-500">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex gap-4 items-start shadow-sm">
                <div className="bg-amber-100 dark:bg-amber-800/40 p-2 rounded-lg text-amber-600 dark:text-amber-400">
                    <AlertCircle size={24} />
                </div>

                <div className="flex-1">
                    <h4 className="text-amber-900 dark:text-amber-200 font-bold text-sm flex items-center gap-2">
                        ⚠️ ⚠️ ⚠️ RECORRÊNCIA DETECTADA ⚠️ ⚠️ ⚠️
                    </h4>
                    <p className="text-amber-800/80 dark:text-amber-300/80 text-sm mt-1">
                        A IA identificou {recurrences.length} {recurrences.length === 1 ? 'falha similar' : 'falhas similares'} no histórico deste <strong>{mostRelevant.level}</strong>.
                        Isso pode indicar uma falha sistêmica ou ineficácia de ações anteriores.
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                        {recurrences.map((r) => (
                            <div
                                key={r.rca_id}
                                className="bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2 flex items-center justify-between gap-4 hover:shadow-md transition-shadow cursor-pointer group"
                                onClick={() => window.open(`#/rca/${r.rca_id}`, '_blank')}
                            >
                                <div className="flex items-center gap-2">
                                    <History size={14} className="text-amber-500" />
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">#{r.rca_id}</span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]">{r.title}</span>
                                </div>
                                <ExternalLink size={14} className="text-slate-400 group-hover:text-amber-500 transition-colors" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
