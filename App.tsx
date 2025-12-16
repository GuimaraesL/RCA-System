
import React, { useState } from 'react';
import { LayoutDashboard, Database, Settings, Upload, AlertTriangle, List, CheckSquare, Book } from 'lucide-react';
import { RcaRecord } from './types';
import { RcaEditor } from './components/RcaEditor';
import { AssetsManager } from './components/AssetsManager';
import { Dashboard } from './components/Dashboard';
import { AnalysesView } from './components/AnalysesView';
import { ActionsView } from './components/ActionsView';
import { SettingsView } from './components/SettingsView';
import { MigrationView } from './components/MigrationView';
import { DocumentationView } from './components/DocumentationView';
import { RcaProvider, useRcaContext } from './context/RcaContext';

const AppContent: React.FC = () => {
  const [view, setView] = useState<'DASHBOARD' | 'ANALYSES' | 'ACTIONS' | 'ASSETS' | 'SETTINGS' | 'MIGRATION' | 'DOCS'>('DASHBOARD');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RcaRecord | null>(null);
  
  const { refreshAll, records } = useRcaContext();

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
            v17.2 Context API<br/>
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
