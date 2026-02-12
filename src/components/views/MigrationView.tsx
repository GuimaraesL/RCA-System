/**
 * Proposta: Vista de Migração e Gestão de Backup (JSON/CSV) com UI Premium Redesenhada.
 * Fluxo: Orquestra a importação e exportação de dados com uma interface de alta fidelidade, separando claramente as ferramentas de backup integral (JSON) das ferramentas de edição em massa (CSV).
 */

import React, { useState, useRef, useMemo, useId } from 'react';
import { 
  Upload, Download, FileSpreadsheet, Database, 
  RefreshCw, CheckCircle, AlertTriangle, FileJson, 
  Layers, Activity, ClipboardList, ChevronRight,
  Info, ShieldCheck, Box, Settings, X, Check,
  FileDown, FileUp, TableProperties
} from 'lucide-react';
import { importData, saveAssets, saveActions, saveRecords, saveTriggers, saveTaxonomy } from '../../services/storageService';
import { fetchAllRecordsFull, importDataToApi, importRecordsToApi, importActionsToApi, importTriggersToApi, importAssetsToApi, importTaxonomyToApi } from '../../services/apiService';
import { MigrationData, TaxonomyConfig } from '../../types';
import { CsvEntityType, getCsvTemplate, exportToCsv as exportToCsvService, importFromCsv } from '../../services/csvService';
import { useRcaContext } from '../../context/RcaContext';
import { useLanguage } from '../../context/LanguageDefinition'; 

export const MigrationView: React.FC = () => {
    const { t } = useLanguage();
    const idPrefix = useId();
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
        <div className="h-full flex flex-col bg-slate-50/50 overflow-hidden">
            {/* Header com Seletor de Abas Redesenhado */}
            <div className="px-10 py-8 flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-slate-200/60 bg-white sticky top-0 z-10">
                <div className="flex items-center gap-5">
                    <div className="p-3 bg-blue-600 shadow-xl shadow-blue-600/20 rounded-2xl text-white">
                        <Database size={26} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 font-display tracking-tight leading-tight uppercase italic">{t('migration.title')}</h1>
                        <p className="text-sm text-slate-400 font-bold mt-1 uppercase tracking-tight">{t('migration.description')}</p>
                    </div>
                </div>

                <div className="inline-flex p-1.5 bg-slate-100 rounded-2xl border border-slate-200/60 self-start md:self-auto shadow-inner">
                    {[
                        { id: 'JSON', label: t('migration.backup'), icon: FileJson },
                        { id: 'CSV', label: t('migration.csvTools'), icon: FileSpreadsheet }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id as any); setMsg(null); }}
                            className={`flex items-center gap-3 px-8 py-2.5 rounded-xl text-sm font-black transition-all duration-300 ${
                                activeTab === tab.id 
                                    ? 'bg-white text-blue-600 shadow-lg ring-1 ring-black/5' 
                                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                            }`}
                        >
                            <tab.icon size={18} className={activeTab === tab.id ? 'text-blue-600' : 'text-slate-400'} />
                            <span className="uppercase tracking-widest text-[11px]">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <main className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-10 lg:p-16 max-w-[1600px] mx-auto animate-in fade-in pb-32 duration-700">
                    
                    {/* Mensagens de Feedback */}
                    {msg && (
                        <div className={`mb-10 p-6 rounded-3xl border-2 flex items-center gap-4 animate-in slide-in-from-top-4 duration-500 ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-xl shadow-emerald-500/5' : 'bg-rose-50 text-rose-700 border-rose-100 shadow-xl shadow-rose-500/5'}`}>
                            <div className={`p-2 rounded-xl bg-white shadow-sm ${msg.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {msg.type === 'success' ? <CheckCircle size={24} /> : <AlertTriangle size={24} />}
                            </div>
                            <span className="text-base font-black tracking-tight">{msg.text}</span>
                            <button onClick={() => setMsg(null)} className="ml-auto p-2 hover:bg-black/5 rounded-full transition-colors"><X size={20} /></button>
                        </div>
                    )}

                    {activeTab === 'JSON' ? (
                        <div className="space-y-12">
                            {!previewData && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                    <div className="bg-white p-12 rounded-[3rem] border border-slate-200/60 shadow-sm text-center group hover:border-blue-300 hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-500 relative overflow-hidden">
                                        <div className="absolute -top-10 -right-10 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform"><Upload size={240} /></div>
                                        <div className="w-24 h-24 bg-blue-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-blue-600 group-hover:scale-110 transition-all duration-500 shadow-inner"><FileJson size={48} /></div>
                                        <h3 className="text-3xl font-black mb-3 text-slate-900 tracking-tight font-display">{t('migration.restore')}</h3>
                                        <p className="text-sm text-slate-400 font-bold mb-10 max-w-xs mx-auto leading-relaxed uppercase tracking-widest">{t('migration.json.dragDrop')}</p>
                                        <div className="relative inline-block">
                                            <input type="file" ref={jsonInputRef} onChange={handleJsonFileSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" accept=".json" />
                                            <button className="bg-blue-600 text-white font-black py-4 px-12 rounded-2xl shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all pointer-events-none active:scale-95 uppercase tracking-widest text-xs">{t('migration.json.selectButton')}</button>
                                        </div>
                                    </div>
                                    <div className="bg-white p-12 rounded-[3rem] border border-slate-200/60 shadow-sm text-center group hover:border-cyan-300 hover:shadow-2xl hover:shadow-cyan-500/5 transition-all duration-500 relative overflow-hidden">
                                        <div className="absolute -top-10 -right-10 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform"><Download size={240} /></div>
                                        <div className="w-24 h-24 bg-cyan-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-cyan-600 group-hover:scale-110 transition-all duration-500 shadow-inner"><Database size={48} /></div>
                                        <h3 className="text-3xl font-black mb-3 text-slate-900 tracking-tight font-display">{t('migration.json.createBackup')}</h3>
                                        <p className="text-sm text-slate-400 font-bold mb-10 max-w-xs mx-auto leading-relaxed uppercase tracking-widest">Gere um arquivo integral contendo Ativos, RCAs, Ações e Taxonomia.</p>
                                        <button onClick={handleJsonDownload} className="bg-cyan-600 text-white font-black py-4 px-12 rounded-2xl shadow-xl shadow-cyan-600/20 hover:bg-cyan-700 transition-all active:scale-95 uppercase tracking-widest text-xs">{t('migration.json.downloadButton')}</button>
                                    </div>
                                </div>
                            )}

                            {previewData && (
                                <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                                    <div className="bg-white rounded-[3rem] border border-slate-200/60 shadow-2xl overflow-hidden">
                                        <div className="bg-slate-50/50 p-10 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                                            <div className="flex items-center gap-6">
                                                <div className="p-5 bg-white rounded-3xl shadow-lg text-blue-600 border border-slate-100"><ClipboardList size={40} /></div>
                                                <div>
                                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight font-display uppercase italic">{t('migration.importConfig')}</h3>
                                                    <p className="text-xs text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Schema: <span className="text-blue-600">{previewData.metadata?.systemVersion || '17.0'}</span> • Gerado em {new Date(previewData.metadata?.exportDate).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <button onClick={() => { setPreviewData(null); if (jsonInputRef.current) jsonInputRef.current.value = ''; }} className="px-6 py-3 bg-rose-50 text-rose-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-rose-100 transition-all flex items-center gap-2 border border-rose-100 shadow-sm"><X size={18} strokeWidth={3} /> {t('migration.json.changeFile')}</button>
                                        </div>
                                        <div className="p-12 space-y-16">
                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                                                {[
                                                    { label: 'Análises RCA', count: previewData.records?.length || 0, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
                                                    { label: 'Planos de Ação', count: previewData.actions?.length || 0, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                                                    { label: 'Eventos Gatilho', count: previewData.triggers?.length || 0, icon: Activity, color: 'text-amber-600', bg: 'bg-amber-50' },
                                                    { label: 'Nós de Ativos', count: previewData.assets?.length || 0, icon: Layers, color: 'text-cyan-600', bg: 'bg-cyan-50' },
                                                ].map((item, i) => (
                                                    <div key={i} className="p-8 rounded-[2rem] bg-slate-50/30 border border-slate-100 flex flex-col gap-2 transition-all hover:bg-white hover:shadow-xl hover:shadow-blue-500/5 hover:border-slate-200 group">
                                                        <div className={`w-12 h-12 ${item.bg} ${item.color} rounded-2xl flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform`}><item.icon size={24} strokeWidth={2.5} /></div>
                                                        <span className="text-4xl font-black text-slate-900 tracking-tighter">{item.count}</span>
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{item.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                                                <div className="lg:col-span-5 space-y-8">
                                                    <div className="flex items-center gap-3 mb-6"><Settings size={20} className="text-slate-400" /><h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{t('migration.json.modeTitle')}</h4></div>
                                                    <div className="flex flex-col gap-5">
                                                        {[
                                                            { id: 'APPEND', label: t('migration.modes.append'), desc: t('migration.json.modeDescriptions.append'), color: 'blue' },
                                                            { id: 'UPDATE', label: t('migration.modes.update'), desc: t('migration.json.modeDescriptions.update'), color: 'cyan' },
                                                            { id: 'REPLACE', label: t('migration.modes.replace'), desc: t('migration.json.modeDescriptions.replace'), color: 'rose', warning: true },
                                                        ].map((mode) => (
                                                            <button key={mode.id} onClick={() => setImportMode(mode.id as any)} className={`p-6 rounded-[2rem] border-2 text-left transition-all duration-500 group ${importMode === mode.id ? `bg-white border-${mode.color === 'rose' ? 'rose' : mode.color}-500 shadow-xl shadow-${mode.color === 'rose' ? 'rose' : mode.color}-500/10 ring-4 ring-${mode.color === 'rose' ? 'rose' : mode.color}-500/5` : 'bg-transparent border-slate-100 hover:border-slate-200'}`}>
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <span className={`font-black text-sm uppercase tracking-widest ${importMode === mode.id ? `text-${mode.color === 'rose' ? 'rose' : mode.color}-700` : 'text-slate-500'}`}>{mode.label}</span>
                                                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${importMode === mode.id ? `bg-${mode.color === 'rose' ? 'rose' : mode.color}-600 border-${mode.color === 'rose' ? 'rose' : mode.color}-600 shadow-lg shadow-${mode.color === 'rose' ? 'rose' : mode.color}-500/20` : 'border-slate-200'}`}>{importMode === mode.id && <Check size={14} className="text-white" strokeWidth={4} />}</div>
                                                                </div>
                                                                <p className={`text-[11px] font-bold leading-relaxed ${importMode === mode.id ? `text-${mode.color === 'rose' ? 'rose' : mode.color}-600/80` : 'text-slate-400'}`}>{mode.warning && '⚠️ '}{mode.desc}</p>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="lg:col-span-7 space-y-8">
                                                    <div className="flex items-center justify-between mb-6"><div className="flex items-center gap-3"><ShieldCheck size={20} className="text-slate-400" /><h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{t('migration.json.taxonomyTitle')}</h4></div><div className="flex gap-6"><button onClick={() => setTaxonomySelection(prev => Object.keys(prev).reduce((acc, k) => ({ ...acc, [k]: true }), {}))} className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest">{t('migration.json.selectAll')}</button><button onClick={() => setTaxonomySelection(prev => Object.keys(prev).reduce((acc, k) => ({ ...acc, [k]: false }), {}))} className="text-[10px] font-black text-slate-400 hover:text-slate-500 uppercase tracking-widest">{t('migration.json.deselectAll')}</button></div></div>
                                                    <div className="bg-slate-50/50 rounded-[2.5rem] p-8 border border-slate-100"><div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                                            <label key={item.key} htmlFor={`${idPrefix}-tax-${item.key}`} className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${taxonomySelection[item.key] ? 'bg-white border-blue-500 shadow-lg shadow-blue-500/5 text-blue-700' : 'bg-transparent border-transparent text-slate-500 hover:bg-white/50'}`}>
                                                                <input id={`${idPrefix}-tax-${item.key}`} type="checkbox" checked={!!taxonomySelection[item.key]} onChange={() => toggleTaxonomy(item.key)} className="w-5 h-5 text-blue-600 rounded-lg border-slate-200 focus:ring-4 focus:ring-blue-500/10 cursor-pointer" />
                                                                <item.icon size={18} strokeWidth={2.5} className={taxonomySelection[item.key] ? 'text-blue-500' : 'text-slate-300'} />
                                                                <span className="text-xs font-black uppercase tracking-tight truncate">{item.label}</span>
                                                            </label>
                                                        ))}
                                                    </div></div>
                                                    <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100 flex gap-4"><Info size={20} className="text-blue-500 flex-shrink-0 mt-0.5" /><p className="text-[11px] text-blue-700 font-bold leading-relaxed">Nota: Conflitos de ID serão resolvidos preservando a integridade da base local existente.</p></div>
                                                </div>
                                            </div>
                                            <div className="flex justify-end pt-10 border-t border-slate-100 gap-6">
                                                <button onClick={() => setPreviewData(null)} className="px-10 py-4 text-slate-400 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-200">{t('migration.cancel')}</button>
                                                <button onClick={executeImport} className="px-16 py-4 bg-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 transition-all flex items-center gap-3 active:scale-95"><RefreshCw size={20} strokeWidth={3} />{t('migration.json.initializeButton')}</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                            {/* Coluna de Configuração CSV */}
                            <div className="lg:col-span-7 space-y-10">
                                <div className="bg-white p-10 lg:p-12 rounded-[3rem] border border-slate-200/60 shadow-sm h-full">
                                    <div className="flex items-center gap-5 mb-10 border-b border-slate-100 pb-6">
                                        <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl shadow-sm border border-emerald-100">
                                            <FileSpreadsheet size={28} />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black text-slate-900 tracking-tight font-display uppercase italic">{t('migration.csvTools')}</h3>
                                            <p className="text-xs text-slate-400 font-black uppercase tracking-widest mt-1">Configurações de Entidade e Lógica</p>
                                        </div>
                                    </div>

                                    <div className="space-y-10">
                                        {/* Seleção de Entidade com Cards Visuais */}
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 px-2">
                                                {t('migration.targetEntity')}
                                            </label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[32rem] overflow-y-auto pr-4 custom-scrollbar">
                                                {entityOptions.map(opt => (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() => { setCsvType(opt.value); setMsg(null); }}
                                                        className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all duration-300 text-left group ${
                                                            csvType === opt.value 
                                                                ? 'bg-white border-blue-600 shadow-xl shadow-blue-500/5 ring-4 ring-blue-500/5' 
                                                                : 'bg-slate-50/30 border-transparent hover:border-slate-200 hover:bg-white'
                                                        }`}
                                                    >
                                                        <div className={`p-3 rounded-xl transition-all duration-300 ${csvType === opt.value ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-400 group-hover:text-blue-500 shadow-sm'}`}>
                                                            <opt.icon size={20} strokeWidth={2.5} />
                                                        </div>
                                                        <span className={`text-xs font-black uppercase tracking-tight ${csvType === opt.value ? 'text-slate-900' : 'text-slate-500'}`}>{opt.label}</span>
                                                        {csvType === opt.value && <div className="ml-auto w-2 h-2 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.5)]" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Modo de Importação CSV Redesenhado */}
                                        <div className="p-8 rounded-[2.5rem] bg-slate-50/50 border border-slate-100 space-y-8">
                                            <div className="flex items-center gap-3 text-slate-800">
                                                <Settings size={18} className="text-slate-400" />
                                                <h4 className="text-[10px] font-black uppercase tracking-widest">{t('migration.csv.importOptions')}</h4>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {[
                                                    { id: 'APPEND', label: t('migration.csv.appendLabel'), desc: t('migration.csv.appendHint'), icon: FileUp, color: 'blue' },
                                                    { id: 'UPDATE', label: t('migration.csv.updateLabel'), desc: t('migration.csv.updateHint'), icon: RefreshCw, color: 'cyan' },
                                                ].map((mode) => (
                                                    <button
                                                        key={mode.id}
                                                        onClick={() => setImportMode(mode.id as any)}
                                                        className={`p-5 rounded-2xl border-2 text-left transition-all duration-500 ${
                                                            (importMode === mode.id || (mode.id === 'APPEND' && importMode === 'REPLACE'))
                                                                ? `bg-white border-${mode.color}-500 shadow-xl ring-4 ring-${mode.color}-500/5` 
                                                                : 'bg-transparent border-slate-100 hover:border-slate-200'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <mode.icon size={16} strokeWidth={3} className={importMode === mode.id ? `text-${mode.color}-600` : 'text-slate-400'} />
                                                            <span className={`text-xs font-black uppercase tracking-widest ${importMode === mode.id ? `text-${mode.color}-700` : 'text-slate-500'}`}>{mode.label}</span>
                                                        </div>
                                                        <p className="text-[10px] font-bold text-slate-400 leading-relaxed">{mode.desc}</p>
                                                    </button>
                                                ))}
                                            </div>

                                            {csvType === 'TRIGGERS' && (
                                                <label htmlFor={`${idPrefix}-csv-inherit`} className="flex items-center gap-5 p-5 rounded-[2rem] bg-blue-50 border border-blue-100 cursor-pointer group transition-all hover:bg-blue-100/50 shadow-sm">
                                                    <div className="relative flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            id={`${idPrefix}-csv-inherit`}
                                                            checked={inheritHierarchy}
                                                            onChange={e => setInheritHierarchy(e.target.checked)}
                                                            className="w-6 h-6 rounded-xl border-slate-300 text-blue-600 focus:ring-4 focus:ring-blue-500/10 cursor-pointer"
                                                        />
                                                    </div>
                                                    <div>
                                                        <span className="text-xs font-black text-blue-900 uppercase tracking-tight">{t('migration.csv.inheritHierarchy')}</span>
                                                        <p className="text-[10px] font-bold text-blue-600/60 leading-relaxed uppercase mt-0.5">{t('migration.csv.inheritHint')}</p>
                                                    </div>
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Coluna de Ações de Arquivo CSV */}
                            <div className="lg:col-span-5 space-y-8">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 px-2">Ações de Arquivo</label>
                                
                                <div className="bg-white rounded-[3rem] border border-slate-200/60 shadow-sm overflow-hidden group/actions">
                                    <div className="p-10 space-y-6">
                                        <button
                                            onClick={handleDownloadTemplate}
                                            className="w-full flex items-center gap-5 p-6 bg-slate-50/50 border border-slate-100 rounded-[2rem] hover:bg-white hover:shadow-2xl hover:shadow-blue-500/5 hover:border-blue-200 transition-all group text-left"
                                        >
                                            <div className="p-4 bg-white rounded-2xl shadow-sm text-slate-400 group-hover:text-blue-600 group-hover:scale-110 transition-all border border-slate-50">
                                                <FileDown size={28} />
                                            </div>
                                            <div className="flex-1">
                                                <span className="block font-black text-slate-800 text-sm uppercase tracking-tight">{t('migration.downloadTemplate')}</span>
                                                <span className="text-[10px] text-slate-400 uppercase font-black tracking-[0.15em] mt-1 block">Obter modelo estruturado</span>
                                            </div>
                                            <ChevronRight size={20} className="text-slate-300 group-hover:translate-x-2 transition-transform" strokeWidth={3} />
                                        </button>

                                        <button
                                            onClick={handleCsvExport}
                                            className="w-full flex items-center gap-5 p-6 bg-slate-50/50 border border-slate-100 rounded-[2rem] hover:bg-white hover:shadow-2xl hover:shadow-emerald-500/5 hover:border-emerald-200 transition-all group text-left"
                                        >
                                            <div className="p-4 bg-white rounded-2xl shadow-sm text-slate-400 group-hover:text-emerald-600 group-hover:scale-110 transition-all border border-slate-50">
                                                <Download size={28} />
                                            </div>
                                            <div className="flex-1">
                                                <span className="block font-black text-slate-800 text-sm uppercase tracking-tight">{t('migration.exportData')}</span>
                                                <span className="text-[10px] text-slate-400 uppercase font-black tracking-[0.15em] mt-1 block">Baixar dados existentes</span>
                                            </div>
                                            <ChevronRight size={20} className="text-slate-300 group-hover:translate-x-2 transition-transform" strokeWidth={3} />
                                        </button>

                                        <div className="relative group pt-6">
                                            <input
                                                type="file"
                                                id="csv_file_import"
                                                ref={csvInputRef}
                                                onChange={handleCsvImport}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                accept=".csv"
                                            />
                                            <div className="flex items-center gap-6 p-10 bg-blue-600 rounded-[2.5rem] shadow-2xl shadow-blue-600/20 group-hover:bg-blue-700 group-hover:scale-[1.02] transition-all text-left">
                                                <div className="p-5 bg-white/10 rounded-[1.5rem] text-white shadow-inner">
                                                    <FileUp size={36} strokeWidth={2.5} />
                                                </div>
                                                <div className="flex-1">
                                                    <span className="block font-black text-white text-xl tracking-tight uppercase italic">{t('migration.importCsv')}</span>
                                                    <span className="text-[10px] text-blue-100 font-black uppercase tracking-widest opacity-70 mt-1 block tracking-[0.2em]">Clique para selecionar</span>
                                                </div>
                                                <ChevronRight size={24} className="text-blue-200 group-hover:translate-x-2 transition-transform" strokeWidth={3} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 p-8 border-t border-slate-100 flex gap-4">
                                        <div className="p-2 bg-white rounded-lg shadow-sm text-slate-400"><Info size={18} /></div>
                                        <p className="text-[11px] text-slate-500 leading-relaxed font-bold uppercase tracking-tight">
                                            Nota: Utilize codificação UTF-8 e separador ponto e vírgula (;) para máxima compatibilidade com Excel.
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
