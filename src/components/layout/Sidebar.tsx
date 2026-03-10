/**
 * Proposta: Menu lateral de navegação (Sidebar) responsivo.
 * Fluxo: Controla a alternância entre as visões principais do sistema, gerencia o estado de colapso para desktop e o menu flutuante (drawer) para dispositivos móveis.
 */

import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Database, Settings, Upload, AlertTriangle, List, CheckSquare, Siren, ChevronLeft, ChevronRight, Menu, CircleHelp, Sun, Moon, Monitor } from 'lucide-react';
import { useLanguage } from '../../context/LanguageDefinition';
import { useTheme } from '../../context/ThemeContext';
import { LanguageSelector } from './LanguageSelector';
import { ShortcutLabel } from '../ui/ShortcutLabel';
import { safeGetItem, safeSetItem } from '../../services/storageService';

interface SidebarProps {
    view: 'DASHBOARD' | 'ANALYSES' | 'ACTIONS' | 'TRIGGERS' | 'ASSETS' | 'SETTINGS' | 'MIGRATION';
    setView: (view: any) => void;
    toggleRef?: React.RefObject<(() => void) | null>;
    onShowHelp?: () => void;
    isBlocked?: boolean;
}

const ThemeToggle = () => {
    const { theme, setTheme } = useTheme();
    const { t } = useLanguage();

    const cycleTheme = () => {
        if (theme === 'light') setTheme('dark');
        else if (theme === 'dark') setTheme('system');
        else setTheme('light');
    };

    return (
        <button
            onClick={cycleTheme}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-all active:scale-95 border border-transparent hover:border-slate-700"
            title={t(`settings.theme${theme.charAt(0).toUpperCase() + theme.slice(1)}`) || t('settings.toggleTheme')}
        >
            {theme === 'light' && <Sun size={20} />}
            {theme === 'dark' && <Moon size={20} />}
            {theme === 'system' && <Monitor size={20} />}
        </button>
    );
};

export const Sidebar: React.FC<SidebarProps> = ({ view, setView, toggleRef, onShowHelp, isBlocked }) => {
    const { t } = useLanguage();

    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    useEffect(() => {
        const stored = safeGetItem<boolean>('rca_app_v1_pref_sidebar_collapsed', 'rca_sidebar_collapsed', false);
        if (stored !== null) setIsCollapsed(stored);
    }, []);

    const toggleCollapse = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        safeSetItem('rca_app_v1_pref_sidebar_collapsed', newState);
    };

    useEffect(() => {
        if (toggleRef) {
            toggleRef.current = toggleCollapse;
        }
    });

    const toggleMobile = () => setIsMobileOpen(!isMobileOpen);

    const NavItem = ({ id, icon: Icon, label, shortcutLetter }: { id: string, icon: any, label: string, shortcutLetter?: string }) => (
        <button
            onClick={() => {
                setView(id);
                setIsMobileOpen(false);
            }}
            className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm tracking-tight
                ${view === id
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/20'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}
                ${isCollapsed ? 'justify-center px-2' : ''}
                disabled:opacity-20 disabled:cursor-not-allowed
            `}
            title={isCollapsed ? `${label} (Alt+${shortcutLetter?.toUpperCase() || ''})` : `Alt+${shortcutLetter?.toUpperCase() || ''}`}
            data-testid={`nav-${id}`}
            disabled={isBlocked}
        >
            <Icon size={20} className={`flex-shrink-0 ${view === id ? 'text-white' : 'text-slate-500 group-hover:text-primary-400'}`} />
            {!isCollapsed && <span className="flex-1 text-left"><ShortcutLabel text={label} shortcutLetter={shortcutLetter} /></span>}
        </button>
    );

    return (
        <>
            <button
                onClick={toggleMobile}
                className="lg:hidden fixed bottom-6 right-6 z-50 p-4 bg-primary-600 text-white rounded-full shadow-2xl shadow-primary-900/40 hover:bg-primary-700 hover:scale-105 transition-all border border-primary-500/50 flex items-center justify-center active:scale-95"
                aria-label={t('sidebar.menu')}
            >
                <Menu size={24} strokeWidth={3} />
            </button>

            <aside className={`
                fixed lg:static inset-y-0 left-0 z-40 bg-slate-900 text-slate-300 flex flex-col transition-all duration-300 ease-in-out shadow-2xl
                ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                ${isCollapsed ? 'lg:w-24' : 'lg:w-72'}
                w-72 flex-shrink-0 border-r border-slate-800
            `}>
                <div className={`p-8 border-b border-slate-800/50 flex ${isCollapsed ? 'flex-col items-center gap-6' : 'items-center justify-between'}`}>
                    <div className="flex items-center gap-3 text-white font-black text-xl overflow-hidden tracking-tighter font-display">
                        <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-600/20 flex-shrink-0">
                            <AlertTriangle size={22} className="text-white" />
                        </div>
                        {!isCollapsed && <span className="whitespace-nowrap uppercase">{t('common.appTitle')}</span>}
                    </div>

                    <button onClick={toggleCollapse} className="hidden lg:flex p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-all active:scale-95 border border-transparent hover:border-slate-700">
                        {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                    </button>
                </div>

                <nav className="flex-1 p-6 space-y-3 overflow-y-auto custom-scrollbar">
                    <div className="space-y-1">
                        {!isCollapsed && <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4 px-4">{t('sidebar.menu')}</p>}
                        <NavItem id="DASHBOARD" icon={LayoutDashboard} label={t('sidebar.dashboard')} shortcutLetter="D" />
                        <NavItem id="TRIGGERS" icon={Siren} label={t('sidebar.triggers')} shortcutLetter="T" />
                        <NavItem id="ANALYSES" icon={List} label={t('sidebar.analyses')} shortcutLetter="A" />
                        <NavItem id="ACTIONS" icon={CheckSquare} label={t('sidebar.actions')} shortcutLetter="P" />
                        <NavItem id="ASSETS" icon={Database} label={t('sidebar.assets')} shortcutLetter="H" />
                    </div>

                    <div className="pt-6 mt-6 border-t border-slate-800/50 space-y-1">
                        {!isCollapsed && <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4 px-4">{t('sidebar.system')}</p>}
                        <NavItem id="SETTINGS" icon={Settings} label={t('sidebar.settings')} shortcutLetter="C" />
                        <NavItem id="MIGRATION" icon={Upload} label={t('sidebar.migration')} shortcutLetter="M" />
                    </div>
                </nav>

                <div className={`p-8 border-t border-slate-800/50 bg-slate-950/30 ${isCollapsed ? 'text-center flex flex-col items-center gap-6' : ''}`}>
                    <div className={`flex items-center ${isCollapsed ? 'flex-col gap-4' : 'gap-3'}`}>
                        <div className="flex-1">
                            <LanguageSelector compact={isCollapsed} />
                        </div>

                        <div className="flex items-center">
                            <ThemeToggle />
                        </div>

                        {onShowHelp && (
                            <button
                                onClick={onShowHelp}
                                className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-all active:scale-95 border border-transparent hover:border-slate-700"
                                title={t('sidebar.shortcutsTooltip')}
                            >
                                <CircleHelp size={20} />
                            </button>
                        )}
                    </div>
                    {!isCollapsed && (
                        <div className="mt-6 pt-6 border-t border-slate-800/30">
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                                <span>{t('common.engineWithVersion')}</span>
                                <span className="px-1.5 py-0.5 bg-slate-800 rounded">{t('common.revisionWithNumber')}</span>
                            </div>
                        </div>
                    )}
                </div>
            </aside>

            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}
        </>
    );
};
