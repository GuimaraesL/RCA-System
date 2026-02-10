
import React, { useState, Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
import { RcaRecord, TriggerRecord } from './types';

// Lazy Loading: Code Splitting para performance
// Cada componente é carregado apenas quando necessário
const RcaEditor = lazy(() => import('./components/RcaEditor').then(m => ({ default: m.RcaEditor })));
const AssetsManager = lazy(() => import('./components/AssetsManager').then(m => ({ default: m.AssetsManager })));
const Dashboard = lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const AnalysesView = lazy(() => import('./components/AnalysesView').then(m => ({ default: m.AnalysesView })));
const ActionsView = lazy(() => import('./components/ActionsView').then(m => ({ default: m.ActionsView })));
const TriggersView = lazy(() => import('./components/triggers').then(m => ({ default: m.TriggersPage })));
const SettingsView = lazy(() => import('./components/SettingsView').then(m => ({ default: m.SettingsView })));
const MigrationView = lazy(() => import('./components/MigrationView').then(m => ({ default: m.MigrationView })));

import { RcaProvider, useRcaContext } from './context/RcaContext';
import { LanguageProvider } from './context/LanguageContext';
import { FilterProvider } from './context/FilterContext';
import { useLanguage } from './context/LanguageDefinition';
import { Sidebar } from './components/Sidebar';
import { generateId } from './services/utils';

const AppContent: React.FC = () => {
    const { t } = useLanguage();
    const [view, setView] = useState<'DASHBOARD' | 'ANALYSES' | 'ACTIONS' | 'TRIGGERS' | 'ASSETS' | 'SETTINGS' | 'MIGRATION'>('DASHBOARD');
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<RcaRecord | null>(null);

    const { refreshAll, records, updateTrigger, taxonomy, assets } = useRcaContext();

    const handleCloseEditor = () => {
        setIsEditorOpen(false);
        setEditingRecord(null);
        refreshAll(); // Ensure Dashboard reflects changes immediately
    };

    const openNew = () => {
        setEditingRecord(null);
        setIsEditorOpen(true);
    };

    const openEdit = async (rec: RcaRecord) => {
        // Optimization: Fetch full record details before editing
        // The list view now returns a summary payload.
        const fullRecord = await import('./services/apiService').then(m => m.fetchRecordById(rec.id));
        setEditingRecord(fullRecord || rec); // Fallback to list record if fetch fails (shouldn't happen)
        setIsEditorOpen(true);
    };

    const handleOpenRca = async (rcaId: string) => {
        // Optimization: Fetch full record here too
        const fullRecord = await import('./services/apiService').then(m => m.fetchRecordById(rcaId));
        if (fullRecord) {
            setEditingRecord(fullRecord);
            setIsEditorOpen(true);
        } else {
            // Fallback: try finding in list (might be incomplete)
            const record = records.find(r => r.id === rcaId);
            if (record) {
                setEditingRecord(record);
                setIsEditorOpen(true);
            }
        }
    };

    // Helper to get asset name (recursive)
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

    // Create RCA from Trigger
    const handleCreateRcaFromTrigger = (trigger: TriggerRecord) => {
        // Determine primary asset ID for name lookup
        const primaryAssetId = trigger.subgroup_id || trigger.equipment_id || trigger.area_id;
        const assetName = primaryAssetId ? getAssetName(primaryAssetId, assets) : '';

        // 1. Construct partial RCA from Trigger Data
        const newRca: Partial<RcaRecord> = {
            id: generateId('RCA'),
            failure_date: trigger.start_date.split('T')[0],
            failure_time: trigger.start_date.split('T')[1]?.substring(0, 5) || '00:00',
            downtime_minutes: trigger.duration_minutes,

            // Hierarchy Inheritance
            area_id: trigger.area_id,
            equipment_id: trigger.equipment_id,
            subgroup_id: trigger.subgroup_id,
            asset_name_display: assetName, // Populate Name

            analysis_type: trigger.analysis_type_id,
            what: `${t('common.failurePrefix')}: ${trigger.stop_reason}`,
            problem_description: `${trigger.stop_type} - ${trigger.stop_reason}. ${trigger.comments || ''}`,
            facilitator: trigger.responsible,

            // Link back to trigger for traceability (stored in historicalInfo)
            additionalInfo: {
                historicalInfo: `Generated from Trigger ID: ${trigger.id}`
            }
        };

        // 2. Open Editor
        setEditingRecord(newRca as RcaRecord); // Cast as RcaRecord, hook will fill defaults
        setIsEditorOpen(true);

        // 3. Update Trigger with the new RCA ID immediately
        const inProgressStatusId = taxonomy.triggerStatuses?.find(s => s.name === 'Em andamento')?.id || trigger.status;
        updateTrigger({ ...trigger, rca_id: newRca.id!, status: inProgressStatusId });
    };

    return (
        <div className="flex h-screen bg-page-gradient font-sans text-slate-900">
            <Sidebar view={view} setView={setView} />

            {/* Main Content */}
            <main className="flex-1 overflow-hidden relative flex flex-col w-full">
                {/* Suspense: Fallback exibido enquanto o componente lazy é carregado */}
                <Suspense fallback={
                    <div className="flex-1 flex items-center justify-center bg-slate-50/50" data-testid="app-suspense-loading">
                        <div className="flex flex-col items-center gap-3 text-slate-400">
                            <Loader2 className="animate-spin" size={32} />
                            <span className="text-sm font-medium">{t('common.loading')}</span>
                        </div>
                    </div>
                }>
                    {isEditorOpen ? (
                        <div className="absolute inset-0 bg-slate-50 p-0 z-20 overflow-hidden flex flex-col">
                            <div className="flex-1 p-6 overflow-hidden">
                                <RcaEditor
                                    existingRecord={editingRecord}
                                    onClose={handleCloseEditor}
                                    onSave={handleCloseEditor}
                                />
                            </div>
                        </div>
                    ) : (
                        // We use key={view} and animate-in class to trigger animation on view switch
                        // CSS classes 'animate-in fade-in slide-in-from-bottom-2 duration-300' create the effect
                        // Animation disabled in tests to avoid pointer interception issues
                        <div key={view} className={`flex-1 overflow-auto bg-slate-50/50 ${(window as any).isPlaywright ? '' : 'animate-in fade-in slide-in-from-bottom-2 duration-300'}`}>
                            {view === 'DASHBOARD' && (
                                <Dashboard />
                            )}
                            {view === 'TRIGGERS' && (
                                <TriggersView onCreateRca={handleCreateRcaFromTrigger} onOpenRca={handleOpenRca} />
                            )}
                            {view === 'ANALYSES' && (
                                <AnalysesView onNew={openNew} onEdit={openEdit} />
                            )}
                            {view === 'ACTIONS' && (
                                <ActionsView onOpenRca={handleOpenRca} />
                            )}
                            {view === 'ASSETS' && (
                                <AssetsManager />
                            )}
                            {view === 'SETTINGS' && (
                                <SettingsView />
                            )}
                            {view === 'MIGRATION' && (
                                <MigrationView />
                            )}
                        </div>
                    )}
                </Suspense>
            </main>
        </div>
    );
};

export default function App() {
    return (
        <LanguageProvider>
            <FilterProvider>
                <RcaProvider>
                    <AppContent />
                </RcaProvider>
            </FilterProvider>
        </LanguageProvider>
    );
}
