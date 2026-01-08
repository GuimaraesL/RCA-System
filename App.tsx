
import React, { useState } from 'react';
import { LayoutDashboard, Database, Settings, Upload, AlertTriangle, List, CheckSquare, Book, Siren } from 'lucide-react';
import { RcaRecord, TriggerRecord } from './types';
import { RcaEditor } from './components/RcaEditor';
import { AssetsManager } from './components/AssetsManager';
import { Dashboard } from './components/Dashboard';
import { AnalysesView } from './components/AnalysesView';
import { ActionsView } from './components/ActionsView';
import { TriggersView } from './components/TriggersView';
import { SettingsView } from './components/SettingsView';
import { MigrationView } from './components/MigrationView';
import { DocumentationView } from './components/DocumentationView';
import { RcaProvider, useRcaContext } from './context/RcaContext';
import { generateId } from './services/storageService';

const AppContent: React.FC = () => {
    const [view, setView] = useState<'DASHBOARD' | 'ANALYSES' | 'ACTIONS' | 'TRIGGERS' | 'ASSETS' | 'SETTINGS' | 'MIGRATION' | 'DOCS'>('DASHBOARD');
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<RcaRecord | null>(null);

    const { refreshAll, records, updateTrigger, taxonomy } = useRcaContext();

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

    // Create RCA from Trigger
    const handleCreateRcaFromTrigger = (trigger: TriggerRecord) => {
        // 1. Construct partial RCA from Trigger Data
        const newRca: Partial<RcaRecord> = {
            id: generateId('RCA'),
            failure_date: trigger.start_date.split('T')[0],
            failure_time: trigger.start_date.split('T')[1]?.substring(0, 5) || '00:00',
            downtime_minutes: trigger.duration_minutes,
            area_id: trigger.area_id,
            equipment_id: trigger.equipment_id,
            subgroup_id: trigger.subgroup_id,
            analysis_type: trigger.analysis_type_id,
            what: `Falha: ${trigger.stop_reason}`,
            problem_description: `${trigger.stop_type} - ${trigger.stop_reason}. ${trigger.comments || ''}`,
            facilitator: trigger.responsible,

            // Link back to trigger for traceability (stored in historical info or standard field if we added one)
            additionalInfo: {
                historicalInfo: `Generated from Trigger ID: ${trigger.id}`
            }
        };

        // 2. Open Editor
        setEditingRecord(newRca as RcaRecord); // Cast as RcaRecord, hook will fill defaults
        setIsEditorOpen(true);

        // 3. Update Trigger with the new RCA ID immediately (or we could do this on save, but this is simpler for flow)
        // Note: We are optimistically linking them. If user cancels RCA creation, we might have a dead link.
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
                        <LayoutDashboard size={20} /> Dashboard
                    </button>
                    <button
                        onClick={() => setView('TRIGGERS')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${view === 'TRIGGERS' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800'}`}
                    >
                        <Siren size={20} /> Triggers
                    </button>
                    <button
                        onClick={() => setView('ANALYSES')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${view === 'ANALYSES' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800'}`}
                    >
                        <List size={20} /> Analyses
                    </button>
                    <button
                        onClick={() => setView('ACTIONS')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${view === 'ACTIONS' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800'}`}
                    >
                        <CheckSquare size={20} /> Action Plans
                    </button>
                    <button
                        onClick={() => setView('ASSETS')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${view === 'ASSETS' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800'}`}
                    >
                        <Database size={20} /> Assets
                    </button>

                    <div className="pt-4 mt-4 border-t border-slate-800">
                        <button
                            onClick={() => setView('DOCS')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${view === 'DOCS' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800'}`}
                        >
                            <Book size={20} /> Documentation
                        </button>
                        <button
                            onClick={() => setView('SETTINGS')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${view === 'SETTINGS' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800'}`}
                        >
                            <Settings size={20} /> Settings
                        </button>
                        <button
                            onClick={() => setView('MIGRATION')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${view === 'MIGRATION' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800'}`}
                        >
                            <Upload size={20} /> Migration
                        </button>
                    </div>
                </nav>
                <div className="p-6 border-t border-slate-800 text-xs text-slate-500">
                    v17.2 Context API<br />
                    Running on React 18
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
                    <div className="flex-1 overflow-auto bg-slate-50/50">
                        {view === 'DASHBOARD' && (
                            <Dashboard />
                        )}
                        {view === 'TRIGGERS' && (
                            <TriggersView onCreateRca={handleCreateRcaFromTrigger} />
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
                        {view === 'DOCS' && (
                            <DocumentationView />
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default function App() {
    return (
        <RcaProvider>
            <AppContent />
        </RcaProvider>
    );
}
