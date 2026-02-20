/**
 * Proposta: Vista principal de gestão de Gatilhos (Triggers) de parada.
 * Fluxo: Gerencia a listagem de eventos, criação de novos gatilhos, conversão para RCA e orquestração de modais de edição e vinculação.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useTriggersLogic } from '../../hooks/useTriggersLogic';
import { TriggersList } from './TriggersList';
import { TriggerModal } from './TriggerModal';
import { FilterBar } from '../layout/FilterBar';
import { TriggerRecord } from '../../types';
import { Plus, Layers } from 'lucide-react';
import { ShortcutLabel } from '../ui/ShortcutLabel';
import { useLanguage } from '../../context/LanguageDefinition';
import { RcaSelector } from '../selectors/RcaSelector';
import { ConfirmModal } from '../modals/ConfirmModal';

interface TriggersPageProps {
    onCreateRca: (triggers: TriggerRecord[]) => void;
    onOpenRca: (rcaId: string) => void;
}

export const TriggersPage: React.FC<TriggersPageProps> = ({ onCreateRca, onOpenRca }) => {
    const { t } = useLanguage();
    const {
        triggers, assets, taxonomy, records,
        addTrigger, updateTrigger, deleteTrigger,
        isModalOpen, setIsModalOpen,
        editingTrigger, setEditingTrigger,
        deleteModalOpen, setDeleteModalOpen,
        triggerToDelete, setTriggerToDelete,
        linkModalOpen, setLinkModalOpen,
        triggerToLink, setTriggerToLink,
        currentPage, setCurrentPage, itemsPerPage,
        showFilters, setShowFilters, filters, setFilters, handleReset, isGlobal, toggleGlobal,
        dynamicOptions,
        filteredTriggers,
        sortConfig, handleSort,
        availableTriggerOptions
    } = useTriggersLogic();

    // --- Estado de Seleção Múltipla (Issue #80) ---
    const [selectedTriggerIds, setSelectedTriggerIds] = useState<Set<string>>(new Set());

    // Valida se um trigger pode ser selecionado com base no ativo do primeiro selecionado
    const selectionConstraint = useMemo(() => {
        if (selectedTriggerIds.size === 0) return null;
        const firstId = Array.from(selectedTriggerIds)[0];
        // Busca na lista master para não perder a referência caso o usuário mude filtros/páginas
        const firstTrigger = triggers.find(t => t.id === firstId);
        if (!firstTrigger) return null;
        return firstTrigger.equipment_id;
    }, [selectedTriggerIds, triggers]);

    const canSelectTrigger = useCallback((trigger: TriggerRecord): boolean => {
        // Triggers já vinculados a uma RCA não podem ser selecionados
        if (trigger.rca_id) return false;

        // Se a constraint existe (tem equipamento), compara
        if (selectionConstraint != null) {
            return trigger.equipment_id === selectionConstraint;
        }

        return true;
    }, [selectionConstraint]);

    const handleToggleSelect = useCallback((triggerId: string) => {
        setSelectedTriggerIds(prev => {
            const next = new Set(prev);
            if (next.has(triggerId)) {
                next.delete(triggerId);
            } else {
                next.add(triggerId);
            }
            return next;
        });
    }, []);

    const handleSelectAll = useCallback(() => {
        let currentConstraint = selectionConstraint;
        const newSelected = new Set(selectedTriggerIds);

        const pageTriggers = filteredTriggers
            .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
            .filter(t => !t.rca_id); // Filtra logo os que já estão vinculados

        // Determina se vamos selecionar ou desselecionar os itens válidos da página atual
        const selectablePage = pageTriggers.filter(t => {
            if (currentConstraint == null) return true;
            return t.equipment_id === currentConstraint;
        });

        const allSelected = selectablePage.length > 0 && selectablePage.every(t => selectedTriggerIds.has(t.id));

        if (allSelected) {
            // Deselecionar todos da página atual
            selectablePage.forEach(t => newSelected.delete(t.id));
        } else {
            // Selecionar todos os válidos da página atual
            pageTriggers.forEach(t => {
                if (currentConstraint == null) {
                    // O primeiro selecionado define a restrição para os demais!
                    currentConstraint = t.equipment_id;
                    newSelected.add(t.id);
                } else if (t.equipment_id === currentConstraint) {
                    newSelected.add(t.id);
                }
            });
        }

        setSelectedTriggerIds(newSelected);
    }, [filteredTriggers, currentPage, itemsPerPage, selectionConstraint, selectedTriggerIds]);

    // --- Orquestradores de Interface ---

    const handleNew = () => {
        const defaultStatus = taxonomy.triggerStatuses?.[0]?.id || '';
        setEditingTrigger({
            id: '',
            area_id: '',
            equipment_id: '',
            subgroup_id: '',
            start_date: new Date().toISOString().slice(0, 16),
            end_date: new Date().toISOString().slice(0, 16),
            duration_minutes: 0,
            stop_type: 'Falha',
            stop_reason: '',
            comments: '',
            analysis_type_id: '',
            status: defaultStatus,
            responsible: '',
            rca_id: ''
        });
        setIsModalOpen(true);
    };

    const handleEdit = (trigger: TriggerRecord) => {
        setEditingTrigger({ ...trigger });
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        setTriggerToDelete(id);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!triggerToDelete) return;
        try {
            await deleteTrigger(triggerToDelete);
        } catch (error) {
            console.error('Erro ao excluir gatilho:', error);
        }
        setDeleteModalOpen(false);
        setTriggerToDelete(null);
    };

    const handleSave = (trigger: TriggerRecord) => {
        if (triggers.find(t => t.id === trigger.id)) {
            updateTrigger(trigger);
        } else {
            addTrigger(trigger);
        }
        setIsModalOpen(false);
    };

    const openLinkModal = (t: TriggerRecord) => {
        setTriggerToLink(t);
        setLinkModalOpen(true);
    };

    const closeLinkModal = () => {
        setLinkModalOpen(false);
        setTriggerToLink(null);
    };

    const handleLinkRca = (trigger: TriggerRecord, rcaId: string) => {
        updateTrigger({ ...trigger, rca_id: rcaId });
    };

    const handleUnlinkRca = (trigger: TriggerRecord) => {
        updateTrigger({ ...trigger, rca_id: '' });
    };

    // Criação individual (botão '+' na linha) - encapsula em array para compatibilidade
    const handleCreateRcaSingle = (trigger: TriggerRecord) => {
        onCreateRca([trigger]);
    };

    // Criação em lote a partir dos selecionados (Issue #80)
    const handleCreateRcaBatch = () => {
        const selected = filteredTriggers.filter(t => selectedTriggerIds.has(t.id));
        if (selected.length === 0) return;
        onCreateRca(selected);
        setSelectedTriggerIds(new Set());
    };

    // Verificação de segurança para garantir carga de dados base
    if (!taxonomy || !assets) return <div className="p-8 text-center text-slate-500 animate-pulse">{t('common.loading')}</div>;

    return (
        <div className="p-8 lg:p-12 max-w-[1600px] mx-auto h-full flex flex-col relative space-y-8">
            {/* Cabecalho */}
            <div className="flex justify-between items-end flex-shrink-0 animate-in fade-in slide-in-from-top-4 duration-700">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white font-display tracking-tight">{t('triggersPage.title')}</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">{t('triggersPage.manageDowntime')}</p>
                </div>
                <div className="flex items-center gap-3">
                    {selectedTriggerIds.size > 0 && (
                        <button
                            onClick={handleCreateRcaBatch}
                            data-testid="btn-batch-create-rca"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all active:scale-95 animate-in fade-in zoom-in-95 duration-200"
                        >
                            <Layers size={20} strokeWidth={3} />
                            {t('triggersPage.createRcaBatch') || `Criar RCA (${selectedTriggerIds.size})`}
                        </button>
                    )}
                    <button onClick={handleNew} data-testid="btn-new-trigger" accessKey="g" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all active:scale-95" title="Alt+G">
                        <Plus size={20} strokeWidth={3} /><ShortcutLabel text={t('triggersPage.newTrigger')} shortcutLetter="G" />
                    </button>
                </div>
            </div>

            {/* Secao de Filtros */}
            <div className="animate-in fade-in slide-in-from-top-4 duration-700 delay-100">
                <FilterBar
                    isOpen={showFilters}
                    onToggle={() => setShowFilters(!showFilters)}
                    filters={filters}
                    onFilterChange={setFilters}
                    onReset={() => handleReset({
                        searchTerm: '',
                        year: '',
                        months: [],
                        status: 'ALL',
                        area: 'ALL',
                        equipment: 'ALL',
                        subgroup: 'ALL',
                        specialty: 'ALL',
                        analysisType: 'ALL',
                        failureMode: 'ALL',
                        failureCategory: 'ALL',
                        componentType: 'ALL',
                        rootCause6M: 'ALL'
                    })}
                    totalResults={filteredTriggers.length}
                    config={{
                        showSearch: true,
                        showDate: true,
                        showStatus: true,
                        showAssetHierarchy: true,
                        showAnalysisType: true,
                        showSpecialty: false,
                        showComponentType: true
                    }}
                    options={{
                        statuses: dynamicOptions.statuses,
                        analysisTypes: dynamicOptions.analysisTypes,
                        assets: dynamicOptions.assets,
                        failureModes: taxonomy.failureModes,
                        failureCategories: taxonomy.failureCategories,
                        componentTypes: taxonomy.componentTypes,
                        rootCause6Ms: taxonomy.rootCauseMs
                    }}
                    isGlobal={isGlobal}
                    onGlobalToggle={toggleGlobal}
                    availableOptions={availableTriggerOptions}
                />
            </div>

            <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-800 overflow-hidden flex flex-col min-h-0 animate-in fade-in duration-1000 delay-200">
                <TriggersList
                    filteredTriggers={filteredTriggers}
                    currentPage={currentPage}
                    itemsPerPage={itemsPerPage}
                    assets={assets}
                    taxonomy={taxonomy}
                    records={records}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onLinkRca={openLinkModal}
                    onUnlinkRca={handleUnlinkRca}
                    onCreateRca={handleCreateRcaSingle}
                    onOpenRca={onOpenRca}
                    sortConfig={sortConfig}
                    handleSort={handleSort}
                    setCurrentPage={setCurrentPage}
                    selectedTriggerIds={selectedTriggerIds}
                    onToggleSelect={handleToggleSelect}
                    onSelectAll={handleSelectAll}
                    canSelectTrigger={canSelectTrigger}
                />
            </div>

            {/* Modais de Edição e Vinculação */}
            {isModalOpen && editingTrigger && (
                <TriggerModal
                    editingTrigger={editingTrigger}
                    setEditingTrigger={setEditingTrigger}
                    setIsModalOpen={setIsModalOpen}
                    handleSave={handleSave}
                    assets={assets}
                    taxonomy={taxonomy}
                />
            )}

            {
                linkModalOpen && triggerToLink && (
                    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="w-full max-w-6xl animate-in zoom-in-95 duration-300">
                            <RcaSelector
                                records={records}
                                assets={assets}
                                taxonomy={taxonomy}
                                onSelect={(rcaId) => {
                                    handleLinkRca(triggerToLink, rcaId);
                                    closeLinkModal();
                                }}
                                onCancel={closeLinkModal}
                            />
                        </div>
                    </div>
                )
            }

            <ConfirmModal
                isOpen={deleteModalOpen}
                onCancel={() => setDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title={t('modals.deleteTitle')}
                message={t('modals.deleteMessage')}
            />
        </div>
    );
};
