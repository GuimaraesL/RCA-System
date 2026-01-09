
import React, { useState } from 'react';
import { AssetNode } from '../types';
import { Folder, Database, Layers, Plus, Trash2, Edit2, ChevronRight, ChevronDown, Lock } from 'lucide-react';
import { useAssetsLogic } from '../hooks/useAssetsLogic';
import { ConfirmModal } from './ConfirmModal';

export const AssetsManager: React.FC = () => {
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

  const TreeNode: React.FC<{ node: AssetNode; depth: number }> = ({ node, depth }) => {
    const [expanded, setExpanded] = useState(true);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div className="select-none">
        <div
          className={`flex items-center justify-between py-2 px-3 cursor-pointer rounded-md mb-1 transition-colors ${selectedNode?.id === node.id && !isEditing ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-100'}`}
          style={{ marginLeft: `${depth * 20}px` }}
          onClick={() => {
            setSelectedNode(node);
            setParentNode(null);
            setIsEditing(false);
          }}
        >
          <div className="flex items-center">
            <div
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              className={`mr-2 p-1 rounded hover:bg-slate-200 ${hasChildren ? 'visible' : 'invisible'}`}
            >
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div>
            {node.type === 'AREA' && <Folder size={16} className="mr-2 text-slate-400" />}
            {node.type === 'EQUIPMENT' && <Database size={16} className="mr-2 text-blue-500" />}
            {node.type === 'SUBGROUP' && <Layers size={16} className="mr-2 text-indigo-500" />}
            <span className="text-sm font-medium truncate">{node.name}</span>
          </div>
        </div>
        {expanded && node.children?.map(child => <TreeNode key={child.id} node={child} depth={depth + 1} />)}
      </div>
    );
  };

  return (
    <div className="flex h-full p-8 gap-8 max-w-7xl mx-auto">
      {/* Sidebar Tree */}
      <div className="w-1/3 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="font-bold text-slate-700">Hierarchy</h2>
          <button
            onClick={() => { setSelectedNode(null); startAdd(null); }}
            className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
            title="Add Root Area"
          >
            <Plus size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {assets.map(asset => <TreeNode key={asset.id} node={asset} depth={0} />)}
          {assets.length === 0 && <div className="text-center p-8 text-slate-400 text-sm">No assets defined. Add a root area.</div>}
        </div>
      </div>

      {/* Editor Panel */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        {!isEditing && selectedNode ? (
          <div className="h-full flex flex-col">
            <div className="mb-8">
              <span className={`text-xs font-bold px-2 py-1 rounded uppercase mb-2 inline-block
                ${selectedNode.type === 'AREA' ? 'bg-slate-100 text-slate-600' :
                  selectedNode.type === 'EQUIPMENT' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'}`}>
                {selectedNode.type}
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
                <Edit2 size={18} /> Rename / Edit
              </button>
              <button
                onClick={() => handleDelete(selectedNode)}
                className="flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 py-3 rounded-lg font-medium transition-colors"
              >
                <Trash2 size={18} /> Delete Node
              </button>
              {selectedNode.type !== 'SUBGROUP' && (
                <button
                  onClick={() => startAdd(selectedNode)}
                  className="col-span-2 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors shadow-sm"
                >
                  <Plus size={18} /> Add Child {selectedNode.type === 'AREA' ? 'Equipment' : 'Subgroup'}
                </button>
              )}
            </div>
          </div>
        ) : isEditing ? (
          <div className="h-full flex flex-col max-w-lg mx-auto justify-center">
            <h2 className="text-2xl font-bold mb-6 text-slate-800">
              {parentNode || (!selectedNode && !parentNode) ? 'Add New Asset' : 'Edit Asset'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Asset Type</label>
                <select
                  value={nodeType}
                  onChange={e => setNodeType(e.target.value as any)}
                  disabled={!!selectedNode && !parentNode}
                  className="w-full border border-slate-300 rounded-lg p-3 bg-white text-slate-900"
                >
                  <option value="AREA">Area</option>
                  <option value="EQUIPMENT">Equipment</option>
                  <option value="SUBGROUP">Subgroup</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Asset Name</label>
                <input
                  type="text"
                  value={nodeName}
                  onChange={e => setNodeName(e.target.value)}
                  placeholder="e.g. Rolling Mill 1"
                  className="w-full border border-slate-300 rounded-lg p-3 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {!parentNode && selectedNode && (
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Asset ID (System Generated)</label>
                  <div className="w-full bg-slate-100 border border-slate-200 rounded-lg p-3 text-slate-500 font-mono text-sm flex items-center gap-2">
                    <Lock size={14} />
                    {selectedNode.id}
                  </div>
                </div>
              )}

              {(parentNode || (!selectedNode && !parentNode)) && (
                <div className="p-3 bg-blue-50 text-blue-700 text-xs rounded-lg">
                  ID will be automatically generated upon saving.
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-3 border border-slate-300 rounded-lg text-slate-600 font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={parentNode || (!selectedNode && !parentNode) ? handleAddChild : handleUpdate}
                  className="flex-1 py-3 bg-blue-600 rounded-lg text-white font-medium hover:bg-blue-700 shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <Layers size={64} className="mb-4 text-slate-200" />
            <p>Select an item from the hierarchy to view details or edit.</p>
          </div>
        )}
      </div>

      {/* Modal de Confirmação de Exclusão de Asset */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Excluir Asset"
        message={`Tem certeza que deseja excluir "${nodeToDelete?.name}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        variant="danger"
      />
    </div>
  );
};
