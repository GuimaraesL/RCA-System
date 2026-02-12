/**
 * Proposta: Seletor hierárquico de Ativos Técnicos.
 * Fluxo: Renderiza uma árvore navegável (Tree View) com suporte a expansão/colapso, filtragem por tipos selecionáveis e ordenação alfabética recursiva, garantindo que o usuário localize o ativo correto para o vínculo da análise.
 */

import React, { useState, useMemo } from 'react';
import { AssetNode } from '../../types';
import { ChevronRight, ChevronDown, Folder, Database, Layers } from 'lucide-react';
import { useLanguage } from '../../context/LanguageDefinition';

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
        className={`flex items-center py-2 px-3 rounded-xl transition-all duration-200 group ${
          isSelected ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 
          isSelectable ? 'hover:bg-slate-50 text-slate-700 cursor-pointer border border-transparent hover:border-slate-100' : 'text-slate-500 cursor-default'
        }`}
        style={{ marginLeft: `${depth * 20}px` }}
        onClick={handleClick}
      >
        <div 
          onClick={hasChildren ? handleToggle : undefined}
          className={`mr-2 p-1 rounded-lg hover:bg-black/5 transition-colors cursor-pointer ${hasChildren ? 'visible' : 'invisible'}`}
        >
          {isOpen ? <ChevronDown size={14} className={isSelected ? "text-white" : "text-slate-400"} /> : <ChevronRight size={14} className={isSelected ? "text-white" : "text-slate-400"} />}
        </div>
        
        {/* Ícones específicos por tipo de nível hierárquico */}
        <div className={`p-1.5 rounded-lg mr-2.5 transition-colors ${isSelected ? 'bg-white/20' : 'bg-slate-100 group-hover:bg-blue-50'}`}>
            {node.type === 'AREA' && <Folder size={14} className={isSelected ? 'text-white' : isSelectable ? 'text-slate-500' : 'text-slate-600'} />}
            {node.type === 'EQUIPMENT' && <Database size={14} className={isSelected ? 'text-white' : isSelectable ? 'text-blue-500' : 'text-blue-600'} />}
            {node.type === 'SUBGROUP' && <Layers size={14} className={isSelected ? 'text-white' : isSelectable ? 'text-cyan-500' : 'text-cyan-600'} />}
        </div>
        
        <span className={`text-xs ${isSelected ? 'font-black' : isSelectable ? 'font-bold' : 'font-black text-slate-700 opacity-80'} truncate`}>{node.name}</span>
        
        {isSelected && (
            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
        )}
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
      return (
        <div className="p-12 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <Database size={32} className="mx-auto mb-3 text-slate-300 opacity-50" />
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{t('assets.noAssets')}</p>
        </div>
      );
  }
  
  return (
    <div className="border border-slate-200/60 rounded-2xl p-3 bg-white shadow-inner h-72 overflow-y-auto custom-scrollbar flex flex-col gap-1.5">
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
