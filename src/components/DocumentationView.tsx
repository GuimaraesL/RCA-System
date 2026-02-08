
import React from 'react';
import { Book, Database, Server, Share2, ShieldCheck, Cpu, Layers, FileJson, Workflow } from 'lucide-react';

import { useLanguage } from '../context/LanguageDefinition';

export const DocumentationView: React.FC = () => {
    const { t } = useLanguage();
    return (
        <div className="p-8 max-w-[1600px] mx-auto animate-in fade-in space-y-8 pb-20">
            <div className="flex items-center gap-3 border-b border-slate-200 pb-6">
                <div className="p-3 bg-blue-100 text-blue-700 rounded-lg">
                    <Book size={32} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">{t('documentation.title')}</h1>
                    <p className="text-slate-500">{t('documentation.subtitle')}</p>
                </div>
            </div>

            {/* 1. Arquitetura */}
            <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                    <Server className="text-blue-600" size={24} />
                    <h2 className="text-xl font-bold text-slate-800">1. {t('documentation.sections.architecture')}</h2>
                </div>
                <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
                    <p>
                        {t('documentation.architecture.p1')}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                        <div className="space-y-2">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2"><Database size={16} /> {t('documentation.architecture.entitiesTitle')}</h3>
                            <ul className="list-disc pl-5 space-y-1 marker:text-blue-400">
                                <li><strong>{t('documentation.architecture.rcaRecordLabel')}:</strong> {t('documentation.architecture.rcaRecord')}</li>
                                <li><strong>{t('documentation.architecture.assetNodeLabel')}:</strong> {t('documentation.architecture.assetNode')}</li>
                                <li><strong>{t('documentation.architecture.actionRecordLabel')}:</strong> {t('documentation.architecture.actionRecord')}</li>
                            </ul>
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2"><Layers size={16} /> {t('documentation.architecture.stateTitle')}</h3>
                            <ul className="list-disc pl-5 space-y-1 marker:text-blue-400">
                                <li><strong>{t('documentation.architecture.contextApiLabel')}:</strong> {t('documentation.architecture.contextApi')}</li>
                                <li><strong>{t('documentation.architecture.viewModelsLabel')}:</strong> {t('documentation.architecture.viewModels')}</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* 2. Workflow */}
            <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                    <Workflow className="text-green-600" size={24} />
                    <h2 className="text-xl font-bold text-slate-800">2. {t('documentation.sections.workflow')}</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="relative border-l-2 border-slate-200 ml-2 space-y-8 pl-6 py-2">
                        <div className="relative">
                            <span className="absolute -left-[33px] top-1 w-4 h-4 rounded-full bg-blue-500 ring-4 ring-white"></span>
                            <h3 className="font-bold text-slate-900">{t('documentation.workflow.step1Title')}</h3>
                            <p className="text-sm text-slate-500 mt-1">
                                {t('documentation.workflow.step1Desc')}
                            </p>
                        </div>
                        <div className="relative">
                            <span className="absolute -left-[33px] top-1 w-4 h-4 rounded-full bg-indigo-500 ring-4 ring-white"></span>
                            <h3 className="font-bold text-slate-900">{t('documentation.workflow.step2Title')}</h3>
                            <p className="text-sm text-slate-500 mt-1">
                                {t('documentation.workflow.step2Desc')}
                            </p>
                        </div>
                        <div className="relative">
                            <span className="absolute -left-[33px] top-1 w-4 h-4 rounded-full bg-green-500 ring-4 ring-white"></span>
                            <h3 className="font-bold text-slate-900">{t('documentation.workflow.step3Title')}</h3>
                            <p className="text-sm text-slate-500 mt-1">
                                {t('documentation.workflow.step3Desc')}
                            </p>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm space-y-4">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2"><ShieldCheck size={16} /> {t('documentation.workflow.validationTitle')}</h3>
                        <ul className="space-y-3">
                            <li className="flex gap-2">
                                <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-purple-200">
                                    {t('workflow.tags.hra')}
                                </span>
                                <span className="text-slate-600">{t('documentation.workflow.hraTag')}</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-yellow-200">
                                    {t('workflow.tags.draft')}
                                </span>
                                <span className="text-slate-600">{t('documentation.workflow.draftTag')}</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-200">
                                    {t('workflow.tags.link')}
                                </span>
                                <span className="text-slate-600">{t('documentation.workflow.linkTag')}</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* 3. Integrações */}
            <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                    <Share2 className="text-purple-600" size={24} />
                    <h2 className="text-xl font-bold text-slate-800">3. {t('documentation.sections.integrations')}</h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="p-4 rounded-lg border border-purple-100 bg-purple-50/50">
                        <div className="flex items-center gap-2 mb-2 text-purple-800 font-bold">
                            <Cpu size={18} />
                            <h3>{t('documentation.integrations.geminiTitle')}</h3>
                        </div>
                        <p className="text-xs text-slate-600 mb-3">
                            {t('documentation.integrations.geminiDesc')}
                        </p>
                        <ul className="text-xs text-slate-500 list-disc pl-4 space-y-1">
                            <li>{t('documentation.integrations.geminiItem1')}</li>
                            <li>{t('documentation.integrations.geminiItem2')}</li>
                            <li>{t('documentation.integrations.geminiItem3')}</li>
                        </ul>
                    </div>

                    <div className="p-4 rounded-lg border border-blue-100 bg-blue-50/50">
                        <div className="flex items-center gap-2 mb-2 text-blue-800 font-bold">
                            <FileJson size={18} />
                            <h3>{t('documentation.integrations.jsonTitle')}</h3>
                        </div>
                        <p className="text-xs text-slate-600 mb-3">
                            {t('documentation.integrations.jsonDesc')}
                        </p>
                        <ul className="text-xs text-slate-500 list-disc pl-4 space-y-1">
                            <li>{t('documentation.integrations.jsonItem1')}</li>
                            <li>{t('documentation.integrations.jsonItem2')}</li>
                            <li>{t('documentation.integrations.jsonItem3')}</li>
                        </ul>
                    </div>

                    <div className="p-4 rounded-lg border border-green-100 bg-green-50/50">
                        <div className="flex items-center gap-2 mb-2 text-green-800 font-bold">
                            <FileJson size={18} />
                            <h3>{t('documentation.integrations.csvTitle')}</h3>
                        </div>
                        <p className="text-xs text-slate-600 mb-3">
                            {t('documentation.integrations.csvDesc')}
                        </p>
                        <ul className="text-xs text-slate-500 list-disc pl-4 space-y-1">
                            <li>{t('documentation.integrations.csvItem1')}</li>
                            <li>{t('documentation.integrations.csvItem2')}</li>
                            <li>{t('documentation.integrations.csvItem3')}</li>
                        </ul>
                    </div>
                </div>
            </section>

            <div className="text-center pt-8 border-t border-slate-200">
                <p className="text-slate-400 text-xs">
                    {t('documentation.footer')}
                </p>
            </div>
        </div>
    );
};
