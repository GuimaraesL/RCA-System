
import { useState } from 'react';
import { AssetNode } from '../types';
import { generateId } from '../services/storageService';
import { useRcaContext } from '../context/RcaContext';

export const useAssetsLogic = () => {
  const { assets, updateAssets } = useRcaContext();
  const [selectedNode, setSelectedNode] = useState<AssetNode | null>(null);
  const [parentNode, setParentNode] = useState<AssetNode | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form State
  const [nodeName, setNodeName] = useState('');
  const [nodeType, setNodeType] = useState<'AREA' | 'EQUIPMENT' | 'SUBGROUP'>('AREA');

  const handleDelete = (nodeToDelete: AssetNode) => {
    if (!confirm(`Are you sure you want to delete ${nodeToDelete.name}?`)) return;

    const deleteNodeRecursive = (nodes: AssetNode[]): AssetNode[] => {
      return nodes.filter(n => n.id !== nodeToDelete.id).map(n => ({
        ...n,
        children: n.children ? deleteNodeRecursive(n.children) : undefined
      }));
    };

    updateAssets(deleteNodeRecursive(assets));
    setSelectedNode(null);
    setIsEditing(false);
  };

  const handleUpdate = () => {
    if (!selectedNode) return;

    const updateNodeRecursive = (nodes: AssetNode[]): AssetNode[] => {
      return nodes.map(n => {
        if (n.id === selectedNode.id) {
          return { ...n, name: nodeName };
        }
        if (n.children) {
          return { ...n, children: updateNodeRecursive(n.children) };
        }
        return n;
      });
    };

    updateAssets(updateNodeRecursive(assets));
    setIsEditing(false);
    setSelectedNode({...selectedNode, name: nodeName});
  };

  const handleAddChild = () => {
    if (!selectedNode && nodeType !== 'AREA') {
        alert("Root nodes must be of type AREA");
        return;
    }

    const prefix = nodeType === 'AREA' ? 'AREA' : nodeType === 'EQUIPMENT' ? 'EQP' : 'SUB';
    const newId = generateId(prefix);

    const newNode: AssetNode = {
      id: newId,
      name: nodeName || 'New Asset',
      type: nodeType,
      children: [],
      parentId: selectedNode ? selectedNode.id : undefined
    };

    if (!selectedNode) {
      updateAssets([...assets, newNode]);
    } else {
      const addRecursive = (nodes: AssetNode[]): AssetNode[] => {
        return nodes.map(n => {
          if (n.id === selectedNode.id) {
            return { ...n, children: [...(n.children || []), newNode] };
          }
          if (n.children) {
            return { ...n, children: addRecursive(n.children) };
          }
          return n;
        });
      };
      updateAssets(addRecursive(assets));
    }
    
    setNodeName('');
    setIsEditing(false);
  };

  const startEdit = (node: AssetNode) => {
    setSelectedNode(node);
    setNodeName(node.name);
    setNodeType(node.type);
    setIsEditing(true);
  };

  const startAdd = (parent: AssetNode | null) => {
    setSelectedNode(parent);
    setParentNode(parent);
    setNodeName('');
    
    if (parent?.type === 'AREA') setNodeType('EQUIPMENT');
    else if (parent?.type === 'EQUIPMENT') setNodeType('SUBGROUP');
    else setNodeType('AREA');
    
    setIsEditing(true);
  };

  return {
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
    startAdd
  };
};
