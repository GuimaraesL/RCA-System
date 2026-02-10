/**
 * Proposta: Vista de Migração e Gestão de Backup (JSON/CSV) com UI Premium Redesenhada.
 * Fluxo: Orquestra a importação e exportação de dados com uma interface de alta fidelidade, separando claramente as ferramentas de backup integral (JSON) das ferramentas de edição em massa (CSV).
 */

import React, { useState, useRef, useMemo } from 'react';
import { 
  Upload, Download, FileSpreadsheet, Database, 
  RefreshCw, CheckCircle, AlertTriangle, FileJson, 
  Layers, Activity, ClipboardList, ChevronRight,
  Info, ShieldCheck, Box, Settings, X, Check,
  FileDown, FileUp, TableProperties
} from 'lucide-react';
import { importData, saveAssets, saveActions, saveRecords, saveTriggers, saveTaxonomy } from '../services/storageService';
import { fetchAllRecordsFull, importDataToApi, importRecordsToApi, importActionsToApi, importTriggersToApi, importAssetsToApi, importTaxonomyToApi } from '../services/apiService';
import { MigrationData, TaxonomyConfig } from '../types';
import { CsvEntityType, getCsvTemplate, exportToCsv as exportToCsvService, importFromCsv } from '../services/csvService';
import { useRcaContext } from '../context/RcaContext';
import { useLanguage } from '../context/LanguageDefinition'; 

export const MigrationView: React.FC = () => {
    const { t } = useLanguage();
    const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [activeTab, setActiveTab] = useState<'JSON' | 'CSV'>('JSON');
    const [csvType, setCsvType] = useState<CsvEntityType>('ASSETS');

    // Estado da configuração de importação
    const [importMode, setImportMode] = useState<'APPEND' | 'UPDATE' | 'REPLACE'>('APPEND');
    const [inheritHierarchy, setInheritHierarchy] = useState<boolean>(false);

    // Estado de pré-visualização (JSON)
    const [previewData, setPreviewData] = useState<MigrationData | null>(null);
    const [taxonomySelection, setTaxonomySelection] = useState<Record<string, boolean>>({
        analysisTypes: true,
        analysisStatuses: true,
        specialties: true,
        failureModes: true,
        failureCategories: true,
        componentTypes: true,
        rootCauseMs: true,
        triggerStatuses: true
    });

    // Referências para limpeza de inputs de arquivo
    const jsonInputRef = useRef<HTMLInputElement>(null);
    const csvInputRef = useRef<HTMLInputElement>(null);

    // Acesso ao contexto global
    const { refreshAll, useApi, records, assets, actions, triggers, taxonomy } = useRcaContext();

    const entityOptions = useMemo(() => [
        { value: 'ASSETS' as CsvEntityType, label: t('migration.entities.assets'), icon: Layers },
        { value: 'ACTIONS' as CsvEntityType, label: t('migration.entities.actions'), icon: CheckCircle },
        { value: 'TRIGGERS' as CsvEntityType, label: t('migration.entities.triggers'), icon: Activity },
        { value: 'RECORDS_SUMMARY' as CsvEntityType, label: t('migration.entities.recordsSummary'), icon: ClipboardList },
        { value: 'TAXONOMY_ANALYSIS_TYPES' as CsvEntityType, label: t('migration.entities.taxonomyAnalysisTypes'), icon: Settings },
        { value: 'TAXONOMY_STATUSES' as CsvEntityType, label: t('migration.entities.taxonomyStatuses'), icon: ShieldCheck },
        { value: 'TAXONOMY_SPECIALTIES' as CsvEntityType, label: t('migration.entities.taxonomySpecialties'), icon: TableProperties },
        { value: 'TAXONOMY_FAILURE_MODES' as CsvEntityType, label: t('migration.entities.taxonomyFailureModes'), icon: AlertTriangle },
        { value: 'TAXONOMY_FAILURE_CATEGORIES' as CsvEntityType, label: t('migration.entities.taxonomyFailureCategories'), icon: Box },
        { value: 'TAXONOMY_COMPONENT_TYPES' as CsvEntityType, label: t('migration.entities.taxonomyComponentTypes'), icon: Layers },
        { value: 'TAXONOMY_ROOT_CAUSE_MS' as CsvEntityType, label: t('migration.entities.taxonomyRootCauseMs'), icon: TableProperties },
        { value: 'TAXONOMY_TRIGGER_STATUSES' as CsvEntityType, label: t('migration.entities.taxonomyTriggerStatuses'), icon: RefreshCw },
    ], [t]);

    // ... (manter funções auxiliares readFileWithEncoding, downloadFile, handlers JSON/CSV)
    
    /**
     * Lê um arquivo tratando problemas de codificação comuns no Excel/Windows.
     */
    const readFileWithEncoding = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const content = e.target?.result as string;
                if (content.includes('\uFFFD')) { 
                    const retryReader = new FileReader();
                    retryReader.onload = (evt) => resolve(evt.target?.result as string);
                    retryReader.onerror = () => reject(retryReader.error);
                    retryReader.readAsText(file, 'windows-1252');
                } else {
                    resolve(content);
                }
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
        });
    };

    const downloadFile = (content: string, fileName: string, contentType: string) => {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleJsonFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setMsg({ type: 'success', text: 'Analisando integridade do JSON...' });
        setPreviewData(null);
        try {
            const content = await readFileWithEncoding(file);
            const data: MigrationData = JSON.parse(content);
            setPreviewData(data);
            setMsg(null);
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            setMsg({ type: 'error', text: `Erro ao processar arquivo: ${errorMsg}` });
        }
    };

    const executeImport = async () => {
        if (!previewData) return;
        setMsg({ type: 'success', text: 'Executando importação...' });
        try {
            const selectedTaxonomies = Object.entries(taxonomySelection)
                .filter(([_, selected]) => selected).map(([key]) => key);
            let res = useApi ? await importDataToApi(previewData, importMode, selectedTaxonomies) : importData(JSON.stringify(previewData));
            setMsg({ type: res.success ? 'success' : 'error', text: res.message });
            if (res.success) {
                await refreshAll();
                setPreviewData(null);
                if (jsonInputRef.current) jsonInputRef.current.value = '';
            }
        } catch (error) {
            setMsg({ type: 'error', text: 'Falha na importação.' });
        }
    };

    const handleJsonDownload = async () => {
        setMsg({ type: 'success', text: 'Preparando carga total de dados...' });
        try {
            const fullRecords = useApi ? await fetchAllRecordsFull() : records;
            const exportObj: MigrationData = {
                metadata: { systemVersion: '17.0', exportDate: new Date().toISOString(), recordCount: fullRecords.length, description: 'Backup Integral do Sistema' },
                assets, records: fullRecords, actions, triggers, taxonomy
            };
            downloadFile(JSON.stringify(exportObj, null, 2), `rca_backup_v17_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
            setMsg({ type: 'success', text: 'Backup gerado e baixado com sucesso.' });
        } catch (error) {
            setMsg({ type: 'error', text: 'Falha ao gerar backup.' });
        }
    };

    const handleDownloadTemplate = () => {
        const template = getCsvTemplate(csvType);
        downloadFile('\uFEFF' + template, `template_${csvType.toLowerCase()}.csv`, 'text/csv;charset=utf-8;');
    };

    const handleCsvExport = async () => {
        setMsg({ type: 'success', text: 'Preparando exportação CSV...' });
        try {
            const exportRecords = (useApi && csvType === 'RECORDS_SUMMARY') ? await fetchAllRecordsFull() : records;
            const data = exportToCsvService(csvType, { assets, actions, triggers, records: exportRecords, taxonomy });
            downloadFile('\uFEFF' + data, `export_${csvType.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
            setMsg({ type: 'success', text: 'Exportação concluída.' });
        } catch (error) {
            setMsg({ type: 'error', text: 'Falha na exportação.' });
        }
    };

    const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setMsg({ type: 'success', text: 'Processando arquivo CSV...' });
        try {
            const content = await readFileWithEncoding(file);
            const safeMode = importMode === 'REPLACE' ? 'APPEND' : importMode;
            const res = importFromCsv(csvType, content, { assets, actions, triggers, records, taxonomy }, { mode: safeMode, inheritHierarchy });
            if (res.success && res.data) {
                if (useApi) {
                    switch (res.dataType) {
                        case 'ASSETS': await importAssetsToApi(res.data); break;
                        case 'ACTIONS': await importActionsToApi(res.data); break;
                        case 'TRIGGERS': await importTriggersToApi(res.data); break;
                        case 'RECORDS_SUMMARY': await importRecordsToApi(res.data); break;
                        default: if (res.dataType?.startsWith('TAXONOMY_')) await importTaxonomyToApi(res.data); break;
                    }
                } else {
                    switch (res.dataType) {
                        case 'ASSETS': saveAssets(res.data); break;
                        case 'ACTIONS': saveActions(res.data); break;
                        case 'TRIGGERS': saveTriggers(res.data); break;
                        case 'RECORDS_SUMMARY': saveRecords(res.data); break;
                        default: if (res.dataType?.startsWith('TAXONOMY_')) saveTaxonomy(res.data); break;
                    }
                }
                setMsg({ type: 'success', text: res.message });
                await refreshAll();
            } else setMsg({ type: 'error', text: res.message });
        } catch (error) {
            setMsg({ type: 'error', text: `Falha ao processar CSV: ${error instanceof Error ? error.message : String(error)}` });
        } finally { if (csvInputRef.current) csvInputRef.current.value = ''; }
    };

    const toggleTaxonomy = (key: string) => setTaxonomySelection(prev => ({ ...prev, [key]: !prev[key] }));

    return (
        <div className="h-full flex flex-col bg-page-gradient overflow-hidden">
            {/* Header com Seletor de Abas Redesenhado */}
            <div className="px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200/60 bg-white/50 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-indigo-600 shadow-lg shadow-indigo-600/20 rounded-xl text-white">
                        <Database size={22} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 font-display tracking-tight leading-tight">{t('migration.title')}</h1>
                        <p className="text-xs text-slate-500 font-medium">{t('migration.description')}</p>
                    </div>
                </div>

                <div className="inline-flex p-1.5 bg-slate-200/50 rounded-2xl border border-slate-200/60 backdrop-blur-sm self-start md:self-auto">
                    {[
                        { id: 'JSON', label: t('migration.backup'), icon: FileJson },
                        { id: 'CSV', label: t('migration.csvTools'), icon: FileSpreadsheet }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id as any); setMsg(null); }}
                            className={`flex items-center gap-2.5 px-6 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${
                                activeTab === tab.id 
                                    ? 'bg-white text-indigo-600 shadow-md ring-1 ring-black/5' 
                                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                            }`}
                        >
                            <tab.icon size={16} className={activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400'} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <main className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-8 max-w-[1600px] mx-auto animate-in fade-in pb-32">
                    
                    {/* Mensagens de Feedback */}
                    {msg && (
                        <div className={`mb-8 p-4 rounded-2xl border flex items-center gap-3 animate-in slide-in-from-top-2 ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm' : 'bg-red-50 text-red-700 border-red-100 shadow-sm'}`}>
                            {msg.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                            <span className="text-sm font-bold">{msg.text}</span>
                            <button onClick={() => setMsg(null)} className="ml-auto p-1 hover:bg-black/5 rounded-lg"><X size={16} /></button>
                        </div>
                    )}

                    {activeTab === 'JSON' ? (
                        <div className="space-y-10">
                            {!previewData && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-soft text-center group hover:border-indigo-200 transition-all relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Upload size={120} /></div>
                                        <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-600 group-hover:scale-110 group-hover:rotate-3 transition-all"><FileJson size={40} /></div>
                                        <h3 className="text-2xl font-bold mb-2 text-slate-800 tracking-tight">{t('migration.restore')}</h3>
                                        <p className="text-sm text-slate-500 mb-8 max-w-xs mx-auto leading-relaxed">{t('migration.json.dragDrop')}</p>
                                        <div className="relative inline-block">
                                            <input type="file" ref={jsonInputRef} onChange={handleJsonFileSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" accept=".json" />
                                            <button className="bg-indigo-600 text-white font-bold py-3.5 px-10 rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all pointer-events-none active:scale-95">{t('migration.json.selectButton')}</button>
                                        </div>
                                    </div>
                                    <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-soft text-center group hover:border-cyan-200 transition-all relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Download size={120} /></div>
                                        <div className="w-20 h-20 bg-cyan-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-cyan-600 group-hover:scale-110 group-hover:-rotate-3 transition-all"><Database size={40} /></div>
                                        <h3 className="text-2xl font-bold mb-2 text-slate-800 tracking-tight">{t('migration.json.createBackup')}</h3>
                                        <p className="text-sm text-slate-500 mb-8 max-w-xs mx-auto leading-relaxed">Crie um arquivo completo contendo Ativos, RCAs, Ações e Taxonomia para segurança.</p>
                                        <button onClick={handleJsonDownload} className="bg-cyan-600 text-white font-bold py-3.5 px-10 rounded-xl shadow-lg shadow-cyan-600/20 hover:bg-cyan-700 transition-all active:scale-95">{t('migration.json.downloadButton')}</button>
                                    </div>
                                </div>
                            )}

                            {previewData && (
                                <div className="animate-in fade-in slide-in-from-bottom-6 duration-500">
                                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
                                        <div className="bg-slate-50/50 p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                            <div className="flex items-center gap-5">
                                                <div className="p-4 bg-white rounded-2xl shadow-sm text-indigo-600"><ClipboardList size={32} /></div>
                                                <div>
                                                    <h3 className="text-xl font-bold text-slate-800">{t('migration.importConfig')}</h3>
                                                    <p className="text-sm text-slate-500 font-medium">Schema: <span className="text-indigo-600 font-bold">{previewData.metadata?.systemVersion || '17.0'}</span> • {new Date(previewData.metadata?.exportDate).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <button onClick={() => { setPreviewData(null); if (jsonInputRef.current) jsonInputRef.current.value = ''; }} className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors flex items-center gap-2"><X size={16} /> {t('migration.json.changeFile')}</button>
                                        </div>
                                        <div className="p-10 space-y-12">
                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                                {[
                                                    { label: 'Análises RCA', count: previewData.records?.length || 0, icon: Activity, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                                                    { label: 'Planos de Ação', count: previewData.actions?.length || 0, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                                                    { label: 'Eventos Gatilho', count: previewData.triggers?.length || 0, icon: Activity, color: 'text-amber-600', bg: 'bg-amber-50' },
                                                    { label: 'Nós de Ativos', count: previewData.assets?.length || 0, icon: Layers, color: 'text-cyan-600', bg: 'bg-cyan-50' },
                                                ].map((item, i) => (
                                                    <div key={i} className="p-6 rounded-2xl bg-slate-50/50 border border-slate-100 flex flex-col gap-1 transition-all hover:bg-white hover:shadow-md hover:border-slate-200">
                                                        <div className={`w-10 h-10 ${item.bg} ${item.color} rounded-xl flex items-center justify-center mb-2`}><item.icon size={20} /></div>
                                                        <span className="text-2xl font-black text-slate-800">{item.count}</span>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                                                <div className="lg:col-span-5 space-y-6">
                                                    <div className="flex items-center gap-2 mb-4"><Settings size={18} className="text-slate-400" /><h4 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">{t('migration.json.modeTitle')}</h4></div>
                                                    <div className="flex flex-col gap-4">
                                                        {[
                                                            { id: 'APPEND', label: t('migration.modes.append'), desc: t('migration.json.modeDescriptions.append'), color: 'blue' },
                                                            { id: 'UPDATE', label: t('migration.modes.update'), desc: t('migration.json.modeDescriptions.update'), color: 'indigo' },
                                                            { id: 'REPLACE', label: t('migration.modes.replace'), desc: t('migration.json.modeDescriptions.replace'), color: 'red', warning: true },
                                                        ].map((mode) => (
                                                            <button key={mode.id} onClick={() => setImportMode(mode.id as any)} className={`p-5 rounded-2xl border-2 text-left transition-all duration-300 group ${importMode === mode.id ? `bg-${mode.color}-50 border-${mode.color}-500 shadow-md ring-4 ring-${mode.color}-500/10` : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <span className={`font-bold text-sm ${importMode === mode.id ? `text-${mode.color}-700` : 'text-slate-700'}`}>{mode.label}</span>
                                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${importMode === mode.id ? `bg-${mode.color}-600 border-${mode.color}-600` : 'border-slate-200'}`}>{importMode === mode.id && <Check size={12} className="text-white" strokeWidth={4} />}</div>
                                                                </div>
                                                                <p className={`text-[11px] leading-relaxed ${importMode === mode.id ? `text-${mode.color}-600/80` : 'text-slate-400'}`}>{mode.warning && '⚠️ '}{mode.desc}</p>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="lg:col-span-7 space-y-6">
                                                    <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2"><ShieldCheck size={18} className="text-slate-400" /><h4 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">{t('migration.json.taxonomyTitle')}</h4></div><div className="flex gap-4"><button onClick={() => setTaxonomySelection(prev => Object.keys(prev).reduce((acc, k) => ({ ...acc, [k]: true }), {}))} className="text-[10px] font-bold text-indigo-600 hover:underline uppercase tracking-wider">{t('migration.json.selectAll')}</button><button onClick={() => setTaxonomySelection(prev => Object.keys(prev).reduce((acc, k) => ({ ...acc, [k]: false }), {}))} className="text-[10px] font-bold text-slate-400 hover:underline uppercase tracking-wider">{t('migration.json.deselectAll')}</button></div></div>
                                                    <div className="bg-slate-50/50 rounded-3xl p-6 border border-slate-100"><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {[
                                                            { key: 'analysisTypes', label: t('settings.analysisTypes'), icon: Activity },
                                                            { key: 'analysisStatuses', label: t('settings.analysisStatuses'), icon: CheckCircle },
                                                            { key: 'specialties', label: t('settings.specialties'), icon: Settings },
                                                            { key: 'failureModes', label: t('settings.failureModes'), icon: AlertTriangle },
                                                            { key: 'failureCategories', label: t('settings.failureCategories'), icon: Box },
                                                            { key: 'componentTypes', label: t('settings.componentTypes'), icon: Layers },
                                                            { key: 'rootCauseMs', label: t('settings.rootCauseMs'), icon: TableProperties },
                                                            { key: 'triggerStatuses', label: t('settings.triggerStatuses'), icon: RefreshCw }
                                                        ].map(item => (
                                                            <label key={item.key} className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${taxonomySelection[item.key] ? 'bg-white border-indigo-200 shadow-sm text-indigo-700' : 'bg-transparent border-transparent text-slate-500 hover:bg-white/50'}`}>
                                                                <input type="checkbox" checked={!!taxonomySelection[item.key]} onChange={() => toggleTaxonomy(item.key)} className="w-4 h-4 text-indigo-600 rounded-lg border-slate-300 focus:ring-4 focus:ring-indigo-500/10" />
                                                                <item.icon size={14} className={taxonomySelection[item.key] ? 'text-indigo-500' : 'text-slate-300'} />
                                                                <span className="text-xs font-bold truncate">{item.label}</span>
                                                            </label>
                                                        ))}
                                                    </div></div>
                                                    <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 flex gap-3"><Info size={18} className="text-indigo-500 flex-shrink-0" /><p className="text-[11px] text-indigo-700/70 leading-relaxed">Ao importar taxonomias, os IDs existentes no sistema serão preservados se houver conflito, priorizando a integridade da base local.</p></div>
                                                </div>
                                            </div>
                                            <div className="flex justify-end pt-8 border-t border-slate-100 gap-4">
                                                <button onClick={() => setPreviewData(null)} className="px-8 py-3.5 text-slate-500 font-bold text-sm rounded-xl hover:bg-slate-50 transition-colors">{t('migration.cancel')}</button>
                                                <button onClick={executeImport} className="px-12 py-3.5 bg-emerald-600 text-white font-black text-sm rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 active:scale-95"><RefreshCw size={18} />{t('migration.json.initializeButton')}</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                            {/* Coluna de Configuração CSV */}
                            <div className="lg:col-span-7 space-y-8">
                                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-soft h-full">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shadow-sm">
                                            <FileSpreadsheet size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-800 tracking-tight">{t('migration.csvTools')}</h3>
                                            <p className="text-xs text-slate-500 font-medium">Configurações de Entidade e Lógica</p>
                                        </div>
                                    </div>

                                    <div className="space-y-8">
                                        {/* Seleção de Entidade com Cards Visuais */}
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 px-1">
                                                {t('migration.targetEntity')}
                                            </label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                                                {entityOptions.map(opt => (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() => { setCsvType(opt.value); setMsg(null); }}
                                                        className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left group ${
                                                            csvType === opt.value 
                                                                ? 'bg-indigo-50 border-indigo-500 shadow-sm ring-4 ring-indigo-500/5' 
                                                                : 'bg-slate-50/50 border-transparent hover:border-slate-200'
                                                        }`}
                                                    >
                                                        <div className={`p-2 rounded-xl transition-colors ${csvType === opt.value ? 'bg-white text-indigo-600' : 'bg-white text-slate-400 group-hover:text-slate-600'}`}>
                                                            <opt.icon size={18} />
                                                        </div>
                                                        <span className={`text-xs font-bold ${csvType === opt.value ? 'text-indigo-700' : 'text-slate-600'}`}>{opt.label}</span>
                                                        {csvType === opt.value && <Check size={14} className="ml-auto text-indigo-600" strokeWidth={3} />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Modo de Importação CSV Redesenhado */}
                                        <div className="p-6 rounded-3xl bg-slate-50/50 border border-slate-100 space-y-6">
                                            <div className="flex items-center gap-2 text-slate-800">
                                                <Settings size={16} className="text-slate-400" />
                                                <h4 className="text-xs font-bold uppercase tracking-wider">{t('migration.csv.importOptions')}</h4>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {[
                                                    { id: 'APPEND', label: t('migration.csv.appendLabel'), desc: t('migration.csv.appendHint'), icon: FileUp },
                                                    { id: 'UPDATE', label: t('migration.csv.updateLabel'), desc: t('migration.csv.updateHint'), icon: RefreshCw },
                                                ].map((mode) => (
                                                    <button
                                                        key={mode.id}
                                                        onClick={() => setImportMode(mode.id as any)}
                                                        className={`p-4 rounded-2xl border-2 text-left transition-all ${
                                                            (importMode === mode.id || (mode.id === 'APPEND' && importMode === 'REPLACE'))
                                                                ? 'bg-white border-indigo-500 shadow-md ring-4 ring-indigo-500/5' 
                                                                : 'bg-transparent border-slate-100 hover:border-slate-200'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3 mb-1">
                                                            <mode.icon size={14} className={importMode === mode.id ? 'text-indigo-600' : 'text-slate-400'} />
                                                            <span className={`text-xs font-bold ${importMode === mode.id ? 'text-indigo-700' : 'text-slate-700'}`}>{mode.label}</span>
                                                        </div>
                                                        <p className="text-[10px] text-slate-400 leading-relaxed">{mode.desc}</p>
                                                    </button>
                                                ))}
                                            </div>

                                            {csvType === 'TRIGGERS' && (
                                                <label className="flex items-center gap-4 p-4 rounded-2xl bg-indigo-50 border border-indigo-100 cursor-pointer group transition-all hover:bg-indigo-100/50">
                                                    <div className="relative flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            id="csv_inherit_hierarchy"
                                                            checked={inheritHierarchy}
                                                            onChange={e => setInheritHierarchy(e.target.checked)}
                                                            className="w-5 h-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-4 focus:ring-indigo-500/10"
                                                        />
                                                    </div>
                                                    <div>
                                                        <span className="text-xs font-bold text-indigo-800">{t('migration.csv.inheritHierarchy')}</span>
                                                        <p className="text-[10px] text-indigo-600/60 leading-relaxed">{t('migration.csv.inheritHint')}</p>
                                                    </div>
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Coluna de Ações de Arquivo CSV */}
                            <div className="lg:col-span-5 space-y-6">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 px-1">Ações de Arquivo</label>
                                
                                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-soft overflow-hidden">
                                    <div className="p-8 space-y-4">
                                        <button
                                            onClick={handleDownloadTemplate}
                                            className="w-full flex items-center gap-4 p-6 bg-slate-50/50 border border-slate-100 rounded-3xl hover:bg-white hover:shadow-lg hover:border-indigo-200 transition-all group text-left"
                                        >
                                            <div className="p-4 bg-white rounded-2xl shadow-sm text-slate-400 group-hover:text-indigo-600 group-hover:scale-110 transition-all">
                                                <FileDown size={24} />
                                            </div>
                                            <div className="flex-1">
                                                <span className="block font-bold text-slate-700 text-sm">{t('migration.downloadTemplate')}</span>
                                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Obter modelo estruturado</span>
                                            </div>
                                            <ChevronRight size={18} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                                        </button>

                                        <button
                                            onClick={handleCsvExport}
                                            className="w-full flex items-center gap-4 p-6 bg-slate-50/50 border border-slate-100 rounded-3xl hover:bg-white hover:shadow-lg hover:border-emerald-200 transition-all group text-left"
                                        >
                                            <div className="p-4 bg-white rounded-2xl shadow-sm text-slate-400 group-hover:text-emerald-600 group-hover:scale-110 transition-all">
                                                <Download size={24} />
                                            </div>
                                            <div className="flex-1">
                                                <span className="block font-bold text-slate-700 text-sm">{t('migration.exportData')}</span>
                                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Baixar dados existentes</span>
                                            </div>
                                            <ChevronRight size={18} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                                        </button>

                                        <div className="relative group pt-4">
                                            <input
                                                type="file"
                                                id="csv_file_import"
                                                ref={csvInputRef}
                                                onChange={handleCsvImport}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                accept=".csv"
                                            />
                                            <div className="flex items-center gap-4 p-8 bg-indigo-600 rounded-[2rem] shadow-xl shadow-indigo-600/20 group-hover:bg-indigo-700 group-hover:scale-[1.02] transition-all text-left">
                                                <div className="p-4 bg-white/10 rounded-2xl text-white">
                                                    <FileUp size={28} />
                                                </div>
                                                <div className="flex-1">
                                                    <span className="block font-black text-white text-base">{t('migration.importCsv')}</span>
                                                    <span className="text-xs text-indigo-100 font-medium opacity-80 uppercase tracking-wider italic">Clique para selecionar arquivo</span>
                                                </div>
                                                <ChevronRight size={20} className="text-indigo-200 group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50/80 p-6 border-t border-slate-100 flex gap-3">
                                        <Info size={16} className="text-slate-400 flex-shrink-0 mt-0.5" />
                                        <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                                            Certifique-se de que o separador do arquivo CSV é ponto e vírgula (;) ou vírgula (,) e a codificação é UTF-8 para evitar erros de caracteres especiais.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};