/**
 * Proposta: Módulo de Gestão da Árvore de Ativos Técnicos.
 * Fluxo: Integra uma barra lateral redimensionável contendo a hierarquia completa com um painel de edição detalhado, permitindo a manutenção da estrutura organizacional (Área > Equipamento > Subgrupo) através de operações CRUD e algoritmos recursivos.
 */

import React, { useState, useRef, useCallback, useEffect, useId } from 'react';
import { AssetNode } from '../../types';
import { Database, Layers, Plus, Trash2, Edit2, Lock, GripVertical, Info } from 'lucide-react';
import { ShortcutLabel } from '../ui/ShortcutLabel';
import { useAssetsLogic } from '../../hooks/useAssetsLogic';
import { ConfirmModal } from '../modals/ConfirmModal';
import { AssetTreeNode } from '../selectors/AssetTreeNode';
import { useLanguage } from '../../context/LanguageDefinition';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

export const AssetsManager: React.FC = () => {
  const { t } = useLanguage();
  const idPrefix = useId();
  const {
    assets, selectedNode, setSelectedNode, parentNode, setParentNode,
    isEditing, setIsEditing, nodeName, setNodeName, nodeType, setNodeType,
    handleDelete, handleUpdate, handleAddChild, startEdit, startAdd,
    deleteModalOpen, confirmDelete, cancelDelete
  } = useAssetsLogic();

  // --- Estado do Redimensionamento da Barra Lateral ---
  const MIN_WIDTH = 250;
  const MAX_WIDTH = 600;
  const DEFAULT_WIDTH = 380;
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
  const isResizing = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Inicia o rastreamento do mouse para redimensionamento manual.
   */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = e.clientX - containerRect.left;

      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div ref={containerRef} className="flex h-full p-8 lg:p-12 gap-0 max-w-[1600px] mx-auto animate-in fade-in duration-700">
      {/* Barra Lateral da Árvore - Redimensionável */}
      <div
        className="bg-white dark:bg-slate-900 rounded-l-[2rem] shadow-sm border border-slate-200/60 dark:border-slate-800 flex flex-col overflow-hidden"
        style={{ width: `${sidebarWidth}px`, minWidth: `${MIN_WIDTH}px`, maxWidth: `${MAX_WIDTH}px` }}
      >
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <h2 className="font-black text-slate-700 dark:text-slate-300 text-xs uppercase tracking-[0.2em]">{t('assets.hierarchy')}</h2>
          <button
            onClick={() => { setSelectedNode(null); startAdd(null); }}
            className="p-2 bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-all active:scale-95"
            title={t('assets.tooltips.addRootArea')}
          >
            <Plus size={20} strokeWidth={3} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-auto p-4 custom-scrollbar">
          {assets.map(asset => (
            <AssetTreeNode
              key={asset.id}
              node={asset}
              depth={0}
              selectedNodeId={selectedNode?.id}
              onSelect={(node) => {
                setSelectedNode(node);
                setParentNode(null);
                setIsEditing(false);
              }}
              isEditing={isEditing}
            />
          ))}
          {assets.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-slate-300 dark:text-slate-600">
              <Database size={48} className="mb-4 opacity-20" />
              <p className="text-sm font-bold">{t('assets.noAssets')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Alça de Redimensionamento (Resize Handle) */}
      <div
        onMouseDown={handleMouseDown}
        className="w-1.5 cursor-col-resize bg-slate-100 dark:bg-slate-800 hover:bg-blue-400 dark:hover:bg-blue-600 flex items-center justify-center transition-all border-y border-slate-200 dark:border-slate-800 z-10"
        title={t('common.tooltips.resize')}
      >
        <div className="w-px h-8 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
      </div>


      {/* Painel de Edição Detalhada */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-r-[2rem] shadow-sm border border-slate-200/60 dark:border-slate-800 p-10 lg:p-16 relative overflow-hidden group/panel">
        {!isEditing && selectedNode ? (
          <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="mb-12">
              <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase mb-4 inline-block border shadow-sm tracking-widest
                ${selectedNode.type === 'AREA' ? 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700' :
                  selectedNode.type === 'EQUIPMENT' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30' : 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400 border-cyan-100 dark:border-cyan-900/30'}`}>
                {t(`assets.types.${selectedNode.type}`) || selectedNode.type}
              </span>
              <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-4 tracking-tighter font-display">{selectedNode.name}</h1>
              <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500 font-mono text-xs bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-xl w-fit border border-slate-100 dark:border-slate-700">
                <Lock size={14} className="opacity-50" />
                <span className="font-bold">SYSTEM ID:</span> {selectedNode.id}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-auto">
              <button
                onClick={() => startEdit(selectedNode)}
                className="flex items-center justify-center gap-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 py-4 rounded-2xl font-bold border border-slate-200 dark:border-slate-700 transition-all shadow-sm active:scale-95"
              >
                <Edit2 size={20} /> <ShortcutLabel text={t('assets.rename')} shortcutLetter="R" />
              </button>
              <button
                onClick={() => handleDelete(selectedNode)}
                className="flex items-center justify-center gap-3 bg-rose-50 dark:bg-rose-900/10 hover:bg-rose-100 dark:hover:bg-rose-900/20 text-rose-600 dark:text-rose-400 py-4 rounded-2xl font-bold border border-rose-100 dark:border-rose-900/30 transition-all active:scale-95"
              >
                <Trash2 size={20} /> <ShortcutLabel text={t('assets.delete')} shortcutLetter="E" />
              </button>
              {selectedNode.type !== 'SUBGROUP' && (
                <button
                  onClick={() => startAdd(selectedNode)}
                  className="sm:col-span-2 flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]"
                >
                  <Plus size={22} strokeWidth={3} /> {t('assets.addChild')} ({selectedNode.type === 'AREA' ? t('filters.equipment') : t('filters.subgroup')})
                </button>
              )}
            </div>
          </div>
        ) : isEditing ? (
          <div className="h-full flex flex-col max-w-lg mx-auto justify-center animate-in fade-in zoom-in-95 duration-300">
            <div className="mb-10 text-center">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-blue-100">
                {parentNode || (!selectedNode && !parentNode) ? <Plus size={32} strokeWidth={2.5} /> : <Edit2 size={32} strokeWidth={2.5} />}
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight font-display">
                {parentNode || (!selectedNode && !parentNode) ? t('assets.new') : t('assets.edit')}
              </h2>
            </div>

            <div className="space-y-6">
              <Select
                id={`${idPrefix}-type`}
                label={t('assets.type')}
                value={nodeType}
                onChange={e => setNodeType(e.target.value as any)}
                disabled={!!selectedNode && !parentNode}
                options={[
                  { value: 'AREA', label: t('filters.area') },
                  { value: 'EQUIPMENT', label: t('filters.equipment') },
                  { value: 'SUBGROUP', label: t('filters.subgroup') }
                ]}
              />

              <Input
                id={`${idPrefix}-name`}
                label={t('assets.name')}
                type="text"
                value={nodeName}
                onChange={e => setNodeName(e.target.value)}
                placeholder={t('assets.placeholder')}
                autoFocus
              />

              {!parentNode && selectedNode && (
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('assets.systemId')}</label>
                  <div className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-500 dark:text-slate-400 font-mono text-sm flex items-center gap-3 shadow-inner">
                    <Lock size={16} className="opacity-40" />
                    <span className="font-bold">{selectedNode.id}</span>
                  </div>
                </div>
              )}

              {(parentNode || (!selectedNode && !parentNode)) && (
                <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400 text-xs rounded-xl border border-blue-100 dark:border-blue-900/30 flex gap-3">
                  <Info size={18} className="flex-shrink-0" />
                  <p className="font-medium leading-relaxed">{t('assets.idHint')}</p>
                </div>
              )}

              <div className="flex gap-4 pt-8">
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-4 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                  title="Esc"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={parentNode || (!selectedNode && !parentNode) ? handleAddChild : handleUpdate}
                  className="flex-1 py-4 bg-blue-600 rounded-2xl text-white font-black hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all active:scale-95"
                  title="Ctrl+S"
                >
                  <ShortcutLabel text={t('common.save')} shortcutLetter="S" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 animate-in fade-in duration-1000">
            <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center mb-8 border border-slate-100 dark:border-slate-700 shadow-inner">
              <Layers size={48} className="opacity-20" />
            </div>
            <p className="font-black text-xs uppercase tracking-[0.2em]">{t('assets.selectPrompt')}</p>
          </div>
        )}

        {/* Elemento Decorativo */}
        <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-blue-50 opacity-0 group-hover/panel:opacity-30 rounded-full transition-all duration-1000 blur-3xl -z-10"></div>
      </div>

      <ConfirmModal
        isOpen={deleteModalOpen}
        title={t('modals.deleteAssetTitle')}
        message={t('modals.deleteAssetMessage')}
        confirmText={t('modals.confirm')}
        cancelText={t('modals.cancel')}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        variant="danger"
      />
    </div>
  );
};
