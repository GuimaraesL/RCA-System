
import React, { useState } from 'react';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Plus, Trash2, Wand2, Loader2, AlertTriangle, UserCheck } from 'lucide-react';
import { RcaRecord, TaxonomyConfig, IshikawaDiagram } from '../../types';
import { generateId } from '../../services/utils';

interface Step4Props {
    data: RcaRecord;
    onChange: (field: string, value: any) => void;
    onAnalyzeAI: () => void;
    isAnalyzing: boolean;
    taxonomy: TaxonomyConfig;
    showHra?: boolean;
}

export const Step4Investigation: React.FC<Step4Props> = ({ data, onChange, onAnalyzeAI, isAnalyzing, taxonomy, showHra }) => {
    const [newIshikawaItem, setNewIshikawaItem] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<keyof IshikawaDiagram>('method');

    const ishikawaCategories = [
        { key: 'method', label: 'Método', color: 'bg-blue-100 text-blue-800 border-blue-200' },
        { key: 'machine', label: 'Máquina', color: 'bg-green-100 text-green-800 border-green-200' },
        { key: 'manpower', label: 'Mão de Obra', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
        { key: 'material', label: 'Material', color: 'bg-red-100 text-red-800 border-red-200' },
        { key: 'measurement', label: 'Medida', color: 'bg-purple-100 text-purple-800 border-purple-200' },
        { key: 'environment', label: 'Meio Ambiente', color: 'bg-orange-100 text-orange-800 border-orange-200' }
    ];

    const addIshikawaItem = () => {
        if (newIshikawaItem.trim()) {
            const currentItems = data.ishikawa[selectedCategory];
            onChange(`ishikawa.${selectedCategory}`, [...currentItems, newIshikawaItem.trim()]);
            setNewIshikawaItem('');
        }
    };

    const removeIshikawaItem = (category: keyof IshikawaDiagram, index: number) => {
        const currentItems = data.ishikawa[category];
        onChange(`ishikawa.${category}`, currentItems.filter((_, i) => i !== index));
    };

    const addRootCause = () => {
        onChange('root_causes', [...(data.root_causes || []), { id: generateId('RC'), root_cause_m_id: '', cause: '' }]);
    };

    const removeRootCause = (idx: number) => {
        const newList = [...data.root_causes];
        newList.splice(idx, 1);
        onChange('root_causes', newList);
    };

    const updateRootCause = (idx: number, field: 'root_cause_m_id' | 'cause', value: string) => {
        const newList = [...data.root_causes];
        newList[idx] = { ...newList[idx], [field]: value };
        onChange('root_causes', newList);
    };

    const filledWhysCount = data.five_whys.filter(w => w.answer.trim()).length;
    const canDefineRootCause = filledWhysCount >= 3;

    return (
        <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Investigação (5 Porquês e Ishikawa)</h2>
                <p className="text-gray-600">Análise profunda das causas do problema</p>
            </div>

            {/* 5 Whys */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200 shadow-sm">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Matriz dos 5 Porquês</h3>
                <p className="text-sm text-gray-600 mb-6">
                    Preencha pelo menos 3 níveis para desbloquear a definição da causa raiz
                </p>

                <div className="space-y-4">
                    {data.five_whys.map((w, index) => (
                        <div key={index} className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mt-2 shadow-sm">
                                {index + 1}
                            </div>
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-blue-700 mb-1 uppercase">Por que? (Efeito)</label>
                                    <Input
                                        value={w.why_question}
                                        onChange={(e) => {
                                            const newWhys = [...data.five_whys];
                                            newWhys[index] = { ...w, why_question: e.target.value };
                                            onChange('five_whys', newWhys);
                                        }}
                                        placeholder="Descreva o problema..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-blue-700 mb-1 uppercase">Porque... (Causa)</label>
                                    <Input
                                        value={w.answer}
                                        onChange={(e) => {
                                            const newWhys = [...data.five_whys];
                                            newWhys[index] = { ...w, answer: e.target.value };
                                            onChange('five_whys', newWhys);
                                        }}
                                        placeholder="Resposta..."
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-4 p-3 bg-white/60 rounded-lg border border-blue-300 inline-block">
                    <p className="text-sm font-medium text-blue-900">
                        Níveis preenchidos: {filledWhysCount}/5
                    </p>
                </div>
            </div>

            {/* Ishikawa (Fishbone) */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <h3 className="text-xl font-semibold text-gray-900">Diagrama de Ishikawa (6M)</h3>
                    <button
                        onClick={onAnalyzeAI}
                        disabled={isAnalyzing || !data.problem_description}
                        className="bg-white border border-green-300 text-green-700 hover:bg-green-100 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50"
                    >
                        {isAnalyzing ? <Loader2 className="animate-spin" size={16} /> : <Wand2 size={16} />}
                        Gerar com IA
                    </button>
                </div>

                <div className="mb-8 bg-white p-4 rounded-lg border border-green-200 shadow-sm flex flex-col md:flex-row gap-3 items-end">
                    <div className="flex-1 w-full">
                        <Select
                            label="Categoria"
                            options={ishikawaCategories.map(c => ({ value: c.key, label: c.label }))}
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value as any)}
                        />
                    </div>
                    <div className="flex-[2] w-full">
                        <Input
                            label="Novo Item"
                            placeholder="Adicionar causa..."
                            value={newIshikawaItem}
                            onChange={(e) => setNewIshikawaItem(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addIshikawaItem()}
                        />
                    </div>
                    <Button onClick={addIshikawaItem} className="gap-2 w-full md:w-auto" variant="primary">
                        <Plus className="w-4 h-4" />
                        Adicionar
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {ishikawaCategories.map((category) => (
                        <div key={category.key} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                            <h4 className={`font-semibold mb-3 px-3 py-1 rounded-full inline-block text-xs uppercase tracking-wider border ${category.color}`}>
                                {category.label}
                            </h4>
                            <ul className="space-y-2">
                                {data.ishikawa[category.key as keyof IshikawaDiagram].map((item, index) => (
                                    <li key={index} className="flex items-center justify-between gap-2 text-sm bg-gray-50 p-2 rounded border border-gray-100">
                                        <span className="text-gray-700 break-words flex-1">{item}</span>
                                        <button
                                            onClick={() => removeIshikawaItem(category.key as any, index)}
                                            className="text-gray-300 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </li>
                                ))}
                                {data.ishikawa[category.key as keyof IshikawaDiagram].length === 0 && (
                                    <li className="text-gray-300 text-xs italic py-2 text-center border border-dashed border-gray-200 rounded">
                                        Nenhum item adicionado
                                    </li>
                                )}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>

            {/* Root Cause Definition */}
            <div className={`p-6 rounded-xl border-2 shadow-sm transition-all ${canDefineRootCause ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-300' : 'bg-gray-100 border-gray-300'}`}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-semibold text-gray-900">Definição da Causa Raiz</h3>
                    {canDefineRootCause && (
                        <button onClick={addRootCause} className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors border border-yellow-300 text-sm">
                            <Plus size={16} /> ADD ROOT CAUSE
                        </button>
                    )}
                </div>

                {!canDefineRootCause && (
                    <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg flex items-center gap-3">
                        <AlertTriangle className="text-yellow-600" size={20} />
                        <p className="text-sm text-yellow-800">
                            Preencha pelo menos 3 níveis dos "5 Porquês" para desbloquear esta seção
                        </p>
                    </div>
                )}

                <div className="space-y-4">
                    {data.root_causes.length === 0 && canDefineRootCause && (
                        <p className="text-sm text-gray-500 italic text-center p-4 bg-white/50 rounded-lg border border-dashed border-yellow-200">
                            Nenhuma causa raiz definida. Clique em "Add Root Cause".
                        </p>
                    )}

                    {data.root_causes.map((rc, idx) => (
                        <div key={rc.id} className="grid grid-cols-12 gap-4 items-start bg-white p-4 rounded-lg border border-yellow-200 shadow-sm group">
                            <div className="col-span-12 md:col-span-4">
                                <Select
                                    label="Classificação (M)"
                                    options={[{ value: '', label: 'Selecione...' }, ...taxonomy.rootCauseMs.map(m => ({ value: m.id, label: m.name }))]}
                                    value={rc.root_cause_m_id}
                                    onChange={e => updateRootCause(idx, 'root_cause_m_id', e.target.value)}
                                />
                            </div>
                            <div className="col-span-12 md:col-span-7">
                                <Textarea
                                    label="Descrição da Causa Raiz"
                                    rows={2}
                                    value={rc.cause}
                                    onChange={e => updateRootCause(idx, 'cause', e.target.value)}
                                    placeholder="Descreva a conclusão da investigação..."
                                />
                            </div>
                            <div className="col-span-12 md:col-span-1 flex justify-center pt-8">
                                <button onClick={() => removeRootCause(idx)} className="text-gray-300 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-full">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {showHra && (
                    <div className="mt-6 p-4 bg-indigo-50 text-indigo-800 text-sm rounded-lg border border-indigo-200 flex items-start gap-3 animate-in fade-in">
                        <UserCheck size={20} className="mt-0.5 flex-shrink-0" />
                        <div>
                            <span className="font-bold block mb-1">Análise de Confiabilidade Humana Disponível</span>
                            <span>Uma ou mais causas raízes foram identificadas como <strong>Método</strong> ou <strong>Mão de Obra</strong>. A aba "Human Reliability" está agora acessível.</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
