
import React from 'react';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { RcaRecord } from '../../types';

interface Step2Props {
    data: RcaRecord;
    onChange: (field: string, value: any) => void;
}

export const Step2Problem: React.FC<Step2Props> = ({ data, onChange }) => {
    return (
        <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">1. Definição do Problema (5W1H)</h2>
                <p className="text-gray-600 mb-6">Descreva o problema utilizando a metodologia 5W1H</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <Input
                        label="Quem (Who)"
                        placeholder="Quem detectou o problema?"
                        value={data.who}
                        onChange={(e) => onChange('who', e.target.value)}
                    />

                    <Input
                        label="Quando (When)"
                        placeholder="Data/Hora da ocorrência detalhada"
                        value={data.when}
                        onChange={(e) => onChange('when', e.target.value)}
                    />

                    <Input
                        label="Onde (Where)"
                        placeholder="Área, Equipamento, Local específico"
                        value={data.where_description}
                        onChange={(e) => onChange('where_description', e.target.value)}
                    />

                    <Input
                        label="O Que (What) - Título Curto"
                        placeholder="Descrição sucinta da falha"
                        value={data.what}
                        onChange={(e) => onChange('what', e.target.value)}
                    />
                </div>

                <div className="space-y-6">
                    <Textarea
                        label="Descrição Detalhada do Problema"
                        placeholder="Descreva detalhadamente o problema, incluindo circunstâncias e contexto..."
                        rows={6}
                        value={data.problem_description}
                        onChange={(e) => onChange('problem_description', e.target.value)}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Textarea
                            label="Impactos Potenciais (Operacionais)"
                            placeholder="Descreva os riscos: Segurança, Ambiental, Custo..."
                            rows={4}
                            value={data.potential_impacts}
                            onChange={(e) => onChange('potential_impacts', e.target.value)}
                        />
                        <Textarea
                            label="Impactos para a Qualidade"
                            placeholder="Desvios de qualidade, refugos, etc."
                            rows={4}
                            value={data.quality_impacts || ''}
                            onChange={(e) => onChange('quality_impacts', e.target.value)}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
