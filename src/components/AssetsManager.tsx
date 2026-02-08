
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { AssetNode } from '../types';
import { Folder, Database, Layers, Plus, Trash2, Edit2, ChevronRight, ChevronDown, Lock, GripVertical } from 'lucide-react';
import { useAssetsLogic } from '../hooks/useAssetsLogic';
import { ConfirmModal } from './ConfirmModal';
import { AssetTreeNode } from './AssetTreeNode';

import { useLanguage } from '../context/LanguageDefinition'; // i18n

export const AssetsManager: React.FC = () => {
  const { t } = useLanguage();
  const {
    assets,
    selectedNode, setSelectedNode,
    parentNode, setParentNode,
    isEditing, setIsEditing,
    nodeName, setNodeName,
    nodeType, setNodeType,
    handleDelete,
    handleUpdate,
    handleAddChild,
    startEdit,
    startAdd,
    deleteModalOpen,
    nodeToDelete,
    confirmDelete,
    cancelDelete
  } = useAssetsLogic();

  // --- Resizable Sidebar State ---
  const MIN_WIDTH = 200;
  const MAX_WIDTH = 600;
  const DEFAULT_WIDTH = 350;
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
  const isResizing = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

      // Calcula largura relativa à posição do container
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

  /* TreeNode component moved to AssetTreeNode.tsx */

  return (
    <div ref={containerRef} className="flex h-full p-8 gap-0 max-w-[1600px] mx-auto">
      {/* Sidebar Tree - Resizable */}
      <div
        className="bg-white rounded-l-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden"
        style={{ width: `${sidebarWidth}px`, minWidth: `${MIN_WIDTH}px`, maxWidth: `${MAX_WIDTH}px` }}
      >
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="font-bold text-slate-700">{t('assets.hierarchy')}</h2>
          <button
            onClick={() => { setSelectedNode(null); startAdd(null); }}
            className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
            title={t('assets.tooltips.addRootArea')}
          >
            <Plus size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-auto p-2">
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
          {assets.length === 0 && <div className="text-center p-8 text-slate-400 text-sm">{t('assets.noAssets')}</div>}
        </div>
      </div>

      {/* Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        className="w-2 cursor-col-resize bg-slate-100 hover:bg-blue-200 flex items-center justify-center transition-colors border-y border-slate-200"
        title={t('common.tooltips.resize')}
      >
        <GripVertical size={12} className="text-slate-400" />
      </div>


      {/* Editor Panel */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        {!isEditing && selectedNode ? (
          <div className="h-full flex flex-col">
            <div className="mb-8">
              <span className={`text-xs font-bold px-2 py-1 rounded uppercase mb-2 inline-block
                ${selectedNode.type === 'AREA' ? 'bg-slate-100 text-slate-600' :
                  selectedNode.type === 'EQUIPMENT' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'}`}>
                {t(`assets.types.${selectedNode.type}`) || selectedNode.type}
              </span>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">{selectedNode.name}</h1>
              <div className="flex items-center gap-2 text-slate-400 font-mono text-xs bg-slate-50 p-2 rounded w-fit">
                <Lock size={12} />
                ID: {selectedNode.id}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-auto">
              <button
                onClick={() => startEdit(selectedNode)}
                className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-lg font-medium transition-colors"
              >
                <Edit2 size={18} /> {t('assets.rename')}
              </button>
              <button
                onClick={() => handleDelete(selectedNode)}
                className="flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 py-3 rounded-lg font-medium transition-colors"
              >
                <Trash2 size={18} /> {t('assets.delete')}
              </button>
              {selectedNode.type !== 'SUBGROUP' && (
                <button
                  onClick={() => startAdd(selectedNode)}
                  className="col-span-2 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors shadow-sm"
                >
                  <Plus size={18} /> {t('assets.addChild')} ({selectedNode.type === 'AREA' ? t('filters.equipment') : t('filters.subgroup')})
                </button>
              )}
            </div>
          </div>
        ) : isEditing ? (
          <div className="h-full flex flex-col max-w-lg mx-auto justify-center">
            <h2 className="text-2xl font-bold mb-6 text-slate-800">
              {parentNode || (!selectedNode && !parentNode) ? t('assets.new') : t('assets.edit')}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">{t('assets.type')}</label>
                <select
                  value={nodeType}
                  onChange={e => setNodeType(e.target.value as any)}
                  disabled={!!selectedNode && !parentNode}
                  className="w-full border border-slate-300 rounded-lg p-3 bg-white text-slate-900"
                >
                  <option value="AREA">{t('filters.area')}</option>
                  <option value="EQUIPMENT">{t('filters.equipment')}</option>
                  <option value="SUBGROUP">{t('filters.subgroup')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">{t('assets.name')}</label>
                <input
                  type="text"
                  value={nodeName}
                  onChange={e => setNodeName(e.target.value)}
                  placeholder={t('assets.placeholder')}
                  className="w-full border border-slate-300 rounded-lg p-3 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {!parentNode && selectedNode && (
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">{t('assets.systemId')}</label>
                  <div className="w-full bg-slate-100 border border-slate-200 rounded-lg p-3 text-slate-500 font-mono text-sm flex items-center gap-2">
                    <Lock size={14} />
                    {selectedNode.id}
                  </div>
                </div>
              )}

              {(parentNode || (!selectedNode && !parentNode)) && (
                <div className="p-3 bg-blue-50 text-blue-700 text-xs rounded-lg">
                  {t('assets.idHint')}
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-3 border border-slate-300 rounded-lg text-slate-600 font-medium hover:bg-slate-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={parentNode || (!selectedNode && !parentNode) ? handleAddChild : handleUpdate}
                  className="flex-1 py-3 bg-blue-600 rounded-lg text-white font-medium hover:bg-blue-700 shadow-sm"
                >
                  {t('common.save')}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <Layers size={64} className="mb-4 text-slate-200" />
            <p>{t('assets.selectPrompt')}</p>
          </div>
        )}
      </div>

      {/* Modal de Confirmação de Exclusão de Asset */}
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
