import React, { useState, useRef, useEffect } from 'react';
import { AssetNode } from '../types'; // Adjust path if necessary
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
    // Default expanded false based on user request "HIERARQUIA FICA NORMALMENTE EXPANDIDA (ALTERAR)"
    const [isExpanded, setIsExpanded] = useState(false);

    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedNodeId === node.id;

    // Auto-expand if the selected node is a child of this node (optional, facilitates navigation)
    // For now, adhering strictly to "Collapsed by default". 
    // If user wants path tracing later, we can add it.

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
          ${isSelected && !isEditing ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-100 text-slate-700'}
        `}
                style={{ paddingLeft: `${depth * 20 + 12}px` }} // Increased base padding for better hierarchy visual
                onClick={handleSelect}
            >
                <div className="flex items-center w-full">
                    {/* Toggle Button / Icon */}
                    <div
                        onClick={hasChildren ? handleToggle : undefined}
                        className={`
                    mr-2 p-1 rounded-full hover:bg-slate-200 transition-colors
                    ${hasChildren ? 'visible cursor-pointer' : 'invisible'}
                    ${isExpanded ? 'bg-slate-100' : ''}
                `}
                    >
                        {/* Rotating Chevron Animation */}
                        <ChevronRight
                            size={14}
                            className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-90' : 'rotate-0'}`}
                        />
                    </div>

                    {/* Icons */}
                    {node.type === 'AREA' && <Folder size={16} className={`mr-2 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />}
                    {node.type === 'EQUIPMENT' && <Database size={16} className={`mr-2 ${isSelected ? 'text-blue-500' : 'text-blue-400'}`} />}
                    {node.type === 'SUBGROUP' && <Layers size={16} className={`mr-2 ${isSelected ? 'text-indigo-500' : 'text-indigo-400'}`} />}

                    {/* Label */}
                    <span className={`text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis ${isSelected ? 'font-semibold' : ''}`} title={node.name}>
                        {node.name}
                    </span>
                </div>
            </div>

            {/* Animation Container using grid-template-rows trick for height transition */}
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
                            onSelect={onSelect}
                            isEditing={isEditing}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};
