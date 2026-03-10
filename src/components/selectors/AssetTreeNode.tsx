/**
 * Proposta: Nó individual da árvore de Ativos Técnicos para o modo de Gestão.
 * Fluxo: Renderiza um item hierárquico com suporte a expansão animada via CSS Grid (trick 0fr -> 1fr), ícones semânticos por nível e controle de estado de seleção e edição.
 */

import React, { useState, useRef, useEffect } from 'react';
import { AssetNode } from '../../types'; 
import { ChevronRight, ChevronDown, Folder, Database, Layers } from 'lucide-react';

interface AssetTreeNodeProps {
    node: AssetNode;
    depth: number;
    selectedNodeId?: string;
    onSelect: (node: AssetNode) => void;
    isEditing: boolean;
}

export const AssetTreeNode: React.FC<AssetTreeNodeProps> = ({
    node,
    depth,
    selectedNodeId,
    onSelect,
    isEditing
}) => {
    // Por padrão, a hierarquia inicia colapsada para evitar poluição visual em plantas grandes
    const [isExpanded, setIsExpanded] = useState(false);

    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedNodeId === node.id;

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
    };

    const handleSelect = () => {
        if (!isEditing) {
            onSelect(node);
        }
    };

    return (
        <div className="select-none flex flex-col">
            <div
                className={`
          flex items-center justify-between py-2 px-3 
          cursor-pointer rounded-md mb-1 transition-colors duration-200
          ${isSelected && !isEditing ? 'bg-primary-100 text-primary-700' : 'hover:bg-slate-100 text-slate-700'}
        `}
                style={{ paddingLeft: `${depth * 20 + 12}px` }} // Recuo progressivo para visualização clara da hierarquia
                onClick={handleSelect}
            >
                <div className="flex items-center w-full">
                    {/* Botão de Expansão */}
                    <div
                        onClick={hasChildren ? handleToggle : undefined}
                        className={`
                    mr-2 p-1 rounded-full hover:bg-slate-200 transition-colors
                    ${hasChildren ? 'visible cursor-pointer' : 'invisible'}
                    ${isExpanded ? 'bg-slate-100' : ''}
                `}
                    >
                        {/* Animação de rotação do chevron */}
                        <ChevronRight
                            size={14}
                            className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-90' : 'rotate-0'}`}
                        />
                    </div>

                    {/* Ícones de Nível Hierárquico */}
                    {node.type === 'AREA' && <Folder size={16} className={`mr-2 ${isSelected ? 'text-primary-600' : 'text-slate-400'}`} />}
                    {node.type === 'EQUIPMENT' && <Database size={16} className={`mr-2 ${isSelected ? 'text-primary-500' : 'text-primary-400'}`} />}
                    {node.type === 'SUBGROUP' && <Layers size={16} className={`mr-2 ${isSelected ? 'text-indigo-500' : 'text-indigo-400'}`} />}

                    {/* Rótulo do Ativo */}
                    <span className={`text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis ${isSelected ? 'font-semibold' : ''}`} title={node.name}>
                        {node.name}
                    </span>
                </div>
            </div>

            {/* Container de Animação: utiliza o truque de grid-template-rows para transição de altura suave */}
            <div
                className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
            >
                <div className="overflow-hidden">
                    {node.children?.map(child => (
                        <AssetTreeNode
                            key={child.id}
                            node={child}
                            depth={depth + 1}
                            selectedNodeId={selectedNodeId}
                            onSelect={childNode => onSelect(childNode)}
                            isEditing={isEditing}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};
