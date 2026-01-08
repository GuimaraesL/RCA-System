
import React, { useState, useRef } from 'react';
import { Upload, Download, FileSpreadsheet, Database, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { importData, exportData } from '../services/storageService';
import { importDataToApi } from '../services/apiService';
import { MigrationData } from '../types';
import { CsvEntityType, getCsvTemplate, exportToCsv as exportToCsvService, importFromCsv } from '../services/csvService';
import { useRcaContext } from '../context/RcaContext';

export const MigrationView: React.FC = () => {
    const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [activeTab, setActiveTab] = useState<'JSON' | 'CSV'>('JSON');
    const [csvType, setCsvType] = useState<CsvEntityType>('ASSETS');

    // Refs to clear file inputs
    const jsonInputRef = useRef<HTMLInputElement>(null);
    const csvInputRef = useRef<HTMLInputElement>(null);

    // Access Context to refresh data without page reload
    const { refreshAll, useApi } = useRcaContext();

    // Helper to handle encoding (UTF-8 vs Windows-1252 for Excel)
    const readFileWithEncoding = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const content = e.target?.result as string;

                // Check for Unicode Replacement Character  (U+FFFD)
                // This usually appears when UTF-8 decoder encounters invalid bytes (like ANSI accents)
                if (content.includes('\uFFFD')) {
                    console.log("Detected encoding issues (), retrying with windows-1252...");
                    const retryReader = new FileReader();
                    retryReader.onload = (evt) => resolve(evt.target?.result as string);
                    retryReader.onerror = () => reject(retryReader.error);
                    retryReader.readAsText(file, 'windows-1252');
                } else {
                    resolve(content);
                }
            };

            reader.onerror = () => reject(reader.error);
            reader.readAsText(file); // Default tries UTF-8
        });
    };

    const handleJsonUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setMsg({ type: 'success', text: 'Reading JSON...' });

        try {
            const content = await readFileWithEncoding(file);
            const data: MigrationData = JSON.parse(content);

            let res: { success: boolean, message: string };

            if (useApi) {
                // Usar API para persistir no banco
                console.log('🔄 Importando via API...');
                res = await importDataToApi(data);
            } else {
                // Fallback para localStorage
                res = importData(content);
            }

            setMsg({
                type: res.success ? 'success' : 'error',
                text: res.message
            });
            if (res.success) {
                await refreshAll();
            }
        } catch (error) {
            setMsg({ type: 'error', text: 'Failed to read file.' });
            console.error(error);
        } finally {
            if (jsonInputRef.current) jsonInputRef.current.value = '';
        }
    };

    const handleJsonDownload = () => {
        const json = exportData();
        downloadFile(json, `rca_backup_v17_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
    };

    // --- CSV Handlers ---
    const handleDownloadTemplate = () => {
        const csv = getCsvTemplate(csvType);
        downloadFile(csv, `${csvType.toLowerCase()}_template.csv`, 'text/csv;charset=utf-8;');
    };

    const handleCsvExport = () => {
        const csv = exportToCsvService(csvType);
        downloadFile(csv, `${csvType.toLowerCase()}_export.csv`, 'text/csv;charset=utf-8;');
    };

    const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setMsg({ type: 'success', text: 'Processing CSV...' });

        try {
            const content = await readFileWithEncoding(file);
            const res = importFromCsv(csvType, content);

            setMsg({
                type: res.success ? 'success' : 'error',
                text: res.message
            });

            if (res.success) {
                refreshAll();
            }
        } catch (error) {
            setMsg({ type: 'error', text: 'Failed to read file.' });
            console.error(error);
        } finally {
            // Clear input value to allow re-uploading the same file if needed (e.g. after fixing errors)
            if (csvInputRef.current) csvInputRef.current.value = '';
        }
    };

    const downloadFile = (content: string, filename: string, type: string) => {
        // Add BOM for Excel compatibility with UTF-8 CSVs
        const prefix = type.includes('csv') ? '\uFEFF' : '';
        const blob = new Blob([prefix + content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
    };

    const entityOptions: { value: CsvEntityType, label: string }[] = [
        { value: 'TRIGGERS', label: 'Triggers (Análise de Gatilhos)' },
        { value: 'ASSETS', label: 'Assets Hierarchy' },
        { value: 'ACTIONS', label: 'Action Plans' },
        { value: 'RECORDS_SUMMARY', label: 'RCA Records (Summary)' },
        { value: 'TAXONOMY_ANALYSIS_TYPES', label: 'Analysis Types' },
        { value: 'TAXONOMY_STATUSES', label: 'Analysis Statuses' },
        { value: 'TAXONOMY_SPECIALTIES', label: 'Specialties' },
        { value: 'TAXONOMY_FAILURE_MODES', label: 'Failure Modes' },
        { value: 'TAXONOMY_FAILURE_CATEGORIES', label: 'Failure Categories' },
        { value: 'TAXONOMY_COMPONENT_TYPES', label: 'Component Types' },
        { value: 'TAXONOMY_ROOT_CAUSE_MS', label: 'Root Cause 6M' },
    ];

    return (
        <div className="p-8 max-w-5xl mx-auto animate-in fade-in">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Data Migration</h1>
            <p className="text-slate-500 mb-8">Import, export, and manage system data via JSON or CSV.</p>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 mb-8">
                <button
                    onClick={() => { setActiveTab('JSON'); setMsg(null); }}
                    className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'JSON' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Full System Backup (JSON)
                </button>
                <button
                    onClick={() => { setActiveTab('CSV'); setMsg(null); }}
                    className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'CSV' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    CSV Tools (Bulk Edit)
                </button>
            </div>

            {/* Alert Message */}
            {msg && (
                <div className={`mb-6 p-4 border rounded-lg flex items-center gap-3 ${msg.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    {msg.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                    <span className="font-medium">{msg.text}</span>
                </div>
            )}

            {activeTab === 'JSON' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center hover:border-blue-300 transition-colors">
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
                            <Upload size={32} />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Restore Backup</h3>
                        <p className="text-slate-500 text-sm mb-6">Upload full JSON snapshot (V17.0 Schema).</p>
                        <div className="relative">
                            <input
                                type="file"
                                ref={jsonInputRef}
                                onChange={handleJsonUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                accept=".json"
                            />
                            <button className="w-full bg-white border border-slate-300 text-slate-700 font-medium py-2 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">Select File</button>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center hover:border-blue-300 transition-colors">
                        <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
                            <Download size={32} />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Create Backup</h3>
                        <p className="text-slate-500 text-sm mb-6">Download complete system state.</p>
                        <button onClick={handleJsonDownload} className="w-full bg-indigo-600 text-white font-medium py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
                            Download JSON
                        </button>
                    </div>
                </div>
            ) : (
                <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-start gap-4 mb-8">
                        <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                            <FileSpreadsheet size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">CSV Bulk Operations</h3>
                            <p className="text-slate-500 text-sm">Select an entity type to download templates, export current data, or bulk import.</p>
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Target Entity</label>
                        <select
                            className="w-full md:w-1/2 p-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                            value={csvType}
                            onChange={e => { setCsvType(e.target.value as CsvEntityType); setMsg(null); }}
                        >
                            {entityOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 pt-6">
                        <button
                            onClick={handleDownloadTemplate}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
                        >
                            <FileSpreadsheet size={18} /> Download Template
                        </button>

                        <button
                            onClick={handleCsvExport}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-medium transition-colors"
                        >
                            <Database size={18} /> Export Current Data
                        </button>

                        <div className="relative">
                            <input
                                type="file"
                                ref={csvInputRef}
                                onChange={handleCsvImport}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                accept=".csv"
                            />
                            <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm">
                                <Upload size={18} /> Import CSV
                            </button>
                        </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-4 text-center">
                        Note: Excel files may use semicolons (;) or commas (,) depending on your region. The system auto-detects this.
                    </p>
                </div>
            )}
        </div>
    );
};
