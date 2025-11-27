
import React from 'react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { RcaRecord, TaxonomyConfig } from '../../types';

interface Step3Props {
    data: RcaRecord;
    onChange: (field: string, value: any) => void;
    taxonomy: TaxonomyConfig;
}

export const Step3Technical: React.FC<Step3Props> = ({ data, onChange, taxonomy }) => {
    return (
        <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Análise Técnica e Classificação</h2>
                <p className="text-gray-600 mb-6">Classifique a falha para fins estatísticos</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Select
                        label="Especialidade"
                        options={[{value: '', label: 'Select...'}, ...taxonomy.specialties.map(t => ({value: t.id, label: t.name}))]}
                        value={data.specialty_id}
                        onChange={(e) => onChange('specialty_id', e.target.value)}
                    />

                    <Select
                        label="Modo de Falha"
                        options={[{value: '', label: 'Select...'}, ...taxonomy.failureModes.map(t => ({value: t.id, label: t.name}))]}
                        value={data.failure_mode_id}
                        onChange={(e) => onChange('failure_mode_id', e.target.value)}
                    />

                    <Select
                        label="Categoria da Falha"
                        options={[{value: '', label: 'Select...'}, ...taxonomy.failureCategories.map(t => ({value: t.id, label: t.name}))]}
                        value={data.failure_category_id}
                        onChange={(e) => onChange('failure_category_id', e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Dados Quantitativos Confirmados</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                        label="Duração da Parada (minutos)"
                        type="number"
                        placeholder="0"
                        value={data.downtime_minutes}
                        onChange={(e) => onChange('downtime_minutes', parseInt(e.target.value) || 0)}
                    />

                    <Input
                        label="Impacto Financeiro (R$)"
                        type="number"
                        placeholder="0.00"
                        step="0.01"
                        value={data.financial_impact}
                        onChange={(e) => onChange('financial_impact', parseFloat(e.target.value) || 0)}
                    />
                </div>

                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                        <strong>Impacto Estimado:</strong> {' '}
                        {(data.financial_impact || 0).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                        })} em {data.downtime_minutes || 0} minutos de parada
                    </p>
                </div>
            </div>
        </div>
    );
};
