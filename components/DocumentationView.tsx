
import React from 'react';
import { Book, Database, Server, Share2, ShieldCheck, Cpu, Layers, FileJson, Workflow } from 'lucide-react';

import { useLanguage } from '../context/LanguageDefinition';

export const DocumentationView: React.FC = () => {
    const { t } = useLanguage();
    return (
        <div className="p-8 max-w-5xl mx-auto animate-in fade-in space-y-8 pb-20">
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
                        O sistema adota uma arquitetura <strong>SPA (Single Page Application)</strong> desenvolvida em React 19, focada em performance e independência de backend (Serverless/Local-First).
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                        <div className="space-y-2">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2"><Database size={16} /> Modelo de Entidades</h3>
                            <ul className="list-disc pl-5 space-y-1 marker:text-blue-400">
                                <li><strong>RcaRecord:</strong> Agregado raiz que contém Metadados, 5W1H, 5 Porquês e Ishikawa.</li>
                                <li><strong>AssetNode:</strong> Árvore hierárquica recursiva (Área &gt; Equipamento &gt; Subgrupo) para localização técnica precisa.</li>
                                <li><strong>ActionRecord:</strong> Entidade independente para gestão de planos de ação (Box 1-4), vinculada por <code>rca_id</code>.</li>
                            </ul>
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2"><Layers size={16} /> Gerenciamento de Estado</h3>
                            <ul className="list-disc pl-5 space-y-1 marker:text-blue-400">
                                <li><strong>Context API:</strong> O <code>RcaProvider</code> atua como Single Source of Truth, sincronizando estado e LocalStorage.</li>
                                <li><strong>ViewModels:</strong> Camada de abstração nos Hooks (ex: <code>useActionsLogic</code>) para resolver relacionamentos (IDs para Nomes) em tempo de execução.</li>
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
                            <h3 className="font-bold text-slate-900">1. Definição e Localização</h3>
                            <p className="text-sm text-slate-500 mt-1">
                                Seleção obrigatória na Árvore de Ativos. Caso um ativo importado não exista, o sistema realiza <em>Fallback Resolution</em> buscando pelo ID na hierarquia carregada.
                            </p>
                        </div>
                        <div className="relative">
                            <span className="absolute -left-[33px] top-1 w-4 h-4 rounded-full bg-indigo-500 ring-4 ring-white"></span>
                            <h3 className="font-bold text-slate-900">2. Investigação Assistida</h3>
                            <p className="text-sm text-slate-500 mt-1">
                                Utilização dos 5 Porquês para desbloquear a Causa Raiz. O Diagrama de Ishikawa pode ser preenchido manualmente ou via <strong>IA Generativa</strong>.
                            </p>
                        </div>
                        <div className="relative">
                            <span className="absolute -left-[33px] top-1 w-4 h-4 rounded-full bg-green-500 ring-4 ring-white"></span>
                            <h3 className="font-bold text-slate-900">3. Ações e Validação</h3>
                            <p className="text-sm text-slate-500 mt-1">
                                Ações corretivas são gerenciadas globalmente. O status da análise só muda para "Concluída" se todos os campos mandatórios (incluindo Validação HRA se aplicável) estiverem preenchidos.
                            </p>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm space-y-4">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2"><ShieldCheck size={16} /> Protocolos de Validação</h3>
                        <ul className="space-y-3">
                            <li className="flex gap-2">
                                <span className="text-green-600 font-bold text-xs bg-green-100 px-2 py-0.5 rounded h-fit">HRA</span>
                                <span className="text-slate-600">Se a Causa Raiz for classificada como "Mão de Obra" ou "Método", o módulo de Confiabilidade Humana é ativado obrigatoriamente.</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-amber-600 font-bold text-xs bg-amber-100 px-2 py-0.5 rounded h-fit">DRAFT</span>
                                <span className="text-slate-600">Registros importados com status desconhecido ou "DRAFT" são sanitizados automaticamente para "Em Aberto" (STATUS-01).</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-blue-600 font-bold text-xs bg-blue-100 px-2 py-0.5 rounded h-fit">LINK</span>
                                <span className="text-slate-600">Planos de Ação possuem navegação bidirecional. Clicar no vínculo da RCA leva o usuário ao editor da análise específica.</span>
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
                            <h3>Gemini AI 2.5</h3>
                        </div>
                        <p className="text-xs text-slate-600 mb-3">
                            Integração nativa com <code>@google/genai</code>.
                        </p>
                        <ul className="text-xs text-slate-500 list-disc pl-4 space-y-1">
                            <li>Prompt Engineering Contextual (Ativo + Problema).</li>
                            <li>Saída estruturada em JSON (Strict Schema).</li>
                            <li>Inicialização Lazy (evita erros de Runtime).</li>
                        </ul>
                    </div>

                    <div className="p-4 rounded-lg border border-blue-100 bg-blue-50/50">
                        <div className="flex items-center gap-2 mb-2 text-blue-800 font-bold">
                            <FileJson size={18} />
                            <h3>JSON Engine</h3>
                        </div>
                        <p className="text-xs text-slate-600 mb-3">
                            Backup completo do sistema (Snapshot).
                        </p>
                        <ul className="text-xs text-slate-500 list-disc pl-4 space-y-1">
                            <li>Auto-discovery de Taxonomia.</li>
                            <li>Reconstrução da hierarquia de ativos.</li>
                            <li>Sanitização de XSS em strings.</li>
                        </ul>
                    </div>

                    <div className="p-4 rounded-lg border border-green-100 bg-green-50/50">
                        <div className="flex items-center gap-2 mb-2 text-green-800 font-bold">
                            <FileJson size={18} />
                            <h3>CSV Interop</h3>
                        </div>
                        <p className="text-xs text-slate-600 mb-3">
                            Compatibilidade com Excel/PowerBI.
                        </p>
                        <ul className="text-xs text-slate-500 list-disc pl-4 space-y-1">
                            <li>Detecção automática de delimitador (; ou ,).</li>
                            <li>Tratamento de UTF-8 com BOM.</li>
                            <li>Exportação de KPIs e Listas.</li>
                        </ul>
                    </div>
                </div>
            </section>

            <div className="text-center pt-8 border-t border-slate-200">
                <p className="text-slate-400 text-xs">
                    &copy; 2025 Global RCA System. Documentação gerada dinamicamente com base na versão v17.2.
                </p>
            </div>
        </div>
    );
};
