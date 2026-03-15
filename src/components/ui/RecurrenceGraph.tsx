import React, { useMemo, useRef, useState, useEffect } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';
import { RecurrenceInfo } from '../../services/aiService';
import { RcaRecord } from '../../types';
import { useLanguage } from '../../context/LanguageDefinition';
import { AutoSizer } from 'react-virtualized-auto-sizer';

interface RecurrenceGraphProps {
    centralRca: RcaRecord;
    recurrences: {
        subgroup: RecurrenceInfo[];
        equipment: RecurrenceInfo[];
        area: RecurrenceInfo[];
        discarded: RecurrenceInfo[];
    };
    showDiscarded: boolean;
    onNodeClick: (recurrence: RecurrenceInfo) => void;
}

export const RecurrenceGraph: React.FC<RecurrenceGraphProps> = ({ 
    centralRca, 
    recurrences, 
    showDiscarded,
    onNodeClick 
}) => {
    const { t } = useLanguage();
    const fgRef = useRef<ForceGraphMethods>(null);

    const graphData = useMemo(() => {
        const nodesMap = new Map();
        const centralId = String(centralRca.id);
        
        // Nó Central
        nodesMap.set(centralId, {
            id: centralId,
            name: centralRca.what || 'RCA Atual',
            val: 6,
            color: '#3b82f6', // Bright Blue
            isCentral: true,
            type: 'center'
        });

        const links: any[] = [];

        const addLevel = (items: RecurrenceInfo[], color: string, type: string, opacity: number = 1) => {
            items.forEach(item => {
                if (type === 'discarded' && !showDiscarded) return;
                
                const nodeId = String(item.rca_id);
                if (!nodesMap.has(nodeId)) {
                    nodesMap.set(nodeId, {
                        id: nodeId,
                        name: item.title,
                        val: 3,
                        color: color,
                        opacity: opacity,
                        type: type,
                        data: item
                    });
                }

                links.push({
                    source: centralId,
                    target: nodeId,
                    type: type
                });
            });
        };

        addLevel(recurrences.subgroup, '#3b82f6', 'subgroup');
        addLevel(recurrences.equipment, '#f59e0b', 'equipment'); 
        addLevel(recurrences.area, '#10b981', 'area'); 
        addLevel(recurrences.discarded, '#94a3b8', 'discarded', 0.4); 

        return { 
            nodes: Array.from(nodesMap.values()), 
            links 
        };
    }, [centralRca, recurrences, showDiscarded]);

    // Configuração de forças para parecer com Obsidian (mais espaçado)
    useEffect(() => {
        if (fgRef.current) {
            fgRef.current.d3Force('link')?.distance(100);
            fgRef.current.d3Force('charge')?.strength(-150);
        }
    }, [graphData]);

    // Efeito para centralizar o grafo após carregar dados
    useEffect(() => {
        if (fgRef.current && graphData.nodes.length > 0) {
            const timer = setTimeout(() => {
                fgRef.current?.zoomToFit(600, 150);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [graphData]);

    return (
        <div className="w-full h-[750px] bg-[#020617] rounded-3xl border border-slate-800 overflow-hidden relative group">
            <div className="absolute top-6 left-6 z-20 flex gap-2 pointer-events-auto">
                <div className="bg-slate-900/50 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/5 shadow-2xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse" />
                        Neural Graph View
                    </p>
                </div>
            </div>

            <AutoSizer
                renderProp={({ height, width }) => {
                    if (!width || !height) return null;
                    
                    return (
                        <ForceGraph2D
                            ref={fgRef}
                            width={width}
                            height={height}
                            graphData={graphData}
                            d3VelocityDecay={0.3}
                            backgroundColor="rgba(0,0,0,0)"
                            nodeCanvasObject={(node: any, ctx, globalScale) => {
                                const label = node.name;
                                const fontSize = 12 / globalScale;
                                ctx.font = `${node.isCentral ? 'bold' : 'normal'} ${fontSize}px Inter, system-ui, sans-serif`;
                                
                                // Desenha o nó (ponto)
                                const size = node.val;
                                ctx.beginPath();
                                ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
                                ctx.fillStyle = node.color;
                                ctx.fill();

                                // Glow effect para o nó central
                                if (node.isCentral) {
                                    ctx.shadowColor = node.color;
                                    ctx.shadowBlur = 15;
                                    ctx.stroke();
                                    ctx.shadowBlur = 0;
                                }

                                // Desenha o texto (apenas se houver zoom suficiente ou se for central)
                                if (globalScale > 1.2 || node.isCentral) {
                                    const textWidth = ctx.measureText(label).width;
                                    const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

                                    ctx.fillStyle = 'rgba(2, 6, 23, 0.6)';
                                    ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y + size + 2, bckgDimensions[0], bckgDimensions[1]);

                                    ctx.textAlign = 'center';
                                    ctx.textBaseline = 'middle';
                                    ctx.fillStyle = node.opacity < 1 ? `rgba(148, 163, 184, ${node.opacity})` : '#f8fafc';
                                    ctx.fillText(label, node.x, node.y + size + 2 + fontSize / 2);
                                }
                            }}
                            linkColor={() => 'rgba(148, 163, 184, 0.15)'}
                            linkWidth={1}
                            onNodeClick={(node: any) => {
                                if (!node.isCentral) {
                                    onNodeClick(node.data);
                                }
                            }}
                            cooldownTicks={100}
                        />
                    );
                }}
            />
            
            {graphData.nodes.length <= 1 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="text-xs text-slate-400 italic">Central node only - Click "Search Recurrences" to expand map</p>
                </div>
            )}
            
            {/* Legend */}
            <div className="absolute bottom-4 right-4 z-10">
                <div className="flex flex-col gap-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-2 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-600" /> {t('wizard.step8.recurrenceLevels.subgroup')}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500" /> {t('wizard.step8.recurrenceLevels.equipment')}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" /> {t('wizard.step8.recurrenceLevels.area')}
                    </div>
                    {showDiscarded && (
                        <div className="flex items-center gap-2 opacity-50">
                            <span className="w-2 h-2 rounded-full bg-slate-400 " /> {t('wizard.step8.recurrenceLevels.discarded')}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
