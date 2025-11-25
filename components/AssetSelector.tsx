import React, { useState } from 'react';
import { AssetNode } from '../types';
import { ChevronRight, ChevronDown, Folder, Database, Layers } from 'lucide-react';

interface AssetSelectorProps {
  assets: AssetNode[];
  onSelect: (asset: AssetNode) => void;
  selectedAssetId?: string;
}

const AssetTreeNode: React.FC<{ 
  node: AssetNode; 
  onSelect: (n: AssetNode) => void; 
  selectedAssetId?: string;
  depth: number;
}> = ({ node, onSelect, selectedAssetId, depth }) => {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  
  const isSelected = selectedAssetId === node.id;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(node);
  };

  return (
    <div className="select-none">
      <div 
        className={`flex items-center py-1.5 px-2 cursor-pointer rounded-md transition-colors ${
          isSelected ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-100 text-slate-700'
        }`}
        style={{ marginLeft: `${depth * 16}px` }}
        onClick={handleSelect}
      >
        <div 
          onClick={hasChildren ? handleToggle : undefined}
          className={`mr-2 p-0.5 rounded hover:bg-slate-200 ${hasChildren ? 'visible' : 'invisible'}`}
        >
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
        
        {node.type === 'AREA' && <Folder size={16} className="mr-2 text-slate-400" />}
        {node.type === 'EQUIPMENT' && <Database size={16} className="mr-2 text-blue-500" />}
        {node.type === 'SUBGROUP' && <Layers size={16} className="mr-2 text-indigo-500" />}
        
        <span className="text-sm font-medium">{node.name}</span>
      </div>
      
      {isOpen && hasChildren && node.children?.map(child => (
        <AssetTreeNode 
          key={child.id} 
          node={child} 
          onSelect={onSelect} 
          selectedAssetId={selectedAssetId}
          depth={depth + 1}
        />
      ))}
    </div>
  );
};

export const AssetSelector: React.FC<AssetSelectorProps> = ({ assets, onSelect, selectedAssetId }) => {
  if (!assets || assets.length === 0) {
      return <div className="p-4 text-xs text-slate-400 text-center italic">No assets configured. Go to Assets tab.</div>;
  }
  
  return (
    <div className="border rounded-lg p-2 bg-white shadow-sm h-64 overflow-y-auto custom-scrollbar">
      {assets.map(asset => (
        <AssetTreeNode 
          key={asset.id} 
          node={asset} 
          onSelect={onSelect} 
          selectedAssetId={selectedAssetId}
          depth={0}
        />
      ))}
    </div>
  );
};