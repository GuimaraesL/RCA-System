/**
 * Proposta: Menu lateral de navegação (Sidebar) responsivo.
 * Fluxo: Controla a alternância entre as visões principais do sistema, gerencia o estado de colapso para desktop e o menu flutuante (drawer) para dispositivos móveis.
 */

import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Database, Settings, Upload, AlertTriangle, List, CheckSquare, Siren, ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import { useLanguage } from '../context/LanguageDefinition';
import { LanguageSelector } from './LanguageSelector';
import { safeGetItem, safeSetItem } from '../services/storageService';

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
        const stored = safeGetItem<boolean>('rca_app_v1_pref_sidebar_collapsed', 'rca_sidebar_collapsed', false);
        if (stored !== null) setIsCollapsed(stored);
    }, []);

    const toggleCollapse = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        safeSetItem('rca_app_v1_pref_sidebar_collapsed', newState);
    };

    const toggleMobile = () => setIsMobileOpen(!isMobileOpen);

    const NavItem = ({ id, icon: Icon, label }: { id: string, icon: any, label: string }) => (
        <button
            onClick={() => {
                setView(id);
                setIsMobileOpen(false); // Fecha o menu mobile ao selecionar um item
            }}
            className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm tracking-tight
                ${view === id 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}
                ${isCollapsed ? 'justify-center px-2' : ''}
            `}
            title={isCollapsed ? label : ''}
        >
            <Icon size={20} className={`flex-shrink-0 ${view === id ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'}`} />
            {!isCollapsed && <span>{label}</span>}
        </button>
    );

    return (
        <>
            {/* Gatilho do Menu Mobile */}
            <button 
                onClick={toggleMobile}
                className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-slate-900 text-white rounded-xl shadow-xl border border-slate-800"
            >
                <Menu size={24} />
            </button>

            {/* Container da Sidebar */}
            <aside className={`
                fixed lg:static inset-y-0 left-0 z-40 bg-slate-900 text-slate-300 flex flex-col transition-all duration-300 ease-in-out shadow-2xl
                ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                ${isCollapsed ? 'lg:w-24' : 'lg:w-72'}
                w-72 flex-shrink-0 border-r border-slate-800
            `}>
                {/* Cabeçalho do Logotipo */}
                <div className={`p-8 border-b border-slate-800/50 flex ${isCollapsed ? 'flex-col items-center gap-6' : 'items-center justify-between'}`}>
                    <div className="flex items-center gap-3 text-white font-black text-xl overflow-hidden tracking-tighter font-display">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20 flex-shrink-0">
                            <AlertTriangle size={22} className="text-white" />
                        </div>
                        {!isCollapsed && <span className="whitespace-nowrap uppercase">{t('common.appTitle')}</span>}
                    </div>
                    
                    {/* Botão de Colapso Desktop (Oculto em Mobile) */}
                    <button onClick={toggleCollapse} className="hidden lg:flex p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-all active:scale-95 border border-transparent hover:border-slate-700">
                        {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                    </button>
                </div>

                {/* Navegação Principal */}
                <nav className="flex-1 p-6 space-y-3 overflow-y-auto custom-scrollbar">
                    <div className="space-y-1">
                        {!isCollapsed && <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4 px-4">{t('sidebar.menu') || 'Navegação'}</p>}
                        <NavItem id="DASHBOARD" icon={LayoutDashboard} label={t('sidebar.dashboard')} />
                        <NavItem id="TRIGGERS" icon={Siren} label={t('sidebar.triggers')} />
                        <NavItem id="ANALYSES" icon={List} label={t('sidebar.analyses')} />
                        <NavItem id="ACTIONS" icon={CheckSquare} label={t('sidebar.actions')} />
                        <NavItem id="ASSETS" icon={Database} label={t('sidebar.assets')} />
                    </div>

                    <div className="pt-6 mt-6 border-t border-slate-800/50 space-y-1">
                        {!isCollapsed && <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4 px-4">{t('sidebar.system') || 'Sistema'}</p>}
                        <NavItem id="SETTINGS" icon={Settings} label={t('sidebar.settings')} />
                        <NavItem id="MIGRATION" icon={Upload} label={t('sidebar.migration')} />
                    </div>
                </nav>

                {/* Rodapé e Seletor de Idioma */}
                <div className={`p-8 border-t border-slate-800/50 bg-slate-950/30 ${isCollapsed ? 'text-center flex flex-col items-center gap-6' : ''}`}>
                    <div className={isCollapsed ? "w-full flex justify-center" : ""}>
                        <LanguageSelector compact={isCollapsed} />
                    </div>
                    {!isCollapsed && (
                        <div className="mt-6 pt-6 border-t border-slate-800/30">
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                                <span>Engine v17.2</span>
                                <span className="px-1.5 py-0.5 bg-slate-800 rounded">R18</span>
                            </div>
                        </div>
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