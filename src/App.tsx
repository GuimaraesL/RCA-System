/**
 * Proposta: Ponto de entrada e orquestrador principal da interface React.
 * Fluxo: Gerencia a navegação entre visões (Dashboard, Análises, etc.), controla a abertura do editor de RCA e provê os provedores de contexto globais (Idioma, Filtros, Dados).
 */

import { STATUS_IDS } from './constants/SystemConstants';
import React, { useState, useRef, useCallback, Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
import { RcaRecord, TriggerRecord } from './types';

// Carregamento Preguiçoso (Lazy Loading) para otimização de performance e divisão de código
const RcaEditor = lazy(() => import('./components/modals/RcaEditor').then(m => ({ default: m.RcaEditor })));
const AssetsManager = lazy(() => import('./components/views/AssetsManager').then(m => ({ default: m.AssetsManager })));
const Dashboard = lazy(() => import('./components/views/Dashboard').then(m => ({ default: m.Dashboard })));
const AnalysesView = lazy(() => import('./components/views/AnalysesView').then(m => ({ default: m.AnalysesView })));
const ActionsView = lazy(() => import('./components/views/ActionsView').then(m => ({ default: m.ActionsView })));
const TriggersView = lazy(() => import('./components/triggers').then(m => ({ default: m.TriggersPage })));
const SettingsView = lazy(() => import('./components/views/SettingsView').then(m => ({ default: m.SettingsView })));
const MigrationView = lazy(() => import('./components/views/MigrationView').then(m => ({ default: m.MigrationView })));

import { RcaProvider, useRcaContext } from './context/RcaContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { FilterProvider } from './context/FilterContext';
import { ToastProvider } from './context/ToastContext';
import { useLanguage } from './context/LanguageDefinition';
import { Sidebar } from './components/layout/Sidebar';
import { generateId } from './services/utils';
import { ConfirmModal } from './components/modals/ConfirmModal';
import { ShortcutsHelpModal } from './components/modals/ShortcutsHelpModal';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

const AppContent: React.FC = () => {
    const { t } = useLanguage();
    const [view, setView] = useState<'DASHBOARD' | 'ANALYSES' | 'ACTIONS' | 'TRIGGERS' | 'ASSETS' | 'SETTINGS' | 'MIGRATION'>('DASHBOARD');
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<RcaRecord | null>(null);
    const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
    const sidebarToggleRef = useRef<(() => void) | null>(null);

    // Estado para Rollback de RCA criada via Gatilho
    const [rollbackTrigger, setRollbackTrigger] = useState<TriggerRecord | null>(null);

    // Estado para Guarda de Navegação
    const [showNavConfirm, setShowNavConfirm] = useState(false);
    const [pendingView, setPendingView] = useState<typeof view | null>(null);

    const { refreshAll, records, triggers, updateTrigger, addRecord, deleteRecord, taxonomy, assets } = useRcaContext();

    // Atalhos de Teclado (Issue #71)
    const handleToggleShortcutsHelp = useCallback(() => setShowShortcutsHelp(prev => !prev), []);

    useKeyboardShortcuts({
        onNewRca: () => {
            if (!isEditorOpen) {
                openNew();
            }
        },
        onFocusSearch: () => {
            const searchInput = document.querySelector<HTMLInputElement>('[data-shortcut-search]');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        },
        onEscape: () => {
            if (showShortcutsHelp) {
                setShowShortcutsHelp(false);
            } else if (showNavConfirm) {
                setShowNavConfirm(false);
            } else if (isEditorOpen) {
                handleCancelRca();
            }
        },
        onToggleSidebar: () => {
            sidebarToggleRef.current?.();
        },

        onNavigate: (target) => {
            handleViewChange(target as typeof view);
        },
    });

    const handleCloseEditor = () => {
        setIsEditorOpen(false);
        setEditingRecord(null);
        setRollbackTrigger(null);
        refreshAll(); // Sincroniza dados para refletir mudanças no Dashboard
    };

    /**
     * Finaliza a edição salvando as alterações.
     */
    const handleSaveRca = () => {
        handleCloseEditor();
    };

    /**
     * Cancela a edição e realiza rollback se a RCA foi criada via Gatilho e não foi confirmada.
     */
    const handleCancelRca = async () => {
        if (rollbackTrigger && editingRecord) {
            try {
                // Desvincula TODOS os triggers associados (suporta N:1 - Issue #80)
                const idsToRollback = editingRecord.trigger_ids || [rollbackTrigger.id];
                for (const trigId of idsToRollback) {
                    const trig = triggers.find(t => t.id === trigId);
                    if (trig) {
                        await updateTrigger({ ...trig, rca_id: '' });
                    }
                }

                await deleteRecord(editingRecord.id);
            } catch (error) {
                console.error('Rollback Error: Falha ao realizar rollback:', error);
            }
        }
        handleCloseEditor();
    };

    /**
     * Intercepta a mudança de visão se o editor estiver aberto para evitar perda de dados acidental.
     */
    const handleViewChange = (nextView: typeof view) => {
        if (isEditorOpen) {
            setPendingView(nextView);
            setShowNavConfirm(true);
        } else {
            setView(nextView);
        }
    };

    const confirmNavigation = async () => {
        if (pendingView) {
            if (rollbackTrigger && editingRecord) {
                try {
                    // Desvincula TODOS os triggers associados (suporta N:1 - Issue #80)
                    const idsToRollback = editingRecord.trigger_ids || [rollbackTrigger.id];
                    for (const trigId of idsToRollback) {
                        const trig = triggers.find(t => t.id === trigId);
                        if (trig) {
                            await updateTrigger({ ...trig, rca_id: '' });
                        }
                    }
                    await deleteRecord(editingRecord.id);
                } catch (e) {
                    console.error('Erro no rollback durante navegação:', e);
                }
            }
            setView(pendingView);
            setIsEditorOpen(false);
            setEditingRecord(null);
            setRollbackTrigger(null);
        }
        setShowNavConfirm(false);
        setPendingView(null);
    };

    const openNew = () => {
        setEditingRecord(null);
        setIsEditorOpen(true);
    };

    const openEdit = async (rec: RcaRecord) => {
        // Busca o registro completo antes de abrir o editor (otimização de carga de blobs)
        const fullRecord = await import('./services/apiService').then(m => m.fetchRecordById(rec.id));
        setEditingRecord(fullRecord || rec);
        setIsEditorOpen(true);
    };

    const handleOpenRca = async (rcaId: string) => {
        const fullRecord = await import('./services/apiService').then(m => m.fetchRecordById(rcaId));
        if (fullRecord) {
            setEditingRecord(fullRecord);
            setIsEditorOpen(true);
        } else {
            const record = records.find(r => r.id === rcaId);
            if (record) {
                setEditingRecord(record);
                setIsEditorOpen(true);
            }
        }
    };

    const getAssetName = (id: string, nodes: any[]): string => {
        for (const node of nodes) {
            if (node.id === id) return node.name;
            if (node.children) {
                const found = getAssetName(id, node.children);
                if (found) return found;
            }
        }
        return '';
    };

    /**
     * Converte um Gatilho de parada em uma nova Análise RCA.
     * Realiza a herança automática de dados do evento e vinculação técnica.
     */
    const handleCreateRcaFromTriggers = async (triggers: TriggerRecord[]) => {
        if (triggers.length === 0) return;

        // Ordena por data de início para pegar o mais antigo primeiro
        const sorted = [...triggers].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
        const primary = sorted[0];

        const primaryAssetId = primary.subgroup_id || primary.equipment_id || primary.area_id;
        const assetName = primaryAssetId ? getAssetName(primaryAssetId, assets) : '';

        // Consolidação de dados dos múltiplos triggers
        const totalDowntime = sorted.reduce((sum, t) => sum + (t.duration_minutes || 0), 0);
        const descriptions = sorted.map(t => `${t.stop_type} - ${t.stop_reason}${t.comments ? `. ${t.comments}` : ''}`).join('\n');
        const triggerIds = sorted.map(t => t.id);

        const newRca: RcaRecord = {
            id: generateId('RCA'),
            version: '1.0',
            status: STATUS_IDS.IN_PROGRESS,
            failure_date: primary.start_date.split('T')[0],
            failure_time: primary.start_date.split('T')[1]?.substring(0, 5) || '00:00',
            downtime_minutes: totalDowntime,
            financial_impact: 0,
            os_number: '',
            area_id: primary.area_id,
            equipment_id: primary.equipment_id,
            subgroup_id: primary.subgroup_id,
            asset_name_display: assetName,
            component_type: '',
            analysis_type: primary.analysis_type_id,
            what: triggers.length === 1
                ? `${t('common.failurePrefix')}: ${primary.stop_reason}`
                : `${t('common.failurePrefix')}: ${triggers.length} eventos agrupados`,
            problem_description: descriptions,
            facilitator: primary.responsible,
            participants: [],
            root_causes: [],
            five_whys: [],
            ishikawa: { machine: [], method: [], material: [], manpower: [], measurement: [], environment: [] },
            precision_maintenance: [],
            containment_actions: [],
            lessons_learned: [],
            additionalInfo: {
                historicalInfo: `Gerado a partir de ${triggers.length} Gatilho(s): ${triggerIds.join(', ')}`
            },
            analysis_date: new Date().toISOString().split('T')[0],
            analysis_duration_minutes: 0,
            specialty_id: '',
            failure_mode_id: '',
            failure_category_id: '',
            who: primary.responsible,
            when: primary.start_date,
            where_description: assetName,
            potential_impacts: '',
            trigger_ids: triggerIds
        };

        try {
            // 1. Persiste a RCA primeiro (necessario para vincular os triggers)
            await addRecord(newRca);

            // 2. Vincula todos os triggers ANTES de abrir o editor
            //    Evita condicao de corrida onde o editor abre antes da vinculacao completar
            for (const trig of sorted) {
                await updateTrigger({ ...trig, rca_id: newRca.id });
            }

            // 3. Abre o editor somente apos todas as vinculacoes estarem persistidas
            setEditingRecord(newRca);
            setRollbackTrigger(primary);
            setIsEditorOpen(true);
        } catch (error) {
            console.error('Context Error: Falha ao criar RCA a partir dos gatilhos:', error);
            alert('Erro ao criar RCA. Verifique a conexão com o servidor.');
        }
    };

    return (
        <div className="flex h-screen bg-page-gradient font-sans text-slate-900 dark:text-slate-100">
            <Sidebar
                view={view}
                setView={handleViewChange}
                toggleRef={sidebarToggleRef}
                onShowHelp={handleToggleShortcutsHelp}
                isBlocked={isEditorOpen}
            />

            <main className="flex-1 overflow-hidden relative flex flex-col w-full">
                <Suspense fallback={
                    <div className="flex-1 flex items-center justify-center bg-slate-50/50" data-testid="app-suspense-loading">
                        <div className="flex flex-col items-center gap-3 text-slate-400">
                            <Loader2 className="animate-spin" size={32} />
                            <span className="text-sm font-medium">{t('common.loading')}</span>
                        </div>
                    </div>
                }>
                    <div className="flex-1 relative overflow-hidden flex flex-col">
                        <div key={view} className={`flex-1 overflow-auto bg-slate-50/50 dark:bg-slate-900/50 ${(window as any).isPlaywright ? '' : 'animate-in fade-in slide-in-from-bottom-2 duration-300'}`}>
                            {view === 'DASHBOARD' && <Dashboard />}
                            {view === 'TRIGGERS' && <TriggersView onCreateRca={handleCreateRcaFromTriggers} onOpenRca={handleOpenRca} />}
                            {view === 'ANALYSES' && <AnalysesView onNew={openNew} onEdit={openEdit} />}
                            {view === 'ACTIONS' && <ActionsView onOpenRca={handleOpenRca} />}
                            {view === 'ASSETS' && <AssetsManager />}
                            {view === 'SETTINGS' && <SettingsView />}
                            {view === 'MIGRATION' && <MigrationView />}
                        </div>
                    </div>
                </Suspense>
            </main>

            {/* Overlay Global do Editor - Cobre Sidebar e Main (z-50) */}
            {isEditorOpen && (
                <div
                    className="fixed inset-0 bg-slate-50 dark:bg-slate-900 p-0 z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
                    data-testid="rca-editor-overlay"
                >
                    <div className="flex-1 p-6 overflow-hidden">
                        <RcaEditor
                            existingRecord={editingRecord}
                            onClose={handleCancelRca}
                            onSave={handleSaveRca}
                        />
                    </div>
                </div>
            )}

            {/* Modal de Confirmação de Saída do Editor */}
            <ConfirmModal
                isOpen={showNavConfirm}
                title={t('modals.pendingChangesTitle')}
                message={t('modals.pendingChangesMessage')}
                confirmText={t('modals.leaveWithoutSaving')}
                cancelText={t('modals.stayAndEdit')}
                onConfirm={confirmNavigation}
                onCancel={() => setShowNavConfirm(false)}
                variant="warning"
            />

            {/* Modal de Ajuda de Atalhos de Teclado (Issue #71) */}
            <ShortcutsHelpModal
                isOpen={showShortcutsHelp}
                onClose={() => setShowShortcutsHelp(false)}
            />
        </div>
    );
};

export default function App() {
    return (
        <ThemeProvider>
            <LanguageProvider>
                <FilterProvider>
                    <RcaProvider>
                        <ToastProvider>
                            <div data-testid="app-ready">
                                <AppContent />
                            </div>
                        </ToastProvider>
                    </RcaProvider>
                </FilterProvider>
            </LanguageProvider>
        </ThemeProvider>
    );
}
