/**
 * Proposta: Vista de Migração e Gestão de Backup (JSON/CSV).
 * Fluxo: Orquestra a importação e exportação de dados, permitindo restaurações completas, atualizações de lote e gerenciamento de taxonomia via arquivos externos.
 */

import React, { useState, useRef, useMemo } from 'react';
import { Upload, Download, FileSpreadsheet, Database, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
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
                // Detecta caracteres inválidos para tentar recuperação via windows-1252
                if (content.includes('\uFFFD')) { 
                    console.log("Problemas de codificação detectados, tentando windows-1252...");
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
                console.log('🔄 Sincronizando dados via API...', importMode, selectedTaxonomies);
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
            // Garante que o backup contenha dados completos (full export), ignorando otimizações de tela
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
            // Força a busca de dados completos se a entidade alvo for Análises (RCA)
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
            // CSV não suporta REPLACE por natureza plana; converte para APPEND se selecionado
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
        <div className="p-8 max-w-[1600px] mx-auto animate-in fade-in pb-32">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{t('migration.title')}</h1>
            <p className="text-slate-500 mb-8">{t('migration.description')}</p>

            {/* Abas de Formato */}
            <div className="flex border-b border-slate-200 mb-8">
                <button
                    onClick={() => { setActiveTab('JSON'); setMsg(null); }}
                    className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'JSON' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    {t('migration.backup')}
                </button>
                <button
                    onClick={() => { setActiveTab('CSV'); setMsg(null); }}
                    className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'CSV' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    {t('migration.csvTools')}
                </button>
            </div>

            {/* Mensagens de Feedback */}
            {msg && (
                <div className={`mb-6 p-4 border rounded-lg flex items-center gap-3 ${msg.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    {msg.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                    <span className="font-medium">{msg.text}</span>
                </div>
            )}

            {activeTab === 'JSON' ? (
                <div className="space-y-8">
                    {/* 1. Upload de Arquivo Backup */}
                    {!previewData && (
                        <div className="bg-white p-12 rounded-xl border-2 border-dashed border-slate-300 shadow-sm text-center hover:border-blue-400 hover:bg-slate-50 transition-all cursor-pointer relative group">
                            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600 group-hover:scale-110 transition-transform">
                                <Upload size={40} />
                            </div>
                            <h3 className="text-2xl font-semibold mb-2 text-slate-800">{t('migration.restore')}</h3>
                            <p className="text-slate-500 mb-8">{t('migration.json.dragDrop')}</p>
                            <div className="relative inline-block">
                                <input
                                    type="file"
                                    ref={jsonInputRef}
                                    onChange={handleJsonFileSelect}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    accept=".json"
                                />
                                <button className="bg-blue-600 text-white font-medium py-3 px-8 rounded-lg shadow-md hover:bg-blue-700 transition-colors pointer-events-none">
                                    {t('migration.json.selectButton')}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* 2. Configuração de Importação (Visível após análise do arquivo) */}
                    {previewData && (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                            <div className="bg-slate-50 p-6 border-b border-slate-200 flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">{t('migration.importConfig')}</h3>
                                    <p className="text-sm text-slate-500">
                                        {t('migration.json.foundInfo').replace('{0}', String(previewData.records?.length || 0)).replace('{1}', String(previewData.actions?.length || 0))}
                                    </p>
                                </div>
                                <button
                                    onClick={() => { setPreviewData(null); if (jsonInputRef.current) jsonInputRef.current.value = ''; }}
                                    className="text-sm text-red-600 hover:underline"
                                >
                                    {t('migration.json.changeFile')}
                                </button>
                            </div>

                            <div className="p-8 space-y-8">
                                {/* Seleção de Modo */}
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b pb-2">{t('migration.json.modeTitle')}</h4>
                                    <div className="flex gap-6">
                                        <label className={`flex-1 p-4 rounded-lg border cursor-pointer transition-all ${importMode === 'APPEND' ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                                            <div className="flex items-center gap-3 mb-2">
                                                <input type="radio" name="jsonMode" value="APPEND" checked={importMode === 'APPEND'} onChange={() => setImportMode('APPEND')} className="w-5 h-5 text-blue-600 focus:ring-blue-500" />
                                                <span className="font-semibold text-slate-800">{t('migration.modes.append')}</span>
                                            </div>
                                            <p className="text-xs text-slate-500 pl-8">{t('migration.json.modeDescriptions.append')}</p>
                                        </label>
                                        <label className={`flex-1 p-4 rounded-lg border cursor-pointer transition-all ${importMode === 'UPDATE' ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                                            <div className="flex items-center gap-3 mb-2">
                                                <input type="radio" name="jsonMode" value="UPDATE" checked={importMode === 'UPDATE'} onChange={() => setImportMode('UPDATE')} className="w-5 h-5 text-blue-600 focus:ring-blue-500" />
                                                <span className="font-semibold text-slate-800">{t('migration.modes.update')}</span>
                                            </div>
                                            <p className="text-xs text-slate-500 pl-8">{t('migration.json.modeDescriptions.update')}</p>
                                        </label>
                                        <label className={`flex-1 p-4 rounded-lg border cursor-pointer transition-all ${importMode === 'REPLACE' ? 'bg-red-50 border-red-500 ring-1 ring-red-500' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                                            <div className="flex items-center gap-3 mb-2">
                                                <input type="radio" name="jsonMode" value="REPLACE" checked={importMode === 'REPLACE'} onChange={() => setImportMode('REPLACE')} className="w-5 h-5 text-red-600 focus:ring-red-500" />
                                                <span className="font-semibold text-red-800">{t('migration.modes.replace')}</span>
                                            </div>
                                            <p className="text-xs text-red-600 pl-8">⚠️ {t('migration.json.modeDescriptions.replace')}</p>
                                        </label>
                                    </div>
                                </div>

                                {/* Seleção Granular de Taxonomia */}
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b pb-2">{t('migration.json.taxonomyTitle')}</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {[
                                            { key: 'analysisTypes', label: t('settings.analysisTypes') },
                                            { key: 'analysisStatuses', label: t('settings.analysisStatuses') },
                                            { key: 'specialties', label: t('settings.specialties') },
                                            { key: 'failureModes', label: t('settings.failureModes') },
                                            { key: 'failureCategories', label: t('settings.failureCategories') },
                                            { key: 'componentTypes', label: t('settings.componentTypes') },
                                            { key: 'rootCauseMs', label: t('settings.rootCauseMs') },
                                            { key: 'triggerStatuses', label: t('settings.triggerStatuses') }
                                        ].map(item => (
                                            <label key={item.key} className="flex items-center gap-3 p-3 bg-slate-50 rounded border border-slate-200 cursor-pointer hover:bg-slate-100">
                                                <input
                                                    type="checkbox"
                                                    checked={!!taxonomySelection[item.key]}
                                                    onChange={() => toggleTaxonomy(item.key)}
                                                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                                />
                                                <span className="text-sm text-slate-700">{item.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <div className="mt-3 flex gap-4 text-xs">
                                        <button onClick={() => setTaxonomySelection(prev => Object.keys(prev).reduce((acc, k) => ({ ...acc, [k]: true }), {}))} className="text-blue-600 hover:underline">{t('migration.json.selectAll')}</button>
                                        <button onClick={() => setTaxonomySelection(prev => Object.keys(prev).reduce((acc, k) => ({ ...acc, [k]: false }), {}))} className="text-slate-500 hover:underline">{t('migration.json.deselectAll')}</button>
                                    </div>
                                </div>

                                {/* Ações Finais */}
                                <div className="flex justify-end pt-4 gap-4">
                                    <button
                                        onClick={() => setPreviewData(null)}
                                        className="px-6 py-3 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                                    >
                                        {t('migration.cancel')}
                                    </button>
                                    <button
                                        onClick={executeImport}
                                        className="px-8 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                                    >
                                        <RefreshCw size={20} />
                                        {t('migration.json.initializeButton')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Bloco de Exportação */}
                    {!previewData && (
                        <div className="mt-12 pt-12 border-t border-slate-100 text-center">
                            <h3 className="text-lg font-semibold mb-2 text-slate-800">{t('migration.json.createBackup')}</h3>
                            <button onClick={handleJsonDownload} className="inline-flex items-center gap-2 text-indigo-600 font-medium hover:text-indigo-800 py-2 px-4 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors">
                                <Download size={20} />
                                {t('migration.json.downloadButton')}
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-start gap-4 mb-8">
                        <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                            <FileSpreadsheet size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">{t('migration.csvTools')}</h3>
                            <p className="text-slate-500 text-sm">{t('migration.csv.description')}</p>
                        </div>
                    </div>

                    <div className="mb-6">
                        <label htmlFor="csv_target_entity" className="block text-sm font-medium text-slate-700 mb-2">
                            {t('migration.targetEntity')}
                        </label>
                        <select
                            id="csv_target_entity"
                            name="csv_target_entity"
                            className="block w-full max-w-2xl p-2.5 bg-white border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-900 shadow-sm transition-all"
                            value={csvType}
                            onChange={e => { setCsvType(e.target.value as CsvEntityType); setMsg(null); }}
                        >
                            {entityOptions.map(opt => (
                                <option key={opt.value} value={opt.value} className="py-2">
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Opções de Importação de Gatilhos */}
                    {csvType === 'TRIGGERS' && (
                        <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                            <h4 className="text-sm font-semibold text-slate-800 mb-3">{t('migration.csv.importOptions')}</h4>
                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-8">
                                <div className="flex items-center gap-4">
                                    <span className="text-sm text-slate-600">{t('migration.csv.modeLabel')}</span>
                                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                        <input
                                            type="radio"
                                            id="csv_mode_append"
                                            name="csvMode"
                                            value="APPEND"
                                            checked={importMode === 'APPEND' || importMode === 'REPLACE'}
                                            onChange={() => setImportMode('APPEND')}
                                            className="text-blue-600 focus:ring-blue-500"
                                        />
                                        {t('migration.csv.appendLabel')}
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                        <input
                                            type="radio"
                                            id="csv_mode_update"
                                            name="csvMode"
                                            value="UPDATE"
                                            checked={importMode === 'UPDATE'}
                                            onChange={() => setImportMode('UPDATE')}
                                            className="text-blue-600 focus:ring-blue-500"
                                        />
                                        {t('migration.csv.updateLabel')}
                                    </label>
                                </div>

                                <div className="flex items-center gap-2">
                                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            id="csv_inherit_hierarchy"
                                            name="csv_inherit_hierarchy"
                                            checked={inheritHierarchy}
                                            onChange={e => setInheritHierarchy(e.target.checked)}
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        {t('migration.csv.inheritHierarchy')}
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 pt-6">
                        <button
                            onClick={handleDownloadTemplate}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
                        >
                            <FileSpreadsheet size={18} /> {t('migration.downloadTemplate')}
                        </button>

                        <button
                            onClick={handleCsvExport}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-medium transition-colors"
                        >
                            <Database size={18} /> {t('migration.exportData')}
                        </button>
                        <div className="relative">
                            <input
                                type="file"
                                id="csv_file_import"
                                name="csv_file_import"
                                aria-label={t('migration.importCsv')}
                                ref={csvInputRef}
                                onChange={handleCsvImport}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                accept=".csv"
                            />
                            <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm pointer-events-none">
                                <Upload size={18} /> {t('migration.importCsv')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};