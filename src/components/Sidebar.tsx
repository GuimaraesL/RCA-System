/**
 * Proposta: Menu lateral de navegação (Sidebar) responsivo.
 * Fluxo: Controla a alternância entre as visões principais do sistema, gerencia o estado de colapso para desktop e o menu flutuante (drawer) para dispositivos móveis.
 */

import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Database, Settings, Upload, AlertTriangle, List, CheckSquare, Siren, ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import { useLanguage } from '../context/LanguageDefinition';
import { LanguageSelector } from './LanguageSelector';

interface SidebarProps {
    view: 'DASHBOARD' | 'ANALYSES' | 'ACTIONS' | 'TRIGGERS' | 'ASSETS' | 'SETTINGS' | 'MIGRATION';
    setView: (view: any) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ view, setView }) => {
    const { t } = useLanguage();
    
    // Estado para controle de colapso (desktop) e abertura (mobile)
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    // Persistência da preferência de colapso no navegador
    useEffect(() => {
        const stored = localStorage.getItem('rca_sidebar_collapsed');
        if (stored) setIsCollapsed(JSON.parse(stored));
    }, []);

    const toggleCollapse = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem('rca_sidebar_collapsed', JSON.stringify(newState));
    };

    const toggleMobile = () => setIsMobileOpen(!isMobileOpen);

    const NavItem = ({ id, icon: Icon, label }: { id: string, icon: any, label: string }) => (
        <button
            onClick={() => {
                setView(id);
                setIsMobileOpen(false); // Fecha o menu mobile ao selecionar um item
            }}
            className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium
                ${view === id ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800'}
                ${isCollapsed ? 'justify-center px-2' : ''}
            `}
            title={isCollapsed ? label : ''}
        >
            <Icon size={20} className="flex-shrink-0" />
            {!isCollapsed && <span>{label}</span>}
        </button>
    );

    return (
        <>
            {/* Gatilho do Menu Mobile */}
            <button 
                onClick={toggleMobile}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-900 text-white rounded-md shadow-lg"
            >
                <Menu size={24} />
            </button>

            {/* Container da Sidebar */}
            <aside className={`
                fixed lg:static inset-y-0 left-0 z-40 bg-slate-900 text-slate-300 flex flex-col transition-all duration-300 ease-in-out shadow-xl
                ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
                w-64 flex-shrink-0
            `}>
                {/* Cabeçalho do Logotipo */}
                <div className={`p-6 border-b border-slate-800 flex ${isCollapsed ? 'flex-col items-center gap-4' : 'items-center justify-between'}`}>
                    <div className="flex items-center gap-2 text-white font-bold text-lg overflow-hidden">
                        <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center shadow-lg shadow-blue-900/50 flex-shrink-0">
                            <AlertTriangle size={18} className="text-white" />
                        </div>
                        {!isCollapsed && <span className="whitespace-nowrap">{t('common.appTitle')}</span>}
                    </div>
                    
                    {/* Botão de Colapso Desktop (Oculto em Mobile) */}
                    <button onClick={toggleCollapse} className="hidden lg:block text-slate-500 hover:text-white transition-transform active:scale-90">
                        {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                    </button>
                </div>

                {/* Navegação Principal */}
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
                    <NavItem id="DASHBOARD" icon={LayoutDashboard} label={t('sidebar.dashboard')} />
                    <NavItem id="TRIGGERS" icon={Siren} label={t('sidebar.triggers')} />
                    <NavItem id="ANALYSES" icon={List} label={t('sidebar.analyses')} />
                    <NavItem id="ACTIONS" icon={CheckSquare} label={t('sidebar.actions')} />
                    <NavItem id="ASSETS" icon={Database} label={t('sidebar.assets')} />

                    <div className="pt-4 mt-4 border-t border-slate-800">
                        <NavItem id="SETTINGS" icon={Settings} label={t('sidebar.settings')} />
                        <NavItem id="MIGRATION" icon={Upload} label={t('sidebar.migration')} />
                    </div>
                </nav>

                {/* Rodapé e Seletor de Idioma */}
                <div className={`p-6 border-t border-slate-800 text-xs text-slate-500 ${isCollapsed ? 'text-center' : ''}`}>
                    {isCollapsed ? (
                        <div className="flex flex-col gap-4 items-center">
                            <LanguageSelector compact />
                        </div>
                    ) : (
                        <>
                            v17.2 Context API<br />
                            {t('common.runningOn')} React 18
                            <div className="mt-4 pt-4 border-t border-slate-800">
                                <LanguageSelector />
                            </div>
                        </>
                    )}
                </div>
            </aside>

            {/* Overlay para Mobile */}
            {isMobileOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}
        </>
    );
};