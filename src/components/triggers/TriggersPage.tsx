/**
 * Proposta: Vista principal de gestão de Gatilhos (Triggers) de parada.
 * Fluxo: Gerencia a listagem de eventos, criação de novos gatilhos, conversão para RCA e orquestração de modais de edição e vinculação.
 */

import React from 'react';
import { useTriggersLogic } from '../../hooks/useTriggersLogic'; 
import { TriggersList } from './TriggersList';
import { TriggerModal } from './TriggerModal';
import { FilterBar } from '../FilterBar';
import { TriggerRecord } from '../../types';
import { Plus } from 'lucide-react';
import { useLanguage } from '../../context/LanguageDefinition';
import { RcaSelector } from '../RcaSelector';
import { ConfirmModal } from '../ConfirmModal'; 

interface TriggersPageProps {
    onCreateRca: (trigger: TriggerRecord) => void;
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
            console.log('✅ Contexto: Gatilho excluído com sucesso');
        } catch (error) {
            console.error('❌ Erro ao excluir gatilho:', error);
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
        const doneStatus = taxonomy.triggerStatuses?.find(s => s.name === 'Concluída')?.id || trigger.status;
        updateTrigger({ ...trigger, rca_id: rcaId, status: doneStatus });
    };

    const handleUnlinkRca = (trigger: TriggerRecord) => {
        const defaultStatus = taxonomy.triggerStatuses?.[0]?.id || trigger.status;
        updateTrigger({ ...trigger, rca_id: '', status: defaultStatus });
    };

    const handleCreateRca = (trigger: TriggerRecord) => {
        onCreateRca(trigger);
    };

    // Verificação de segurança para garantir carga de dados base
    if (!taxonomy || !assets) return <div className="p-8 text-center text-slate-500 animate-pulse">{t('common.loading')}</div>;

    return (
        <div className="p-8 lg:p-12 max-w-[1600px] mx-auto h-full flex flex-col relative space-y-8">
            {/* Cabeçalho */}
            <div className="flex justify-between items-end flex-shrink-0 animate-in fade-in slide-in-from-top-4 duration-700">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 font-display tracking-tight">{t('triggersPage.title')}</h1>
                    <p className="text-slate-500 mt-2 font-medium">{t('triggersPage.manageDowntime')}</p>
                </div>
                <button onClick={handleNew} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all active:scale-95">
                    <Plus size={20} strokeWidth={3} /> {t('triggersPage.newTrigger')}
                </button>
            </div>

            {/* Seção de Filtros */}
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

            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden flex flex-col min-h-0 animate-in fade-in duration-1000 delay-200">
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
                    onCreateRca={handleCreateRca}
                    onOpenRca={onOpenRca}
                    sortConfig={sortConfig}
                    handleSort={handleSort}
                    setCurrentPage={setCurrentPage}
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
                    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
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