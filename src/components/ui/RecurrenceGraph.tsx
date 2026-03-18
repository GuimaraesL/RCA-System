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
    const birthTimesRef = useRef<Map<string, number>>(new Map());

    // Timelapse State
    const [isTimelapseActive, setIsTimelapseActive] = useState(false);
    const [currentTime, setCurrentTime] = useState<number | null>(null);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [showInterconnections, setShowInterconnections] = useState(true);
    const [activeFilters, setActiveFilters] = useState({
        subgroup: true,
        equipment: true,
        area: true,
        discarded: showDiscarded
    });



    // Sincroniza filtro de descartados com prop externa (se necessário)
    useEffect(() => {
        setActiveFilters(prev => ({ ...prev, discarded: showDiscarded }));
    }, [showDiscarded]);

    // Get all unique dates sorted - Respecting active filters
    const allDates = useMemo(() => {
        const dates = new Set<number>();
        const extractDate = (rec: RecurrenceInfo) => {
            if (rec.failure_date) dates.add(new Date(rec.failure_date).getTime());
        };
        
        if (activeFilters.subgroup) recurrences.subgroup.forEach(extractDate);
        if (activeFilters.equipment) recurrences.equipment.forEach(extractDate);
        if (activeFilters.area) recurrences.area.forEach(extractDate);
        if (activeFilters.discarded) recurrences.discarded.forEach(extractDate);
        
        return Array.from(dates).sort((a, b) => a - b);
    }, [recurrences, activeFilters]);

    const isAtEnd = currentTime !== null && allDates.length > 0 && currentTime === allDates[allDates.length - 1];

    // Graph Data with Interconnections and Time Filtering
    const graphData = useMemo(() => {
        const nodesMap = new Map();
        const centralId = String(centralRca.id);
        
        // Helper to normalize cause for comparison
        const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '').trim();

        // Nó Central - Sempre Visível
        nodesMap.set(centralId, {
            id: centralId,
            name: centralRca.what || t('dnaMatrix.rcaAtual'),
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
                if (type === 'discarded' && !activeFilters.discarded) return;
                if (type === 'subgroup' && !activeFilters.subgroup) return;
                if (type === 'equipment' && !activeFilters.equipment) return;
                if (type === 'area' && !activeFilters.area) return;
                
                const nodeTime = item.failure_date ? new Date(item.failure_date).getTime() : 0;
                // Time filtering for Timelapse
                const isHiddenByTime = currentTime !== null && nodeTime > currentTime;
                
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

        // Limpa birthTimes que não estão mais no grafo (ex: após filtro)
        const currentBirthMap = birthTimesRef.current;
        const newNodeIds = new Set(nodesMap.keys());
        for (const id of currentBirthMap.keys()) {
            if (!newNodeIds.has(id)) currentBirthMap.delete(id);
        }

        // CRÍTICO: Deep Clone para evitar que mutações do D3 
        const finalNodes = Array.from(nodesMap.values()).map(node => {
            if (!node.isCentral && !currentBirthMap.has(node.id)) {
                currentBirthMap.set(node.id, performance.now());
            }
            return { ...node };
        });
        const finalLinks = links.map(link => ({ ...link }));

        return { 
            nodes: finalNodes, 
            links: finalLinks 
        };
    }, [centralRca, recurrences, activeFilters, currentTime, showInterconnections]);

    useEffect(() => {
        let interval: any;
        if (isTimelapseActive && allDates.length > 0) {
            interval = setInterval(() => {
                setCurrentTime(prev => {
                    if (prev === null) {
                        birthTimesRef.current.clear(); // Limpa no início
                        return allDates[0];
                    }
                    const currentIndex = allDates.indexOf(prev);
                    if (currentIndex === -1 || currentIndex >= allDates.length - 1) {
                        setIsTimelapseActive(false);
                        return prev;
                    }
                    return allDates[currentIndex + 1];
                });
            }, 2000 / playbackSpeed);
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
                <div className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-xl px-4 py-2 rounded-2xl border border-slate-200 dark:border-white/5 shadow-soft">
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)] animate-pulse" />
                        {t('wizard.step8.graphTitle')}
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
                                const now = performance.now();
                                const birthTime = birthTimesRef.current.get(node.id) || now;
                                const age = now - birthTime;
                                const animDuration = 1200; // 1200ms de suavização
                                const progress = Math.min(age / animDuration, 1);
                                const easedProgress = Math.sin((progress * Math.PI) / 2); // easeOutSine

                                const label = node.name;
                                const fontSize = 12 / globalScale;
                                ctx.font = `${node.isCentral ? 'bold' : 'normal'} ${fontSize}px Inter, system-ui, sans-serif`;
                                
                                // Desenha o nó (ponto) com escala animada
                                const baseSize = node.val || (node.isCentral ? 8 : 4);
                                const size = node.isCentral ? baseSize : baseSize * easedProgress;
                                
                                ctx.beginPath();
                                ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
                                
                                // Interpolação de opacidade se não for central
                                if (node.isCentral) {
                                    ctx.fillStyle = node.color;
                                } else {
                                    const baseOpacity = node.opacity || 1;
                                    const animatedOpacity = baseOpacity * easedProgress;
                                    // Converte cor hex para rgba para aplicar opacidade dinâmica
                                    // Se a cor já vier como rgba ou rgb, o canvas aceita com alpha global ou mantendo string
                                    ctx.globalAlpha = animatedOpacity;
                                    ctx.fillStyle = node.color;
                                }
                                
                                ctx.fill();
                                ctx.globalAlpha = 1.0; // Reset alpha

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
                                        ctx.fillStyle = isDark ? `rgba(148, 163, 184, ${Math.max(node.opacity, 0.6)})` : `rgba(71, 85, 105, ${Math.max(node.opacity, 0.4)})`;
                                    } else {
                                        ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
                                    }
                                    
                                    ctx.fillText(label, node.x, node.y + size + 2 + fontSize / 2);
                                }
                            }}
                            nodePointerAreaPaint={(node: any, color, ctx) => {
                                ctx.fillStyle = color;
                                const size = node.val || (node.isCentral ? 8 : 4);
                                ctx.beginPath();
                                ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
                                ctx.fill();
                            }}
                            linkCanvasObjectMode={() => 'replace'}
                            linkCanvasObject={(link: any, ctx, globalScale) => {
                                const s = link.source;
                                const t = link.target;
                                if (!s || !t || typeof s !== 'object' || typeof t !== 'object') return;

                                const now = performance.now();
                                const birthTime = birthTimesRef.current.get(t.id) || now;
                                const age = now - birthTime;
                                const animDuration = 1200;
                                const progress = Math.min(age / animDuration, 1);
                                const easedProgress = Math.sin((progress * Math.PI) / 2);

                                // Se o nó de destino ainda não "nasceu" visivelmente, não desenha o link
                                if (easedProgress <= 0) return;

                                // Cores baseadas no tema e tipo de link
                                let colorStr = "";
                                if (isDark) {
                                    colorStr = link.isSemantic ? `rgba(96, 165, 250, ${0.5 * easedProgress})` : `rgba(148, 163, 184, ${0.35 * easedProgress})`;
                                } else {
                                    colorStr = link.isSemantic ? `rgba(37, 99, 235, ${0.4 * easedProgress})` : `rgba(71, 85, 105, ${0.25 * easedProgress})`;
                                }

                                ctx.strokeStyle = colorStr;
                                ctx.lineWidth = 1 / globalScale;

                                // Desenha a curva
                                ctx.beginPath();
                                ctx.moveTo(s.x, s.y);

                                const curvature = 0.15;
                                if (!curvature) {
                                    ctx.lineTo(t.x, t.y);
                                } else {
                                    const dx = t.x - s.x;
                                    const dy = t.y - s.y;
                                    const dist = Math.sqrt(dx * dx + dy * dy);
                                    if (dist > 0) {
                                        const midX = (s.x + t.x) / 2;
                                        const midY = (s.y + t.y) / 2;
                                        const nx = -dy / dist;
                                        const ny = dx / dist;
                                        const offset = dist * curvature;
                                        ctx.quadraticCurveTo(midX + nx * offset, midY + ny * offset, t.x, t.y);
                                    } else {
                                        ctx.lineTo(t.x, t.y);
                                    }
                                }
                                ctx.stroke();
                            }}
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

            {/* Timelapse & View Controls Overlay - VERTICAL */}
            <div className="absolute top-1/2 -right-3 -translate-y-1/2 z-20 group-hover:right-6 transition-all duration-500">
                <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl p-2 rounded-2xl border border-slate-200 dark:border-white/10 shadow-soft flex flex-col items-center gap-2">
                    <Button
                        size="sm"
                        variant="ghost"
                        className="text-slate-600 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 h-10 w-10 p-0 rounded-xl"
                        onClick={() => {
                            if (isAtEnd) {
                                setCurrentTime(allDates[0]);
                                setIsTimelapseActive(true);
                            } else if (currentTime === null && !isTimelapseActive) {
                                setCurrentTime(allDates[0]);
                                setIsTimelapseActive(true);
                            } else {
                                setIsTimelapseActive(!isTimelapseActive);
                            }
                        }}
                        title={isTimelapseActive ? t('wizard.step8.tooltips.pause') : isAtEnd ? t('wizard.step8.tooltips.reset') : t('wizard.step8.tooltips.play')}
                    >
                        {isTimelapseActive ? <Pause size={20} /> : isAtEnd ? <RotateCcw size={20} /> : <Play size={20} />}
                    </Button>
                    <div className="w-6 h-[1px] bg-slate-200 dark:bg-white/20 my-1" />
                    <Button
                        size="sm"
                        variant="ghost"
                        className={`h-10 w-10 p-0 rounded-xl transition-all ${showInterconnections ? 'text-blue-600 dark:text-primary-400 bg-blue-50 dark:bg-primary-500/10' : 'text-slate-400'}`}
                        onClick={() => setShowInterconnections(!showInterconnections)}
                        title={t('wizard.step8.tooltips.mesh')}
                    >
                        <Share2 size={20} />
                    </Button>
                </div>
            </div>

            {/* Timeline Slider Overlay */}
            {allDates.length > 0 && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-[90%] max-w-2xl">
                    <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl px-6 py-4 rounded-3xl border border-slate-200 dark:border-white/10 shadow-soft">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 text-blue-600 dark:text-primary-400">
                                <Calendar size={14} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">
                                    {currentTime ? new Date(currentTime).toLocaleDateString() : t('wizard.step8.viewAll')}
                                </span>
                            </div>
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={() => setPlaybackSpeed(s => s === 1 ? 2 : s === 2 ? 4 : 1)}
                                    className="text-[10px] font-bold text-slate-400 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white transition-colors"
                                >
                                    {playbackSpeed}x {t('wizard.step8.speed')}
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
                            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-primary-500"
                        />
                    </div>
                </div>
            )}
            
            {graphData.nodes.length <= 1 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="text-xs text-slate-400 italic">{t('wizard.step8.centralNodeOnly')}</p>
                </div>
            )}
            
            {/* Legenda Interativa / Filtros */}
            <div className="absolute bottom-6 right-6 z-10 flex flex-col gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-3 rounded-2xl border border-slate-200 dark:border-white/10 shadow-soft min-w-[180px]">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 px-1">
                    {t('filters.title')}
                </p>
                
                <button 
                    onClick={() => setActiveFilters(prev => ({ ...prev, subgroup: !prev.subgroup }))}
                    className={`flex items-center justify-between gap-3 p-1.5 rounded-lg transition-all ${activeFilters.subgroup ? 'bg-blue-500/10 text-slate-800 dark:text-white' : 'opacity-40 grayscale text-slate-400'}`}
                >
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-tighter">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)]" /> 
                        {t('wizard.step8.recurrenceLevels.subgroup')}
                    </div>
                </button>

                <button 
                    onClick={() => setActiveFilters(prev => ({ ...prev, equipment: !prev.equipment }))}
                    className={`flex items-center justify-between gap-3 p-1.5 rounded-lg transition-all ${activeFilters.equipment ? 'bg-amber-500/10 text-slate-800 dark:text-white' : 'opacity-40 grayscale text-slate-400'}`}
                >
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-tighter">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]" /> 
                        {t('wizard.step8.recurrenceLevels.equipment')}
                    </div>
                </button>

                <button 
                    onClick={() => setActiveFilters(prev => ({ ...prev, area: !prev.area }))}
                    className={`flex items-center justify-between gap-3 p-1.5 rounded-lg transition-all ${activeFilters.area ? 'bg-emerald-500/10 text-slate-800 dark:text-white' : 'opacity-40 grayscale text-slate-400'}`}
                >
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-tighter">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" /> 
                        {t('wizard.step8.recurrenceLevels.area')}
                    </div>
                </button>

                <button 
                    onClick={() => setActiveFilters(prev => ({ ...prev, discarded: !prev.discarded }))}
                    className={`flex items-center justify-between gap-3 p-1.5 rounded-lg transition-all ${activeFilters.discarded ? 'bg-slate-500/10 text-slate-800 dark:text-white' : 'opacity-40 grayscale text-slate-400'}`}
                >
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-tighter">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> 
                        {t('wizard.step8.recurrenceLevels.discarded')}
                    </div>
                </button>
            </div>
        </div>
    );
};
