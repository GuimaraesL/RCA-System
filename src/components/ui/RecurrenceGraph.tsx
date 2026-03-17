import React, { useMemo, useRef, useEffect, useState } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';
import { RecurrenceInfo, SemanticLink } from '../../services/aiService';
import { RcaRecord } from '../../types';
import { useLanguage } from '../../context/LanguageDefinition';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import { useTheme } from '../../context/ThemeContext';
import { Play, Pause, RotateCcw, Share2, Calendar } from 'lucide-react';
import { Button } from './Button';

interface RecurrenceGraphProps {
    centralRca: RcaRecord;
    recurrences: {
        subgroup: RecurrenceInfo[];
        equipment: RecurrenceInfo[];
        area: RecurrenceInfo[];
        discarded: RecurrenceInfo[];
        semantic_links?: SemanticLink[];
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
    const { isDark } = useTheme();
    const fgRef = useRef<ForceGraphMethods>(null);

    // Timelapse State
    const [isTimelapseActive, setIsTimelapseActive] = useState(false);
    const [currentTime, setCurrentTime] = useState<number | null>(null);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [showInterconnections, setShowInterconnections] = useState(true);

    // Get all unique dates sorted
    const allDates = useMemo(() => {
        const dates = new Set<number>();
        const extractDate = (rec: RecurrenceInfo) => {
            if (rec.failure_date) dates.add(new Date(rec.failure_date).getTime());
        };
        recurrences.subgroup.forEach(extractDate);
        recurrences.equipment.forEach(extractDate);
        recurrences.area.forEach(extractDate);
        if (showDiscarded) recurrences.discarded.forEach(extractDate);
        
        return Array.from(dates).sort((a, b) => a - b);
    }, [recurrences, showDiscarded]);

    // Graph Data with Interconnections and Time Filtering
    const graphData = useMemo(() => {
        const nodesMap = new Map();
        const centralId = String(centralRca.id);
        
        // Helper to normalize cause for comparison
        const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '').trim();

        // Nó Central - Sempre Visível
        nodesMap.set(centralId, {
            id: centralId,
            name: centralRca.what || 'RCA Atual',
            val: 8,
            color: '#3b82f6',
            isCentral: true,
            type: 'center',
            causes: (centralRca.root_causes || []).map(c => normalize(c.cause)),
            opacity: 1
        });

        const links: any[] = [];

        const addLevel = (items: RecurrenceInfo[], color: string, type: string, opacity: number = 1) => {
            items.forEach(item => {
                if (type === 'discarded' && !showDiscarded) return;
                
                const nodeTime = item.failure_date ? new Date(item.failure_date).getTime() : 0;
                // Time filtering for Timelapse
                const isHiddenByTime = currentTime !== null && nodeTime > currentTime;
                
                // CRÍTICO: Se estiver oculto pelo tempo, não adicionamos ao grafo nesta iteração
                if (isHiddenByTime) return;

                const nodeId = String(item.rca_id);
                if (!nodesMap.has(nodeId)) {
                    const nodeCauses = (item.root_causes || '').split('\n')
                        .map(c => normalize(c.replace(/^[-\*\s]+/, '')))
                        .filter(Boolean);

                    nodesMap.set(nodeId, {
                        id: nodeId,
                        name: item.title,
                        val: 4,
                        color: color,
                        opacity: opacity,
                        type: type,
                        data: item,
                        time: nodeTime,
                        causes: nodeCauses
                    });
                }

                links.push({
                    source: centralId,
                    target: nodeId,
                    type: type,
                    value: 1
                });
            });
        };

        addLevel(recurrences.subgroup, '#3b82f6', 'subgroup');
        addLevel(recurrences.equipment, '#f59e0b', 'equipment'); 
        addLevel(recurrences.area, '#10b981', 'area'); 
        addLevel(recurrences.discarded, '#94a3b8', 'discarded', 0.4); 

        // Interconnections logic (Neural Mesh) - Using Semantic Links from Backend
        if (showInterconnections && recurrences.semantic_links && recurrences.semantic_links.length > 0) {
            recurrences.semantic_links.forEach(link => {
                if (nodesMap.has(link.source) && nodesMap.has(link.target)) {
                    links.push({
                        source: link.source,
                        target: link.target,
                        type: 'interconnection',
                        value: link.score,
                        isSemantic: true
                    });
                }
            });
        } else if (showInterconnections) {
            // Fallback for direct text comparison (Legacy Root Causes)
            const visibleNodes = Array.from(nodesMap.values());
            for (let i = 0; i < visibleNodes.length; i++) {
                for (let j = i + 1; j < visibleNodes.length; j++) {
                    const n1 = visibleNodes[i];
                    const n2 = visibleNodes[j];
                    if (n1.isCentral || n2.isCentral || !n1.causes || !n2.causes) continue;
                    
                    const sharedCauses = n1.causes.filter((c: string) => n2.causes.includes(c));
                    if (sharedCauses.length > 0) {
                        links.push({
                            source: n1.id,
                            target: n2.id,
                            type: 'interconnection',
                            value: 0.5,
                            isSharedRecord: true
                        });
                    }
                }
            }
        }

        return { 
            nodes: Array.from(nodesMap.values()), 
            links 
        };
    }, [centralRca, recurrences, showDiscarded, currentTime, showInterconnections]);

    // Timelapse Timer
    useEffect(() => {
        let interval: any;
        if (isTimelapseActive && allDates.length > 0) {
            interval = setInterval(() => {
                setCurrentTime(prev => {
                    if (prev === null) return allDates[0];
                    const currentIndex = allDates.indexOf(prev);
                    if (currentIndex === -1 || currentIndex >= allDates.length - 1) {
                        setIsTimelapseActive(false);
                        return prev;
                    }
                    return allDates[currentIndex + 1];
                });
            }, 1000 / playbackSpeed);
        }
        return () => clearInterval(interval);
    }, [isTimelapseActive, allDates, playbackSpeed]);

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
        <div className="w-full h-[750px] bg-white dark:bg-[#020617] rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden relative group">
            <div className="absolute top-6 left-6 z-20 flex gap-2 pointer-events-auto">
                <div className="bg-slate-50/80 dark:bg-slate-900/50 backdrop-blur-xl px-4 py-2 rounded-2xl border border-slate-200 dark:border-white/5 shadow-2xl">
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
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

                                    // Adaptativo ao tema
                                    ctx.fillStyle = isDark ? 'rgba(2, 6, 23, 0.6)' : 'rgba(255, 255, 255, 0.8)';
                                    ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y + size + 2, bckgDimensions[0], bckgDimensions[1]);

                                    ctx.textAlign = 'center';
                                    ctx.textBaseline = 'middle';
                                    
                                    // Cor do texto baseada no tema
                                    if (node.opacity < 1) {
                                        ctx.fillStyle = isDark ? `rgba(148, 163, 184, ${node.opacity})` : `rgba(71, 85, 105, ${node.opacity})`;
                                    } else {
                                        ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
                                    }
                                    
                                    ctx.fillText(label, node.x, node.y + size + 2 + fontSize / 2);
                                }
                            }}
                            linkColor={() => isDark ? 'rgba(148, 163, 184, 0.15)' : 'rgba(71, 85, 105, 0.1)'}
                            linkWidth={1}
                            onNodeClick={(node: any) => {
                                if (!node.isCentral) {
                                    onNodeClick(node.data);
                                }
                            }}
                            cooldownTicks={100}
                            linkDirectionalParticles={2}
                            linkDirectionalParticleSpeed={d => (d as any).isSemantic ? (d as any).value * 0.005 : 0.005}
                            linkDirectionalParticleWidth={1.5}
                            linkCurvature={0.15}
                        />
                    );
                }}
            />

            {/* Timelapse & View Controls Overlay */}
            <div className="absolute top-6 right-6 z-20 flex flex-col gap-3">
                <div className="bg-slate-900/80 backdrop-blur-xl p-1.5 rounded-2xl border border-white/10 shadow-2xl flex items-center gap-1">
                    <Button
                        size="sm"
                        variant="ghost"
                        className="text-white hover:bg-white/10 h-8 w-8 p-0"
                        onClick={() => setIsTimelapseActive(!isTimelapseActive)}
                    >
                        {isTimelapseActive ? <Pause size={16} /> : <Play size={16} />}
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="text-white hover:bg-white/10 h-8 w-8 p-0"
                        onClick={() => {
                            setIsTimelapseActive(false);
                            setCurrentTime(null);
                        }}
                    >
                        <RotateCcw size={16} />
                    </Button>
                    <div className="h-4 w-[1px] bg-white/20 mx-1" />
                    <Button
                        size="sm"
                        variant="ghost"
                        className={`h-8 w-8 p-0 ${showInterconnections ? 'text-primary-400 bg-primary-500/10' : 'text-slate-400'}`}
                        onClick={() => setShowInterconnections(!showInterconnections)}
                        title="Neural Mesh (Interconexões)"
                    >
                        <Share2 size={16} />
                    </Button>
                </div>
            </div>

            {/* Timeline Slider Overlay */}
            {allDates.length > 0 && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-[90%] max-w-2xl">
                    <div className="bg-slate-900/80 backdrop-blur-xl px-6 py-4 rounded-3xl border border-white/10 shadow-2xl">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 text-primary-400">
                                <Calendar size={14} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">
                                    {currentTime ? new Date(currentTime).toLocaleDateString() : 'Ver Todas'}
                                </span>
                            </div>
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={() => setPlaybackSpeed(s => s === 1 ? 2 : s === 2 ? 4 : 1)}
                                    className="text-[10px] font-bold text-slate-400 hover:text-white transition-colors"
                                >
                                    {playbackSpeed}x SPEED
                                </button>
                            </div>
                        </div>
                        <input 
                            type="range" 
                            min={0} 
                            max={allDates.length - 1} 
                            value={currentTime === null ? allDates.length - 1 : allDates.indexOf(currentTime)}
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setCurrentTime(val === allDates.length - 1 && currentTime === null ? null : allDates[val]);
                            }}
                            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
                        />
                    </div>
                </div>
            )}
            
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
