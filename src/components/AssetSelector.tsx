/**
 * Proposta: Seletor hierárquico de Ativos Técnicos.
 * Fluxo: Renderiza uma árvore navegável (Tree View) com suporte a expansão/colapso, filtragem por tipos selecionáveis e ordenação alfabética recursiva, garantindo que o usuário localize o ativo correto para o vínculo da análise.
 */

import React, { useState, useMemo } from 'react';
import { AssetNode } from '../types';
import { ChevronRight, ChevronDown, Folder, Database, Layers } from 'lucide-react';
import { useLanguage } from '../context/LanguageDefinition';

interface AssetSelectorProps {
  assets: AssetNode[];
  onSelect: (asset: AssetNode) => void;
  selectedAssetId?: string;
  selectableTypes?: string[];
}

/**
 * Componente interno recursivo para renderização de cada nó da árvore de ativos.
 */
const AssetTreeNode: React.FC<{ 
  node: AssetNode; 
  onSelect: (n: AssetNode) => void; 
  selectedAssetId?: string;
  depth: number;
  selectableTypes?: string[];
}> = ({ node, onSelect, selectedAssetId, depth, selectableTypes }) => {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  
  const isSelected = selectedAssetId === node.id;
  const isSelectable = !selectableTypes || selectableTypes.includes(node.type);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSelectable) {
      onSelect(node);
    } else {
      // Se não for selecionável mas possuir filhos, alterna a expansão do ramo
      if (hasChildren) setIsOpen(!isOpen);
    }
  };

  return (
    <div className="select-none">
      <div 
        className={`flex items-center py-1.5 px-2 rounded-md transition-colors ${
          isSelected ? 'bg-blue-100 text-blue-700' : 
          isSelectable ? 'hover:bg-slate-100 text-slate-700 cursor-pointer' : 'text-slate-400 cursor-default'
        }`}
        style={{ marginLeft: `${depth * 16}px` }}
        onClick={handleClick}
      >
        <div 
          onClick={hasChildren ? handleToggle : undefined}
          className={`mr-2 p-0.5 rounded hover:bg-slate-200 cursor-pointer ${hasChildren ? 'visible' : 'invisible'}`}
        >
          {isOpen ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
        </div>
        
        {/* Ícones específicos por tipo de nível hierárquico */}
        {node.type === 'AREA' && <Folder size={16} className={`mr-2 ${isSelectable ? 'text-slate-500' : 'text-slate-300'}`} />}
        {node.type === 'EQUIPMENT' && <Database size={16} className={`mr-2 ${isSelectable ? 'text-blue-500' : 'text-slate-300'}`} />}
        {node.type === 'SUBGROUP' && <Layers size={16} className={`mr-2 ${isSelectable ? 'text-indigo-500' : 'text-slate-300'}`} />}
        
        <span className={`text-sm font-medium ${isSelectable ? '' : 'italic'}`}>{node.name}</span>
      </div>
      
      {/* Renderização recursiva de descendentes */}
      {isOpen && hasChildren && node.children?.map(child => (
        <AssetTreeNode 
          key={child.id} 
          node={child} 
          onSelect={onSelect} 
          selectedAssetId={selectedAssetId}
          depth={depth + 1}
          selectableTypes={selectableTypes}
        />
      ))}
    </div>
  );
};

export const AssetSelector: React.FC<AssetSelectorProps> = ({ assets, onSelect, selectedAssetId, selectableTypes }) => {
  const { t } = useLanguage();
  
  /**
   * Função recursiva para ordenar os nós alfabeticamente pelo nome.
   * Implementa suporte a números (numeric: true) para garantir que 'Maq 2' venha antes de 'Maq 10'.
   */
  const sortNodes = (nodes: AssetNode[]): AssetNode[] => {
    return [...nodes]
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
      .map(node => ({
        ...node,
        children: node.children ? sortNodes(node.children) : undefined
      }));
  };

  /**
   * Memoriza a árvore ordenada para evitar re-processamento em re-renders da interface.
   */
  const sortedAssets = useMemo(() => {
    if (!assets) return [];
    return sortNodes(assets);
  }, [assets]);

  if (!sortedAssets || sortedAssets.length === 0) {
      return <div className="p-4 text-xs text-slate-400 text-center italic">{t('assets.noAssets')}</div>;
  }
  
  return (
    <div className="border rounded-lg p-2 bg-white shadow-sm h-64 overflow-y-auto custom-scrollbar">
      {sortedAssets.map(asset => (
        <AssetTreeNode 
          key={asset.id} 
          node={asset} 
          onSelect={onSelect} 
          selectedAssetId={selectedAssetId}
          depth={0}
          selectableTypes={selectableTypes}
        />
      ))}
    </div>
  );
};