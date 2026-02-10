/**
 * Proposta: Vista de Migração e Gestão de Backup (JSON/CSV) com UI Premium.
 * Fluxo: Orquestra a importação e exportação de dados, com visualização rica de metadados, agrupamento lógico de taxonomia e feedbacks visuais claros para evitar erros de operação.
 */

import React, { useState, useRef, useMemo } from 'react';
import { 
  Upload, Download, FileSpreadsheet, Database, 
  RefreshCw, CheckCircle, AlertTriangle, FileJson, 
  Layers, Activity, ClipboardList, ChevronRight,
  Info, ShieldCheck, Box, Settings, X, Check
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
        { value: 'ASSETS' as CsvEntityType, label: t('migration.entities.assets') },
        { value: 'ACTIONS' as CsvEntityType, label: t('migration.entities.actions') },
        { value: 'TRIGGERS' as CsvEntityType, label: t('migration.entities.triggers') },
        { value: 'RECORDS_SUMMARY' as CsvEntityType, label: t('migration.entities.recordsSummary') },
        { value: 'TAXONOMY_ANALYSIS_TYPES' as CsvEntityType, label: t('migration.entities.taxonomyAnalysisTypes') },
        { value: 'TAXONOMY_STATUSES' as CsvEntityType, label: t('migration.entities.taxonomyStatuses') },
        { value: 'TAXONOMY_SPECIALTIES' as CsvEntityType, label: t('migration.entities.taxonomySpecialties') },
        { value: 'TAXONOMY_FAILURE_MODES' as CsvEntityType, label: t('migration.entities.taxonomyFailureModes') },
        { value: 'TAXONOMY_FAILURE_CATEGORIES' as CsvEntityType, label: t('migration.entities.taxonomyFailureCategories') },
        { value: 'TAXONOMY_COMPONENT_TYPES' as CsvEntityType, label: t('migration.entities.taxonomyComponentTypes') },
        { value: 'TAXONOMY_ROOT_CAUSE_MS' as CsvEntityType, label: t('migration.entities.taxonomyRootCauseMs') },
        { value: 'TAXONOMY_TRIGGER_STATUSES' as CsvEntityType, label: t('migration.entities.taxonomyTriggerStatuses') },
    ], [t]);

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

    // --- GESTÃO DE BACKUP JSON ---

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
            console.error(error);
        }
    };

    const executeImport = async () => {
        if (!previewData) return;

        setMsg({ type: 'success', text: 'Executando importação...' });

        try {
            const selectedTaxonomies = Object.entries(taxonomySelection)
                .filter(([_, selected]) => selected)
                .map(([key]) => key);

            let res: { success: boolean, message: string };

            if (useApi) {
                res = await importDataToApi(previewData, importMode, selectedTaxonomies);
            } else {
                res = importData(JSON.stringify(previewData));
            }

            setMsg({ type: res.success ? 'success' : 'error', text: res.message });
            if (res.success) {
                await refreshAll();
                setPreviewData(null);
                if (jsonInputRef.current) jsonInputRef.current.value = '';
            }
        } catch (error) {
            setMsg({ type: 'error', text: 'Falha na importação.' });
            console.error(error);
        }
    };

    const handleJsonDownload = async () => {
        setMsg({ type: 'success', text: 'Preparando carga total de dados...' });
        try {
            const fullRecords = useApi ? await fetchAllRecordsFull() : records;

            const exportObj: MigrationData = {
                metadata: {
                    systemVersion: '17.0',
                    exportDate: new Date().toISOString(),
                    recordCount: fullRecords.length,
                    description: 'Backup Integral do Sistema'
                },
                assets,
                records: fullRecords,
                actions,
                triggers,
                taxonomy
            };
            const json = JSON.stringify(exportObj, null, 2);
            downloadFile(json, `rca_backup_v17_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
            setMsg({ type: 'success', text: 'Backup gerado e baixado com sucesso.' });
        } catch (error) {
            setMsg({ type: 'error', text: 'Falha ao gerar backup.' });
            console.error(error);
        }
    };

    const toggleTaxonomy = (key: string) => {
        setTaxonomySelection(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // --- FERRAMENTAS CSV ---

    const handleDownloadTemplate = () => {
        const template = getCsvTemplate(csvType);
        const content = '\uFEFF' + template;
        downloadFile(content, `template_${csvType.toLowerCase()}.csv`, 'text/csv;charset=utf-8;');
    };

    const handleCsvExport = async () => {
        setMsg({ type: 'success', text: 'Preparando exportação CSV...' });
        try {
            const exportRecords = (useApi && csvType === 'RECORDS_SUMMARY') 
                ? await fetchAllRecordsFull() 
                : records;

            const data = exportToCsvService(csvType, { assets, actions, triggers, records: exportRecords, taxonomy });
            const content = '\uFEFF' + data;
            downloadFile(content, `export_${csvType.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
            setMsg({ type: 'success', text: 'Exportação concluída.' });
        } catch (error) {
            setMsg({ type: 'error', text: 'Falha na exportação.' });
            console.error(error);
        }
    };

    const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setMsg({ type: 'success', text: 'Processando arquivo CSV...' });

        try {
            const content = await readFileWithEncoding(file);
            const safeMode = importMode === 'REPLACE' ? 'APPEND' : importMode;

            const res = importFromCsv(csvType, content, {
                assets, actions, triggers, records, taxonomy
            }, { mode: safeMode, inheritHierarchy });

            if (res.success && res.data) {
                if (useApi) {
                    switch (res.dataType) {
                        case 'ASSETS': await importAssetsToApi(res.data); break;
                        case 'ACTIONS': await importActionsToApi(res.data); break;
                        case 'TRIGGERS': await importTriggersToApi(res.data); break;
                        case 'RECORDS_SUMMARY': await importRecordsToApi(res.data); break;
                        default:
                            if (res.dataType?.startsWith('TAXONOMY_')) {
                                await importTaxonomyToApi(res.data);
                            }
                            break;
                    }
                } else {
                    switch (res.dataType) {
                        case 'ASSETS': saveAssets(res.data); break;
                        case 'ACTIONS': saveActions(res.data); break;
                        case 'TRIGGERS': saveTriggers(res.data); break;
                        case 'RECORDS_SUMMARY': saveRecords(res.data); break;
                        default:
                            if (res.dataType?.startsWith('TAXONOMY_')) {
                                saveTaxonomy(res.data);
                            }
                            break;
                    }
                }
                setMsg({ type: 'success', text: res.message });
                await refreshAll();
            } else {
                setMsg({ type: 'error', text: res.message });
            }

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            setMsg({ type: 'error', text: `Falha ao processar CSV: ${errorMsg}` });
            console.error(error);
        } finally {
            if (csvInputRef.current) csvInputRef.current.value = '';
        }
    };

    return (
        <div className="h-full flex flex-col bg-page-gradient overflow-hidden">
            {/* Header Modernizado */}
            <div className="px-8 py-6 flex items-center justify-between border-b border-slate-200/60 bg-white/50 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-blue-600 shadow-lg shadow-blue-600/20 rounded-xl text-white">
                        <Database size={22} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 font-display tracking-tight leading-tight">{t('migration.title')}</h1>
                        <p className="text-xs text-slate-500 font-medium">{t('migration.description')}</p>
                    </div>
                </div>

                <div className="flex bg-slate-100/80 p-1 rounded-xl shadow-inner">
                    <button
                        onClick={() => { setActiveTab('JSON'); setMsg(null); }}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${activeTab === 'JSON' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}
                    >
                        {t('migration.backup')}
                    </button>
                    <button
                        onClick={() => { setActiveTab('CSV'); setMsg(null); }}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${activeTab === 'CSV' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}
                    >
                        {t('migration.csvTools')}
                    </button>
                </div>
            </div>

            <main className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-8 max-w-[1600px] mx-auto animate-in fade-in pb-32">
                    
                    {/* Mensagens de Feedback */}
                    {msg && (
                        <div className={`mb-8 p-4 rounded-2xl border flex items-center gap-3 animate-in slide-in-from-top-2 ${msg.type === 'success' ? 'bg-green-50 text-green-700 border-green-100 shadow-sm shadow-green-100/50' : 'bg-red-50 text-red-700 border-red-100 shadow-sm shadow-red-100/50'}`}>
                            {msg.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                            <span className="text-sm font-bold">{msg.text}</span>
                            <button onClick={() => setMsg(null)} className="ml-auto p-1 hover:bg-black/5 rounded-lg"><X size={16} /></button>
                        </div>
                    )}

                    {activeTab === 'JSON' ? (
                        <div className="space-y-10">
                            {/* 1. Upload ou Exportação Centralizada */}
                            {!previewData && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Card de Importação */}
                                    <div className="bg-white p-10 rounded-3xl border border-slate-100 shadow-soft text-center group hover:border-blue-200 transition-all relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                            <Upload size={120} />
                                        </div>
                                        <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-blue-600 group-hover:scale-110 group-hover:rotate-3 transition-all">
                                            <FileJson size={40} />
                                        </div>
                                        <h3 className="text-2xl font-bold mb-2 text-slate-800 tracking-tight">{t('migration.restore')}</h3>
                                        <p className="text-sm text-slate-500 mb-8 max-w-xs mx-auto leading-relaxed">{t('migration.json.dragDrop')}</p>
                                        <div className="relative inline-block">
                                            <input
                                                type="file"
                                                ref={jsonInputRef}
                                                onChange={handleJsonFileSelect}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                accept=".json"
                                            />
                                            <button className="bg-blue-600 text-white font-bold py-3.5 px-10 rounded-xl shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all pointer-events-none active:scale-95">
                                                {t('migration.json.selectButton')}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Card de Exportação */}
                                    <div className="bg-white p-10 rounded-3xl border border-slate-100 shadow-soft text-center group hover:border-indigo-200 transition-all relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                            <Download size={120} />
                                        </div>
                                        <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-600 group-hover:scale-110 group-hover:-rotate-3 transition-all">
                                            <Database size={40} />
                                        </div>
                                        <h3 className="text-2xl font-bold mb-2 text-slate-800 tracking-tight">{t('migration.json.createBackup')}</h3>
                                        <p className="text-sm text-slate-500 mb-8 max-w-xs mx-auto leading-relaxed">Crie um arquivo completo contendo Ativos, RCAs, Ações e Taxonomia para segurança.</p>
                                        <button 
                                            onClick={handleJsonDownload}
                                            className="bg-indigo-600 text-white font-bold py-3.5 px-10 rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95"
                                        >
                                            {t('migration.json.downloadButton')}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* 2. Visualização de Preview e Configuração (Após seleção) */}
                            {previewData && (
                                <div className="animate-in fade-in slide-in-from-bottom-6 duration-500">
                                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
                                        {/* Top Bar Preview */}
                                        <div className="bg-slate-50/50 p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                            <div className="flex items-center gap-5">
                                                <div className="p-4 bg-white rounded-2xl shadow-sm text-blue-600">
                                                    <ClipboardList size={32} />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-bold text-slate-800">{t('migration.importConfig')}</h3>
                                                    <p className="text-sm text-slate-500 font-medium">Versão do Schema: <span className="text-blue-600">{previewData.metadata?.systemVersion || '17.0'}</span> • Gerado em: {new Date(previewData.metadata?.exportDate).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => { setPreviewData(null); if (jsonInputRef.current) jsonInputRef.current.value = ''; }}
                                                className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors flex items-center gap-2"
                                            >
                                                <X size={16} /> {t('migration.json.changeFile')}
                                            </button>
                                        </div>

                                        <div className="p-10 space-y-12">
                                            {/* Grid de Contagens Encontradas */}
                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                                {[
                                                    { label: 'Análises RCA', count: previewData.records?.length || 0, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
                                                    { label: 'Planos de Ação', count: previewData.actions?.length || 0, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                                                    { label: 'Eventos Gatilho', count: previewData.triggers?.length || 0, icon: Activity, color: 'text-amber-600', bg: 'bg-amber-50' },
                                                    { label: 'Nós de Ativos', count: previewData.assets?.length || 0, icon: Layers, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                                                ].map((item, i) => (
                                                    <div key={i} className="p-6 rounded-2xl bg-slate-50/50 border border-slate-100 flex flex-col gap-1 transition-all hover:bg-white hover:shadow-md hover:border-slate-200">
                                                        <div className={`w-10 h-10 ${item.bg} ${item.color} rounded-xl flex items-center justify-center mb-2`}>
                                                            <item.icon size={20} />
                                                        </div>
                                                        <span className="text-2xl font-black text-slate-800">{item.count}</span>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.label}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                                                {/* Seção de Modo de Importação */}
                                                <div className="lg:col-span-5 space-y-6">
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <Settings size={18} className="text-slate-400" />
                                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">{t('migration.json.modeTitle')}</h4>
                                                    </div>
                                                    <div className="flex flex-col gap-4">
                                                        {[
                                                            { id: 'APPEND', label: t('migration.modes.append'), desc: t('migration.json.modeDescriptions.append'), color: 'blue' },
                                                            { id: 'UPDATE', label: t('migration.modes.update'), desc: t('migration.json.modeDescriptions.update'), color: 'blue' },
                                                            { id: 'REPLACE', label: t('migration.modes.replace'), desc: t('migration.json.modeDescriptions.replace'), color: 'red', warning: true },
                                                        ].map((mode) => (
                                                            <button
                                                                key={mode.id}
                                                                onClick={() => setImportMode(mode.id as any)}
                                                                className={`p-5 rounded-2xl border-2 text-left transition-all duration-300 group ${
                                                                    importMode === mode.id 
                                                                        ? `bg-${mode.color}-50 border-${mode.color}-500 shadow-md ring-4 ring-${mode.color}-500/10` 
                                                                        : 'bg-white border-slate-100 hover:border-slate-200'
                                                                }`}
                                                            >
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <span className={`font-bold text-sm ${importMode === mode.id ? `text-${mode.color}-700` : 'text-slate-700'}`}>{mode.label}</span>
                                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${importMode === mode.id ? `bg-${mode.color}-600 border-${mode.color}-600` : 'border-slate-200'}`}>
                                                                        {importMode === mode.id && <Check size={12} className="text-white" strokeWidth={4} />}
                                                                    </div>
                                                                </div>
                                                                <p className={`text-[11px] leading-relaxed ${importMode === mode.id ? `text-${mode.color}-600/80` : 'text-slate-400'}`}>
                                                                    {mode.warning && '⚠️ '}{mode.desc}
                                                                </p>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Seção de Taxonomia */}
                                                <div className="lg:col-span-7 space-y-6">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div className="flex items-center gap-2">
                                                            <ShieldCheck size={18} className="text-slate-400" />
                                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">{t('migration.json.taxonomyTitle')}</h4>
                                                        </div>
                                                        <div className="flex gap-4">
                                                            <button onClick={() => setTaxonomySelection(prev => Object.keys(prev).reduce((acc, k) => ({ ...acc, [k]: true }), {}))} className="text-[10px] font-bold text-blue-600 hover:underline uppercase tracking-wider">{t('migration.json.selectAll')}</button>
                                                            <button onClick={() => setTaxonomySelection(prev => Object.keys(prev).reduce((acc, k) => ({ ...acc, [k]: false }), {}))} className="text-[10px] font-bold text-slate-400 hover:underline uppercase tracking-wider">{t('migration.json.deselectAll')}</button>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="bg-slate-50/50 rounded-3xl p-6 border border-slate-100">
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                            {[
                                                                { key: 'analysisTypes', label: t('settings.analysisTypes'), icon: Activity },
                                                                { key: 'analysisStatuses', label: t('settings.analysisStatuses'), icon: CheckCircle },
                                                                { key: 'specialties', label: t('settings.specialties'), icon: Settings },
                                                                { key: 'failureModes', label: t('settings.failureModes'), icon: AlertTriangle },
                                                                { key: 'failureCategories', label: t('settings.failureCategories'), icon: Box },
                                                                { key: 'componentTypes', label: t('settings.componentTypes'), icon: Layers },
                                                                { key: 'rootCauseMs', label: t('settings.rootCauseMs'), icon: FileSpreadsheet },
                                                                { key: 'triggerStatuses', label: t('settings.triggerStatuses'), icon: RefreshCw }
                                                            ].map(item => (
                                                                <label key={item.key} className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${taxonomySelection[item.key] ? 'bg-white border-blue-200 shadow-sm text-blue-700' : 'bg-transparent border-transparent text-slate-500 hover:bg-white/50'}`}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={!!taxonomySelection[item.key]}
                                                                        onChange={() => toggleTaxonomy(item.key)}
                                                                        className="w-4 h-4 text-blue-600 rounded-lg border-slate-300 focus:ring-4 focus:ring-blue-500/10"
                                                                    />
                                                                    <item.icon size={14} className={taxonomySelection[item.key] ? 'text-blue-500' : 'text-slate-300'} />
                                                                    <span className="text-xs font-bold truncate">{item.label}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100/50 flex gap-3">
                                                        <Info size={18} className="text-blue-500 flex-shrink-0" />
                                                        <p className="text-[11px] text-blue-700/70 leading-relaxed">
                                                            Ao importar taxonomias, os IDs existentes no sistema serão preservados se houver conflito, priorizando a integridade da base local.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Ações Finais */}
                                            <div className="flex justify-end pt-8 border-t border-slate-100 gap-4">
                                                <button
                                                    onClick={() => setPreviewData(null)}
                                                    className="px-8 py-3.5 text-slate-500 font-bold text-sm rounded-xl hover:bg-slate-50 transition-colors"
                                                >
                                                    {t('migration.cancel')}
                                                </button>
                                                <button
                                                    onClick={executeImport}
                                                    className="px-12 py-3.5 bg-green-600 text-white font-black text-sm rounded-xl hover:bg-green-700 shadow-lg shadow-green-600/20 transition-all flex items-center gap-2 active:scale-95"
                                                >
                                                    <RefreshCw size={18} />
                                                    {t('migration.json.initializeButton')}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-8">
                            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-soft">
                                <div className="flex items-start gap-6 mb-10 pb-10 border-b border-slate-50">
                                    <div className="p-4 bg-green-50 text-green-600 rounded-2xl shadow-sm">
                                        <FileSpreadsheet size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{t('migration.csvTools')}</h3>
                                        <p className="text-slate-500 text-sm font-medium mt-1">{t('migration.csv.description')}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                                    <div className="lg:col-span-7 space-y-8">
                                        <div>
                                            <label htmlFor="csv_target_entity" className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-1">
                                                {t('migration.targetEntity')}
                                            </label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                                    <Layers size={18} />
                                                </div>
                                                <select
                                                    id="csv_target_entity"
                                                    name="csv_target_entity"
                                                    className="block w-full pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none text-slate-800 shadow-sm transition-all appearance-none cursor-pointer"
                                                    value={csvType}
                                                    onChange={e => { setCsvType(e.target.value as CsvEntityType); setMsg(null); }}
                                                >
                                                    {entityOptions.map(opt => (
                                                        <option key={opt.value} value={opt.value}>
                                                            {opt.label}
                                                        </option>
                                                    ))}
                                                </select>
                                                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                                                    <ChevronRight size={18} className="rotate-90" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Configurações Dinâmicas de CSV */}
                                        <div className="p-8 rounded-3xl bg-slate-50/50 border border-slate-100 space-y-6">
                                            <div className="flex items-center gap-2 text-slate-800">
                                                <Settings size={18} />
                                                <h4 className="text-sm font-bold">{t('migration.csv.importOptions')}</h4>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {[
                                                    { id: 'APPEND', label: t('migration.csv.appendLabel'), desc: t('migration.csv.appendHint') },
                                                    { id: 'UPDATE', label: t('migration.csv.updateLabel'), desc: t('migration.csv.updateHint') },
                                                ].map((mode) => (
                                                    <button
                                                        key={mode.id}
                                                        onClick={() => setImportMode(mode.id as any)}
                                                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                                                            (importMode === mode.id || (mode.id === 'APPEND' && importMode === 'REPLACE'))
                                                                ? 'bg-white border-blue-500 shadow-md ring-4 ring-blue-500/5' 
                                                                : 'bg-transparent border-slate-100 hover:border-slate-200'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3 mb-1">
                                                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${importMode === mode.id ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                                                                {importMode === mode.id && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                                            </div>
                                                            <span className="text-xs font-bold text-slate-700">{mode.label}</span>
                                                        </div>
                                                        <p className="text-[10px] text-slate-400 pl-7 leading-relaxed">{mode.desc}</p>
                                                    </button>
                                                ))}
                                            </div>

                                            {csvType === 'TRIGGERS' && (
                                                <label className="flex items-center gap-3 p-4 rounded-xl bg-blue-50/50 border border-blue-100/50 cursor-pointer group">
                                                    <div className="relative flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            id="csv_inherit_hierarchy"
                                                            name="csv_inherit_hierarchy"
                                                            checked={inheritHierarchy}
                                                            onChange={e => setInheritHierarchy(e.target.checked)}
                                                            className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-4 focus:ring-blue-500/10 cursor-pointer"
                                                        />
                                                    </div>
                                                    <div>
                                                        <span className="text-xs font-bold text-blue-800">{t('migration.csv.inheritHierarchy')}</span>
                                                        <p className="text-[10px] text-blue-600/60 leading-relaxed mt-0.5">{t('migration.csv.inheritHint')}</p>
                                                    </div>
                                                </label>
                                            )}
                                        </div>
                                    </div>

                                    {/* Ações de CSV */}
                                    <div className="lg:col-span-5 flex flex-col gap-4">
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-1">Ações Disponíveis</label>
                                        
                                        <button
                                            onClick={handleDownloadTemplate}
                                            className="flex items-center gap-4 p-6 bg-slate-50/50 border border-slate-100 rounded-2xl hover:bg-white hover:shadow-md hover:border-slate-200 transition-all group text-left"
                                        >
                                            <div className="p-3 bg-white rounded-xl shadow-sm text-slate-400 group-hover:text-blue-500 transition-colors">
                                                <FileSpreadsheet size={24} />
                                            </div>
                                            <div>
                                                <span className="block font-bold text-slate-700">{t('migration.downloadTemplate')}</span>
                                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Baixar Estrutura (.csv)</span>
                                            </div>
                                            <ChevronRight size={18} className="ml-auto text-slate-300 group-hover:translate-x-1 transition-transform" />
                                        </button>

                                        <button
                                            onClick={handleCsvExport}
                                            className="flex items-center gap-4 p-6 bg-slate-50/50 border border-slate-100 rounded-2xl hover:bg-white hover:shadow-md hover:border-slate-200 transition-all group text-left"
                                        >
                                            <div className="p-3 bg-white rounded-xl shadow-sm text-slate-400 group-hover:text-emerald-500 transition-colors">
                                                <Download size={24} />
                                            </div>
                                            <div>
                                                <span className="block font-bold text-slate-700">{t('migration.exportData')}</span>
                                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Exportar registros atuais</span>
                                            </div>
                                            <ChevronRight size={18} className="ml-auto text-slate-300 group-hover:translate-x-1 transition-transform" />
                                        </button>

                                        <div className="relative group mt-4">
                                            <input
                                                type="file"
                                                id="csv_file_import"
                                                name="csv_file_import"
                                                aria-label="Selecionar arquivo CSV para importação"
                                                ref={csvInputRef}
                                                onChange={handleCsvImport}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                accept=".csv"
                                            />
                                            <div className="flex items-center gap-4 p-6 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20 group-hover:bg-blue-700 transition-all text-left">
                                                <div className="p-3 bg-white/10 rounded-xl text-white">
                                                    <Upload size={24} />
                                                </div>
                                                <div>
                                                    <span className="block font-bold text-white">{t('migration.importCsv')}</span>
                                                    <span className="text-[10px] text-blue-100 uppercase font-bold tracking-tight">Processar arquivo local</span>
                                                </div>
                                                <ChevronRight size={18} className="ml-auto text-blue-200 group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        </div>
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
