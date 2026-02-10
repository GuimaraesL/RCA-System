/**
 * Proposta: Hook para gerenciamento da lógica da árvore de Ativos Técnicos.
 * Fluxo: Implementa algoritmos recursivos para adição, edição e exclusão de nós na hierarquia (Área > Equipamento > Subgrupo), garantindo a integridade dos vínculos pai-filho e orquestrando o estado da interface de gestão.
 */

import { useState } from 'react';
import { AssetNode } from '../types';
import { generateId } from '../services/utils';
import { useRcaContext } from '../context/RcaContext';

export const useAssetsLogic = () => {
  const { assets, updateAssets } = useRcaContext();
  const [selectedNode, setSelectedNode] = useState<AssetNode | null>(null);
  const [parentNode, setParentNode] = useState<AssetNode | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Estado para modal de confirmação de exclusão
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [nodeToDelete, setNodeToDelete] = useState<AssetNode | null>(null);

  // Estado do formulário de edição/criação
  const [nodeName, setNodeName] = useState('');
  const [nodeType, setNodeType] = useState<'AREA' | 'EQUIPMENT' | 'SUBGROUP'>('AREA');

  /**
   * Inicia o fluxo de exclusão de um nó.
   */
  const handleDelete = (nodeToDeleteArg: AssetNode) => {
    setNodeToDelete(nodeToDeleteArg);
    setDeleteModalOpen(true);
  };

  /**
   * Executa a exclusão recursiva na árvore de ativos e persiste a alteração.
   */
  const confirmDelete = () => {
    if (!nodeToDelete) return;

    const deleteNodeRecursive = (nodes: AssetNode[]): AssetNode[] => {
      return nodes.filter(n => n.id !== nodeToDelete.id).map(n => ({
        ...n,
        children: n.children ? deleteNodeRecursive(n.children) : undefined
      }));
    };

    updateAssets(deleteNodeRecursive(assets));
    setSelectedNode(null);
    setIsEditing(false);
    setDeleteModalOpen(false);
    setNodeToDelete(null);
  };

  const cancelDelete = () => {
    setDeleteModalOpen(false);
    setNodeToDelete(null);
  };

  /**
   * Atualiza os dados de um nó existente através de busca recursiva.
   */
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
    setSelectedNode({ ...selectedNode, name: nodeName });
  };

  /**
   * Adiciona um novo nó filho ou um nó raiz (AREA).
   * Implementa a lógica de prefixos de ID baseados no tipo do ativo.
   */
  const handleAddChild = () => {
    if (!selectedNode && nodeType !== 'AREA') {
      alert("Nós raiz devem ser do tipo ÁREA");
      return;
    }

    const prefix = nodeType === 'AREA' ? 'AREA' : nodeType === 'EQUIPMENT' ? 'EQP' : 'SUB';
    const newId = generateId(prefix);

    const newNode: AssetNode = {
      id: newId,
      name: nodeName || 'Novo Ativo',
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

  /**
   * Prepara a interface para edição de um nó.
   */
  const startEdit = (node: AssetNode) => {
    setSelectedNode(node);
    setNodeName(node.name);
    setNodeType(node.type);
    setIsEditing(true);
  };

  /**
   * Prepara a interface para adição de um novo nó, sugerindo automaticamente o tipo correto baseado no pai.
   */
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
    assets, selectedNode, setSelectedNode, parentNode, setParentNode,
    isEditing, setIsEditing, nodeName, setNodeName, nodeType, setNodeType,
    handleDelete, handleUpdate, handleAddChild, startEdit, startAdd,
    deleteModalOpen, nodeToDelete, confirmDelete, cancelDelete
  };
};