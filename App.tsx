
import React, { useState } from 'react';
import { LayoutDashboard, Database, Settings, Upload, AlertTriangle, List, CheckSquare, Siren } from 'lucide-react';
import { RcaRecord, TriggerRecord } from './types';
import { RcaEditor } from './components/RcaEditor';
import { AssetsManager } from './components/AssetsManager';
import { Dashboard } from './components/Dashboard';
import { AnalysesView } from './components/AnalysesView';
import { ActionsView } from './components/ActionsView';
import { TriggersView } from './components/TriggersView';
import { SettingsView } from './components/SettingsView';
import { MigrationView } from './components/MigrationView';

import { RcaProvider, useRcaContext } from './context/RcaContext';
import { LanguageProvider } from './context/LanguageContext';
import { useLanguage } from './context/LanguageDefinition';
import { LanguageSelector } from './components/LanguageSelector'; // i18n
import { generateId } from './services/utils';

const AppContent: React.FC = () => {
    const { t } = useLanguage();
    const [view, setView] = useState<'DASHBOARD' | 'ANALYSES' | 'ACTIONS' | 'TRIGGERS' | 'ASSETS' | 'SETTINGS' | 'MIGRATION' | 'DOCS'>('DASHBOARD');
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

    const openEdit = (rec: RcaRecord) => {
        setEditingRecord(rec);
        setIsEditorOpen(true);
    };

    const handleOpenRca = (rcaId: string) => {
        const record = records.find(r => r.id === rcaId);
        if (record) {
            setEditingRecord(record);
            setIsEditorOpen(true);
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
            what: `Falha: ${trigger.stop_reason}`,
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
        <div className="flex h-screen bg-slate-50">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 transition-all">
                <div className="p-6 border-b border-slate-800">
                    <div className="flex items-center gap-2 text-white font-bold text-lg">
                        <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center shadow-lg shadow-blue-900/50">
                            <AlertTriangle size={18} className="text-white" />
                        </div>
                        Global RCA
                    </div>
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    <button
                        onClick={() => setView('DASHBOARD')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${view === 'DASHBOARD' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800'}`}
                    >
                        <LayoutDashboard size={20} /> {t('sidebar.dashboard')}
                    </button>
                    <button
                        onClick={() => setView('TRIGGERS')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${view === 'TRIGGERS' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800'}`}
                    >
                        <Siren size={20} /> {t('sidebar.triggers')}
                    </button>
                    <button
                        onClick={() => setView('ANALYSES')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${view === 'ANALYSES' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800'}`}
                    >
                        <List size={20} /> {t('sidebar.analyses')}
                    </button>
                    <button
                        onClick={() => setView('ACTIONS')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${view === 'ACTIONS' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800'}`}
                    >
                        <CheckSquare size={20} /> {t('sidebar.actions')}
                    </button>
                    <button
                        onClick={() => setView('ASSETS')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${view === 'ASSETS' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800'}`}
                    >
                        <Database size={20} /> {t('sidebar.assets')}
                    </button>

                    <div className="pt-4 mt-4 border-t border-slate-800">

                        <button
                            onClick={() => setView('SETTINGS')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${view === 'SETTINGS' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800'}`}
                        >
                            <Settings size={20} /> {t('sidebar.settings')}
                        </button>
                        <button
                            onClick={() => setView('MIGRATION')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${view === 'MIGRATION' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800'}`}
                        >
                            <Upload size={20} /> {t('sidebar.migration')}
                        </button>
                    </div>
                </nav>
                <div className="p-6 border-t border-slate-800 text-xs text-slate-500">
                    v17.2 Context API<br />
                    Running on React 18
                    <div className="mt-4 pt-4 border-t border-slate-800">
                        <LanguageSelector />
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-hidden relative flex flex-col">
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
                    <div key={view} className="flex-1 overflow-auto bg-slate-50/50 animate-in fade-in slide-in-from-bottom-2 duration-300">
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
            </main>
        </div>
    );
};

export default function App() {
    return (
        <LanguageProvider>
            <RcaProvider>
                <AppContent />
            </RcaProvider>
        </LanguageProvider>
    );
}
