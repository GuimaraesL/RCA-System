
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, FileText, Database, Settings, Upload, AlertTriangle, List, CheckSquare } from 'lucide-react';
import { RcaRecord } from './types';
import { getRecords } from './services/storageService';
import { RcaEditor } from './components/RcaEditor';
import { AssetsManager } from './components/AssetsManager';
import { Dashboard } from './components/Dashboard';
import { AnalysesView } from './components/AnalysesView';
import { ActionsView } from './components/ActionsView';
import { SettingsView } from './components/SettingsView';
import { MigrationView } from './components/MigrationView';

export default function App() {
  const [view, setView] = useState<'DASHBOARD' | 'ANALYSES' | 'ACTIONS' | 'ASSETS' | 'SETTINGS' | 'MIGRATION'>('DASHBOARD');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RcaRecord | null>(null);
  const [records, setRecords] = useState<RcaRecord[]>([]);

  useEffect(() => {
    setRecords(getRecords());
  }, []);

  const refreshData = () => {
    setRecords(getRecords());
    setIsEditorOpen(false);
    setEditingRecord(null);
  };

  const openNew = () => {
    setEditingRecord(null);
    setIsEditorOpen(true);
  };

  const openEdit = (rec: RcaRecord) => {
    setEditingRecord(rec);
    setIsEditorOpen(true);
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
        </nav>
        <div className="p-6 border-t border-slate-800 text-xs text-slate-500">
            v17.1 Integrated<br/>
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
                    onClose={() => setIsEditorOpen(false)} 
                    onSave={refreshData}
                />
               </div>
            </div>
        ) : (
            <div className="flex-1 overflow-auto bg-slate-50/50">
                {view === 'DASHBOARD' && (
                    <Dashboard records={records} />
                )}
                {view === 'ANALYSES' && (
                    <AnalysesView records={records} onNew={openNew} onEdit={openEdit} />
                )}
                {view === 'ACTIONS' && (
                    <ActionsView />
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
}
