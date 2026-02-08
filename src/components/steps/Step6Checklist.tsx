
import React from 'react';
import { RcaRecord } from '../../types';
import { ListChecks, CheckSquare, Square, XSquare } from 'lucide-react';
import { useSorting } from '../../hooks/useSorting';
import { SortHeader } from '../ui/SortHeader';
import { useLanguage } from '../../context/LanguageDefinition';

interface Step6Props {
    data: RcaRecord;
    onChange: (field: string, value: any) => void;
}

export const Step6Checklist: React.FC<Step6Props> = ({ data, onChange }) => {
    const { t } = useLanguage();

    const updatePrecision = (id: string, field: 'status' | 'comment', value: any) => {
        if (!data.precision_maintenance) return;
        const newList = data.precision_maintenance.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        );
        onChange('precision_maintenance', newList);
    };

    // Calculate Progress
    const total = data.precision_maintenance?.length || 0;
    const completed = data.precision_maintenance?.filter(i => i.status !== '').length || 0;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Sorting
    const { sortedItems: precisionMaintenance, sortConfig, handleSort } = useSorting(data.precision_maintenance || [], { key: 'id', direction: 'asc' });

    if (!data.precision_maintenance) return null;

    return (
        <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Header */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="bg-indigo-50 p-3 rounded-full text-indigo-600">
                        <ListChecks size={24} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">{t('wizard.step6.title')}</h2>
                        <p className="text-sm text-slate-500">{t('wizard.step6.subtitle')}</p>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="w-1/3">
                    <div className="flex justify-between text-xs mb-1 font-medium">
                        <span className="text-slate-500">{t('wizard.step6.completionStatus')}</span>
                        <span className="text-indigo-600">{percent}% ({completed}/{total})</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                            className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${percent}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <table className="w-full text-sm text-left">
                    <thead>
                        <tr className="bg-slate-50 text-slate-500 border-b group">
                            <SortHeader label={t('table.id')} sortKey="id" currentSort={sortConfig} onSort={handleSort} className="text-center w-32" />
                            <SortHeader label={t('wizard.step6.activity')} sortKey="activity" currentSort={sortConfig} onSort={handleSort} />
                            <th className="p-3 w-24 text-center">{t('wizard.step6.executed')}</th>
                            <th className="p-3 w-24 text-center">{t('wizard.step6.notExecuted')}</th>
                            <th className="p-3 w-24 text-center">{t('wizard.step6.notApplicable')}</th>
                            <SortHeader label={t('wizard.step6.comment')} sortKey="comment" currentSort={sortConfig} onSort={handleSort} />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {precisionMaintenance.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50">
                                <td className="p-3 text-center text-xs font-mono text-slate-400 truncate max-w-[100px]" title={item.id}>{item.id}</td>
                                <td className="p-3 font-medium text-slate-700">
                                    {t(item.activity || '')}
                                </td>
                                <td className="p-3 text-center"><button onClick={() => updatePrecision(item.id, 'status', 'EXECUTED')} className={`p-1 rounded ${item.status === 'EXECUTED' ? 'text-green-600 bg-green-50' : 'text-slate-300'}`}>{item.status === 'EXECUTED' ? <CheckSquare size={18} /> : <Square size={18} />}</button></td>
                                <td className="p-3 text-center"><button onClick={() => updatePrecision(item.id, 'status', 'NOT_EXECUTED')} className={`p-1 rounded ${item.status === 'NOT_EXECUTED' ? 'text-red-500 bg-red-50' : 'text-slate-300'}`}>{item.status === 'NOT_EXECUTED' ? <XSquare size={18} /> : <Square size={18} />}</button></td>
                                <td className="p-3 text-center"><button onClick={() => updatePrecision(item.id, 'status', 'NOT_APPLICABLE')} className={`p-1 rounded ${item.status === 'NOT_APPLICABLE' ? 'text-slate-500 bg-slate-100' : 'text-slate-300'}`}>{item.status === 'NOT_APPLICABLE' ? <CheckSquare size={18} /> : <Square size={18} />}</button></td>
                                <td className="p-3">
                                    <input
                                        id={`checklist_comment_${item.id}`}
                                        name={`checklist_comment_${item.id}`}
                                        type="text"
                                        className="w-full border-b border-slate-200 focus:border-blue-500 outline-none bg-transparent text-xs py-1 text-slate-900 placeholder:text-slate-400"
                                        placeholder={t('wizard.step6.addComment')}
                                        aria-label={`${t('wizard.step6.comment')} - ${item.activity || item.question_snapshot || ''}`}
                                        value={item.comment || ''}
                                        onChange={(e) => updatePrecision(item.id, 'comment', e.target.value)}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
