
import React from 'react';
import { useTriggersLogic } from '../../hooks/useTriggersLogic'; // Adjust path
import { TriggersList } from './TriggersList';
import { TriggerModal } from './TriggerModal';
import { FilterBar } from '../FilterBar';
import { TriggerRecord } from '../../types';
import { Plus } from 'lucide-react';
import { useLanguage } from '../../context/LanguageDefinition';
import { RcaSelector } from '../RcaSelector';
import { ConfirmModal } from '../ConfirmModal'; // Ensure this exists or use a generic one

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
        sortConfig, handleSort
    } = useTriggersLogic();

    // Handlers exposed to UI
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
            console.log('✅ Trigger excluído:', triggerToDelete);
        } catch (error) {
            console.error('❌ Erro ao excluir trigger:', error);
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

    const handleCreateRca = (trigger: TriggerRecord) => {
        onCreateRca(trigger);
    };

    // Defensive check
    if (!taxonomy || !assets) return <div className="p-8 text-center text-slate-500 animate-pulse">{t('common.loading')}</div>;

    return (
        <div className="p-8 max-w-[1600px] mx-auto h-full flex flex-col relative">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 flex-shrink-0 animate-in fade-in slide-in-from-top-4 duration-500">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">{t('triggersPage.title')}</h1>
                    <p className="text-slate-500 mt-1">{t('triggersPage.manageDowntime')}</p>
                </div>
                <button onClick={handleNew} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors">
                    <Plus size={18} /> {t('triggersPage.newTrigger')}
                </button>
            </div>

            {/* Filter */}
            <div className="animate-in fade-in slide-in-from-top-4 duration-500 delay-100">
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
                        specialty: 'ALL', // Not used in triggers but required by type
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
                />
            </div>

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
                onCreateRca={handleCreateRca}
                onOpenRca={onOpenRca}
                sortConfig={sortConfig}
                handleSort={handleSort}
                setCurrentPage={setCurrentPage}
            />

            {/* Modal */}
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

            {/* Modal de Link RCA */}
            {
                linkModalOpen && triggerToLink && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="w-full max-w-2xl">
                            <RcaSelector
                                records={records}
                                assets={assets} // Pass assets if needed by RcaSelector
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

            {/* Modal de Confirmação de Exclusão */}
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
