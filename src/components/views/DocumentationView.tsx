
/**
 * Proposta: Central de Documentação e Treinamento do Sistema.
 * Fluxo: Renderiza guias interativos sobre a arquitetura do projeto, fluxos de trabalho e integrações disponíveis, consumindo conteúdos do dicionário de tradução.
 */

import React from 'react';
import { Book, Database, Server, Share2, ShieldCheck, Cpu, Layers, FileJson, Workflow } from 'lucide-react';

import { useLanguage } from '../../context/LanguageDefinition';

export const DocumentationView: React.FC = () => {
    const { t } = useLanguage();
    return (
        <div className="p-8 max-w-[1600px] mx-auto animate-in fade-in space-y-8 pb-20">
            <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 pb-6">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg">
                    <Book size={32} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('documentation.title')}</h1>
                    <p className="text-slate-500 dark:text-slate-400">{t('documentation.subtitle')}</p>
                </div>
            </div>

            {/* 1. Arquitetura */}
            <section className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800">
                <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <Server className="text-blue-600 dark:text-blue-400" size={24} />
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">1. {t('documentation.sections.architecture')}</h2>
                </div>
                <div className="space-y-4 text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                    <p>
                        {t('documentation.architecture.p1')}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                        <div className="space-y-2">
                            <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2"><Database size={16} /> {t('documentation.architecture.entitiesTitle')}</h3>
                            <ul className="list-disc pl-5 space-y-1 marker:text-blue-400">
                                <li><strong>{t('documentation.architecture.rcaRecordLabel')}:</strong> {t('documentation.architecture.rcaRecord')}</li>
                                <li><strong>{t('documentation.architecture.assetNodeLabel')}:</strong> {t('documentation.architecture.assetNode')}</li>
                                <li><strong>{t('documentation.architecture.actionRecordLabel')}:</strong> {t('documentation.architecture.actionRecord')}</li>
                            </ul>
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2"><Layers size={16} /> {t('documentation.architecture.stateTitle')}</h3>
                            <ul className="list-disc pl-5 space-y-1 marker:text-blue-400">
                                <li><strong>{t('documentation.architecture.contextApiLabel')}:</strong> {t('documentation.architecture.contextApi')}</li>
                                <li><strong>{t('documentation.architecture.viewModelsLabel')}:</strong> {t('documentation.architecture.viewModels')}</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* 2. Workflow */}
            <section className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800">
                <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <Workflow className="text-green-600 dark:text-green-400" size={24} />
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">2. {t('documentation.sections.workflow')}</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="relative border-l-2 border-slate-200 dark:border-slate-700 ml-2 space-y-8 pl-6 py-2">
                        <div className="relative">
                            <span className="absolute -left-[33px] top-1 w-4 h-4 rounded-full bg-blue-500 ring-4 ring-white dark:ring-slate-900"></span>
                            <h3 className="font-bold text-slate-900 dark:text-white">{t('documentation.workflow.step1Title')}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                {t('documentation.workflow.step1Desc')}
                            </p>
                        </div>
                        <div className="relative">
                            <span className="absolute -left-[33px] top-1 w-4 h-4 rounded-full bg-indigo-500 ring-4 ring-white dark:ring-slate-900"></span>
                            <h3 className="font-bold text-slate-900 dark:text-white">{t('documentation.workflow.step2Title')}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                {t('documentation.workflow.step2Desc')}
                            </p>
                        </div>
                        <div className="relative">
                            <span className="absolute -left-[33px] top-1 w-4 h-4 rounded-full bg-green-500 ring-4 ring-white dark:ring-slate-900"></span>
                            <h3 className="font-bold text-slate-900 dark:text-white">{t('documentation.workflow.step3Title')}</h3>
                            <p className="text-sm text-slate-500 mt-1">
                            </p>
                        </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-100 dark:border-slate-700 text-sm space-y-4">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2"><ShieldCheck size={16} /> {t('documentation.workflow.validationTitle')}</h3>
                        <ul className="space-y-3">
                            <li className="flex gap-2">
                                <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                                    {t('workflow.tags.hra')}
                                </span>
                                <span className="text-slate-600 dark:text-slate-300">{t('documentation.workflow.hraTag')}</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-[10px] font-bold px-1.5 py-0.5 rounded border border-yellow-200 dark:border-yellow-800">
                                    {t('workflow.tags.draft')}
                                </span>
                                <span className="text-slate-600 dark:text-slate-300">{t('documentation.workflow.draftTag')}</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                                    {t('workflow.tags.link')}
                                </span>
                                <span className="text-slate-600 dark:text-slate-300">{t('documentation.workflow.linkTag')}</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* 3. Integrações */}
            <section className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800">
                <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <Share2 className="text-indigo-600 dark:text-indigo-400" size={24} />
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">3. {t('documentation.sections.integrations')}</h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="p-4 rounded-lg border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/50 dark:bg-indigo-900/10">
                        <div className="flex items-center gap-2 mb-2 text-indigo-800 dark:text-indigo-300 font-bold">
                            <Cpu size={18} />
                            <h3>{t('documentation.integrations.geminiTitle')}</h3>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                            {t('documentation.integrations.geminiDesc')}
                        </p>
                        <ul className="text-xs text-slate-500 dark:text-slate-400 list-disc pl-4 space-y-1">
                            <li>{t('documentation.integrations.geminiItem1')}</li>
                            <li>{t('documentation.integrations.geminiItem2')}</li>
                            <li>{t('documentation.integrations.geminiItem3')}</li>
                        </ul>
                    </div>

                    <div className="p-4 rounded-lg border border-blue-100 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-900/10">
                        <div className="flex items-center gap-2 mb-2 text-blue-800 dark:text-blue-300 font-bold">
                            <FileJson size={18} />
                            <h3>{t('documentation.integrations.jsonTitle')}</h3>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                            {t('documentation.integrations.jsonDesc')}
                        </p>
                        <ul className="text-xs text-slate-500 dark:text-slate-400 list-disc pl-4 space-y-1">
                            <li>{t('documentation.integrations.jsonItem1')}</li>
                            <li>{t('documentation.integrations.jsonItem2')}</li>
                            <li>{t('documentation.integrations.jsonItem3')}</li>
                        </ul>
                    </div>

                    <div className="p-4 rounded-lg border border-green-100 dark:border-green-900/30 bg-green-50/50 dark:bg-green-900/10">
                        <div className="flex items-center gap-2 mb-2 text-green-800 dark:text-green-300 font-bold">
                            <FileJson size={18} />
                            <h3>{t('documentation.integrations.csvTitle')}</h3>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                            {t('documentation.integrations.csvDesc')}
                        </p>
                        <ul className="text-xs text-slate-500 dark:text-slate-400 list-disc pl-4 space-y-1">
                            <li>{t('documentation.integrations.csvItem1')}</li>
                            <li>{t('documentation.integrations.csvItem2')}</li>
                            <li>{t('documentation.integrations.csvItem3')}</li>
                        </ul>
                    </div>
                </div>
            </section>

            <div className="text-center pt-8 border-t border-slate-200 dark:border-slate-800">
                <p className="text-slate-400 dark:text-slate-600 text-xs">
                    {t('documentation.footer')}
                </p>
            </div>
        </div>
    );
};
