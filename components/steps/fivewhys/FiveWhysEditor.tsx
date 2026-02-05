import React, { useState } from 'react';
import { FiveWhyNode, FiveWhyChain } from '../../../types';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { Plus, Trash2, ChevronRight, ChevronDown, CornerDownRight } from 'lucide-react';
import { generateId } from '../../../services/utils';
import { useLanguage } from '../../../context/LanguageDefinition';

interface FiveWhysEditorProps {
    chains: FiveWhyChain[];
    onChange: (chains: FiveWhyChain[]) => void;
}

const NodeEditor: React.FC<{
    node: FiveWhyNode;
    depth: number;
    onUpdate: (updatedNode: FiveWhyNode) => void;
    onDelete: () => void;
    canDelete: boolean;
}> = ({ node, depth, onUpdate, onDelete, canDelete }) => {
    const { t } = useLanguage();

    const isActive = (node.whys || []).length < 5; // Can add more whys?

    // Update a specific why level
    const updateWhy = (level: number, text: string) => {
        const newWhys = [...(node.whys || [])];
        const whyIndex = newWhys.findIndex(w => w.level === level);

        if (whyIndex >= 0) {
            newWhys[whyIndex].answer = text;
        } else {
            // Fill gaps if necessary (simple implementation assumes sequential)
            newWhys.push({ level, answer: text });
        }
        onUpdate({ ...node, whys: newWhys });
    };

    // Delete a specific why level
    const deleteWhy = (levelToDelete: number) => {
        const filtered = (node.whys || []).filter(w => w.level !== levelToDelete);
        // Re-index levels to ensure continuity (1, 2, 3...)
        const reIndexed = filtered.map((w, index) => ({
            ...w,
            level: index + 1
        }));
        onUpdate({ ...node, whys: reIndexed });
    };

    // Add next why level
    const addWhy = () => {
        const nextLevel = (node.whys || []).length + 1;
        if (nextLevel > 5) return;

        onUpdate({
            ...node,
            whys: [...(node.whys || []), { level: nextLevel, answer: '' }]
        });
    };

    // Add Branched Child (New Cause Path)
    const addChild = () => {
        const newNode: FiveWhyNode = {
            id: generateId('node'),
            level: 0,
            cause_effect: t('wizard.step4.fiveWhys.newContributingCause'),
            whys: [{ level: 1, answer: '' }],
            children: []
        };
        onUpdate({ ...node, children: [...(node.children || []), newNode] });
    };

    // Update child nodes locally
    const updateChild = (childIdx: number, newChild: FiveWhyNode) => {
        const newChildren = [...(node.children || [])];
        newChildren[childIdx] = newChild;
        onUpdate({ ...node, children: newChildren });
    };

    const deleteChild = (childIdx: number) => {
        const newChildren = (node.children || []).filter((_, i) => i !== childIdx);
        onUpdate({ ...node, children: newChildren });
    };

    return (
        <div className={`relative pl-6 ${depth > 0 ? 'border-l-2 border-slate-200 ml-4' : ''}`}>
            <div className="absolute -left-[9px] top-6 w-4 h-4 rounded-full bg-slate-200 border-2 border-white"></div>

            {/* Context/Cause of this branch (if depth > 0) */}
            {depth > 0 && node.cause_effect !== undefined && (
                <div className="mb-2 flex items-center gap-2">
                    <CornerDownRight size={16} className="text-slate-400" />
                    <Input
                        value={node.cause_effect}
                        onChange={e => onUpdate({ ...node, cause_effect: e.target.value })}
                        className="bg-amber-50 border-amber-200 font-semibold text-amber-900 h-8 text-sm w-full md:w-1/2"
                        placeholder={t('wizard.step4.fiveWhys.previousCausePlaceholder')}
                    />
                    {canDelete && (
                        <button onClick={onDelete} className="p-1 text-slate-400 hover:text-red-500">
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
            )}

            {/* List of Whys for this Node */}
            <div className="space-y-3 bg-white p-4 rounded-lg border border-slate-200 shadow-sm mb-4">
                {(node.whys || []).map((why, idx) => (
                    <div key={idx} className="flex gap-3 items-start group">
                        <div className={`
                            flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                            ${why.level === 1 ? 'bg-red-100 text-red-700' :
                                why.level === 2 ? 'bg-orange-100 text-orange-700' :
                                    why.level === 3 ? 'bg-yellow-100 text-yellow-700' :
                                        why.level === 4 ? 'bg-green-100 text-green-700' :
                                            'bg-blue-100 text-blue-700'}
                        `}>
                            {why.level}
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                                {why.level === 1 ? t('wizard.step4.fiveWhys.whyDidProblemOccur') : t('wizard.step4.fiveWhys.whyLabel').replace('{0}', node.whys?.[idx - 1]?.answer?.substring(0, 20) || '')}
                            </label>
                            <div className="flex gap-2">
                                <Input
                                    value={why.answer}
                                    onChange={e => updateWhy(why.level, e.target.value)}
                                    placeholder={t('wizard.step4.fiveWhys.answerPlaceholder')}
                                    className="h-9"
                                />
                                {/* Only show delete if it's not the only one, or allow deleting all? 
                                    Usually we want at least 1, but user asked to delete. 
                                    Let's allow deleting any, but if list becomes empty, maybe auto-add lvl 1 empty?
                                    Actually, allowing empty list is fine, user can Add Why later. 
                                    But let's stick to simple: Delete button visibility. */}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteWhy(why.level)}
                                    className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity px-2"
                                    title={t('common.tooltips.deleteKey')}
                                >
                                    <Trash2 size={14} />
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}

                <div className="flex gap-2 pt-2">
                    {(node.whys || []).length < 5 && (
                        <Button variant="secondary" size="sm" onClick={addWhy} className="text-xs">
                            <Plus size={14} className="mr-1" /> {t('wizard.step4.fiveWhys.addWhy')}
                        </Button>
                    )}
                    {(node.whys || []).length >= 1 && (
                        <Button variant="secondary" size="sm" onClick={addChild} className="text-xs border-dashed text-slate-500">
                            <CornerDownRight size={14} className="mr-1" /> {t('wizard.step4.fiveWhys.branchCause')}
                        </Button>
                    )}
                </div>
            </div>

            {/* Recursion for Children */}
            {(node.children || []).map((child, idx) => (
                <NodeEditor
                    key={child.id}
                    node={child}
                    depth={depth + 1}
                    onUpdate={(updated) => updateChild(idx, updated)}
                    onDelete={() => deleteChild(idx)}
                    canDelete={true}
                />
            ))}
        </div>
    );
};

export const FiveWhysEditor: React.FC<FiveWhysEditorProps> = ({ chains, onChange }) => {
    const { t } = useLanguage();

    const addChain = () => {
        const newChain: FiveWhyChain = {
            chain_id: generateId('chain'),
            cause_effect: t('wizard.step4.fiveWhys.newInvestigationPath'),
            root_node: {
                id: generateId('node'),
                level: 0,
                whys: [{ level: 1, answer: '' }],
                children: []
            }
        };
        onChange([...chains, newChain]);
    };

    const updateChain = (idx: number, updatedChain: FiveWhyChain) => {
        const newChains = [...chains];
        newChains[idx] = updatedChain;
        onChange(newChains);
    };

    const deleteChain = (idx: number) => {
        const newChains = chains.filter((_, i) => i !== idx);
        onChange(newChains);
    };

    return (
        <div className="space-y-8">
            {chains.map((chain, idx) => (
                <div key={chain.chain_id} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex justify-between items-center mb-4">
                        <Input
                            value={chain.cause_effect}
                            onChange={e => updateChain(idx, { ...chain, cause_effect: e.target.value })}
                            className="font-bold text-lg bg-transparent border-none text-slate-800 focus:bg-white"
                            placeholder={t('wizard.step4.fiveWhys.pathTitlePlaceholder')}
                        />
                        <Button variant="ghost" size="sm" onClick={() => deleteChain(idx)} className="text-red-400 hover:text-red-600">
                            <Trash2 size={16} />
                        </Button>
                    </div>

                    <NodeEditor
                        node={chain.root_node}
                        depth={0}
                        onUpdate={u => updateChain(idx, { ...chain, root_node: u })}
                        onDelete={() => { }} // Cannot delete root node of a chain
                        canDelete={false}
                    />
                </div>
            ))}

            <Button onClick={addChain} variant="primary" className="w-full border-dashed border-2 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-300">
                <Plus size={20} className="mr-2" /> {t('wizard.step4.fiveWhys.addNewPath')}
            </Button>
        </div>
    );
};
