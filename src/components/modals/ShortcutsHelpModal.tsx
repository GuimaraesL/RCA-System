/**
 * Proposta: Modal de ajuda de atalhos de teclado.
 * Fluxo: Exibido ao pressionar "?" fora de inputs. Lista todos os atalhos disponíveis
 * com ícones visuais e descrições traduzidas. Fecha com Esc ou clique no overlay.
 *
 * Issue: #71 - Implementar Atalhos de Teclado para Produtividade.
 */

import React from 'react';
import { X, Keyboard, Save, FilePlus, Search, PanelLeftClose, LogOut, LayoutDashboard, Siren, List, CheckSquare, Database, Settings, Upload } from 'lucide-react';
import { useLanguage } from '../../context/LanguageDefinition';

interface ShortcutsHelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface ShortcutEntry {
    keys: string[];
    descriptionKey: string;
    icon: React.ElementType;
}

interface ShortcutGroup {
    titleKey: string;
    items: ShortcutEntry[];
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);
const modLabel = isMac ? '⌘' : 'Ctrl';

const SHORTCUT_GROUPS: ShortcutGroup[] = [
    {
        titleKey: 'shortcuts.title',
        items: [
            { keys: [`${modLabel}+S`], descriptionKey: 'shortcuts.save', icon: Save },
            { keys: ['Alt+N'], descriptionKey: 'shortcuts.newRca', icon: FilePlus },
            { keys: [`${modLabel}+K`], descriptionKey: 'shortcuts.focusSearch', icon: Search },
            { keys: [`${modLabel}+B`], descriptionKey: 'shortcuts.toggleSidebar', icon: PanelLeftClose },
            { keys: ['Esc'], descriptionKey: 'shortcuts.closeModal', icon: LogOut },
        ],
    },
    {
        titleKey: 'sidebar.menu',
        items: [
            { keys: ['Alt+D'], descriptionKey: 'sidebar.dashboard', icon: LayoutDashboard },
            { keys: ['Alt+T'], descriptionKey: 'sidebar.triggers', icon: Siren },
            { keys: ['Alt+A'], descriptionKey: 'sidebar.analyses', icon: List },
            { keys: ['Alt+P'], descriptionKey: 'sidebar.actions', icon: CheckSquare },
            { keys: ['Alt+H'], descriptionKey: 'sidebar.assets', icon: Database },
            { keys: ['Alt+C'], descriptionKey: 'sidebar.settings', icon: Settings },
            { keys: ['Alt+M'], descriptionKey: 'sidebar.migration', icon: Upload },
        ],
    },
];

export const ShortcutsHelpModal: React.FC<ShortcutsHelpModalProps> = ({ isOpen, onClose }) => {
    const { t } = useLanguage();

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-slate-900/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-scale-in"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Cabeçalho */}
                <div className="px-8 py-6 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center gap-4 border-b border-slate-100">
                    <div className="p-2.5 rounded-xl bg-white shadow-sm text-blue-500">
                        <Keyboard size={24} strokeWidth={2.5} />
                    </div>
                    <h3 className="font-black text-xl text-slate-900 font-display tracking-tight">
                        {t('shortcuts.title')}
                    </h3>
                    <button
                        onClick={onClose}
                        className="ml-auto p-2 text-slate-400 hover:text-slate-600 hover:bg-white/50 rounded-full transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Lista de Atalhos por Grupo */}
                <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {SHORTCUT_GROUPS.map((group, gIdx) => (
                        <div key={gIdx}>
                            {gIdx > 0 && (
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 mt-1">
                                    {t(group.titleKey)}
                                </p>
                            )}
                            <div className="space-y-1">
                                {group.items.map((shortcut, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center gap-4 px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
                                    >
                                        <shortcut.icon
                                            size={16}
                                            className="text-slate-400 flex-shrink-0"
                                        />
                                        <span className="flex-1 text-sm font-medium text-slate-700">
                                            {t(shortcut.descriptionKey)}
                                        </span>
                                        <div className="flex gap-1.5">
                                            {shortcut.keys.map((key) => (
                                                <kbd
                                                    key={key}
                                                    className="px-2.5 py-1 text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded-lg shadow-sm font-mono"
                                                >
                                                    {key}
                                                </kbd>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Rodapé */}
                <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 text-center">
                    <p className="text-xs text-slate-400 font-medium">
                        {t('shortcuts.pressToClose')}
                    </p>
                </div>
            </div>
        </div>
    );
};
