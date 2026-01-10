
import React from 'react';
import { RcaRecord } from '../../types';
import { CheckSquare, Square, XSquare } from 'lucide-react';

interface Step6Props {
    data: RcaRecord;
    onChange: (field: string, value: any) => void;
}

export const Step6Checklist: React.FC<Step6Props> = ({ data, onChange }) => {

    const updatePrecision = (id: string, field: 'status' | 'comment', value: any) => {
        const newItems = data.precision_maintenance.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        );
        onChange('precision_maintenance', newItems);
    };

    const answeredCount = data.precision_maintenance.filter(i => i.status && i.status !== '').length;
    const totalCount = data.precision_maintenance.length;
    const percentage = Math.round((answeredCount / totalCount) * 100) || 0;

    return (
        <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Checklist de Manutenção de Precisão</h2>
                <p className="text-gray-600">Verifique os itens de manutenção realizados</p>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-gray-900">Progresso do Checklist</h3>
                    <span className="text-2xl font-bold text-blue-700">{percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-500 rounded-full"
                        style={{ width: `${percentage}%` }}
                    />
                </div>
                <p className="text-sm text-gray-600 mt-2">
                    {answeredCount} de {totalCount} itens verificados
                </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <table className="w-full text-sm text-left">
                    <thead>
                        <tr className="bg-slate-50 text-slate-500 border-b">
                            <th className="p-3 w-32 text-center">ID</th>
                            <th className="p-3 w-1/3">Atividade</th>
                            <th className="p-3 w-24 text-center">Executado</th>
                            <th className="p-3 w-24 text-center">Não Exec.</th>
                            <th className="p-3 w-24 text-center">N/A</th>
                            <th className="p-3">Comentário</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.precision_maintenance.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50">
                                <td className="p-3 text-center text-xs font-mono text-slate-400 truncate max-w-[100px]" title={item.id}>{item.id}</td>
                                <td className="p-3 font-medium text-slate-700">
                                    {item.activity || item.question_snapshot}
                                </td>
                                <td className="p-3 text-center"><button onClick={() => updatePrecision(item.id, 'status', 'EXECUTED')} className={`p-1 rounded ${item.status === 'EXECUTED' ? 'text-green-600 bg-green-50' : 'text-slate-300'}`}>{item.status === 'EXECUTED' ? <CheckSquare size={18} /> : <Square size={18} />}</button></td>
                                <td className="p-3 text-center"><button onClick={() => updatePrecision(item.id, 'status', 'NOT_EXECUTED')} className={`p-1 rounded ${item.status === 'NOT_EXECUTED' ? 'text-red-500 bg-red-50' : 'text-slate-300'}`}>{item.status === 'NOT_EXECUTED' ? <XSquare size={18} /> : <Square size={18} />}</button></td>
                                <td className="p-3 text-center"><button onClick={() => updatePrecision(item.id, 'status', 'NOT_APPLICABLE')} className={`p-1 rounded ${item.status === 'NOT_APPLICABLE' ? 'text-slate-500 bg-slate-100' : 'text-slate-300'}`}>{item.status === 'NOT_APPLICABLE' ? <CheckSquare size={18} /> : <Square size={18} />}</button></td>
                                <td className="p-3">
                                    <input
                                        type="text"
                                        className="w-full border-b border-slate-200 focus:border-blue-500 outline-none bg-transparent text-xs py-1 text-slate-900 placeholder:text-slate-400"
                                        placeholder="Add comment..."
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
