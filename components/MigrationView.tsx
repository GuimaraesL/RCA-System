import React, { useState } from 'react';
import { Upload, Download } from 'lucide-react';
import { importData, exportData } from '../services/storageService';

export const MigrationView: React.FC = () => {
    const [msg, setMsg] = useState('');

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const content = evt.target?.result as string;
            const res = importData(content);
            setMsg(res.message);
            if(res.success) setTimeout(() => window.location.reload(), 1500);
        };
        reader.readAsText(file);
    };

    const handleDownload = () => {
        const json = exportData();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rca_migration_v17_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
             <h1 className="text-3xl font-bold text-slate-900 mb-8">Data Migration (V17.0 Schema)</h1>
             <div className="grid grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
                        <Upload size={32} />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Import Legacy Data</h3>
                    <p className="text-slate-500 text-sm mb-6">Upload JSON file compliant with V17.0 Schema.</p>
                    <div className="relative">
                        <input type="file" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".json" />
                        <button className="w-full bg-white border border-slate-300 text-slate-700 font-medium py-2 rounded-lg hover:bg-slate-50 transition-colors">Select File</button>
                    </div>
                    {msg && <p className="mt-4 text-sm text-green-600 font-medium">{msg}</p>}
                </div>

                <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
                    <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
                        <Download size={32} />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Export Database</h3>
                    <p className="text-slate-500 text-sm mb-6">Download full system state for backup.</p>
                    <button onClick={handleDownload} className="w-full bg-indigo-600 text-white font-medium py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                        Download JSON
                    </button>
                </div>
             </div>
        </div>
    );
};