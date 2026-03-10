import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { useLanguage } from '../../context/LanguageDefinition';
import { Maximize2, X as CloseIcon } from 'lucide-react';

mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'strict',
    fontFamily: 'Inter, sans-serif',
});

interface MermaidProps {
    chart: string;
}

export const Mermaid: React.FC<MermaidProps> = ({ chart }) => {
    const { t } = useLanguage();
    const ref = useRef<HTMLDivElement>(null);
    const [svg, setSvg] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        const renderChart = async () => {
            if (!chart) return;

            try {
                const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
                setError(null);

                const { svg: renderedSvg } = await mermaid.render(id, chart);
                setSvg(renderedSvg);
            } catch (err) {
                console.error('Mermaid render error:', err);
                setError(t('errors.somethingWentWrong', ['Mermaid']));
            }
        };

        renderChart();
    }, [chart, t]);

    if (error) {
        return (
            <div className="p-4 bg-red-50 border border-red-200 rounded text-red-600 text-xs font-mono whitespace-pre overflow-x-auto">
                {error}
                <pre className="mt-2 text-[10px] opacity-70">{chart}</pre>
            </div>
        );
    }

    return (
        <>
            <div
                className="relative group w-full"
                onClick={() => setIsExpanded(true)}
            >
                <div
                    ref={ref}
                    className="mermaid-container flex justify-center py-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 my-4 shadow-sm overflow-x-auto"
                    dangerouslySetInnerHTML={{ __html: svg }}
                />
                <div className="absolute top-6 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-white/80 dark:bg-slate-800/80 rounded-lg shadow-sm cursor-pointer z-10 border border-slate-200 dark:border-slate-700">
                    <Maximize2 size={16} className="text-slate-600 dark:text-slate-300" />
                </div>
            </div>

            {/* Expanded View Modal */}
            {isExpanded && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                    onClick={() => setIsExpanded(false)}
                >
                    <div
                        className="bg-white dark:bg-slate-900 w-full max-w-6xl max-h-[90vh] rounded-2xl shadow-2xl relative overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('wizard.step4.ishikawaTitle')}</h3>
                            <button
                                onClick={() => setIsExpanded(false)}
                                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                <CloseIcon size={20} className="text-slate-500" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-4 md:p-8 flex items-center justify-center bg-white dark:bg-slate-900">
                            <div
                                className="mermaid-expanded w-full h-full flex items-center justify-center scale-150 origin-center"
                                dangerouslySetInnerHTML={{ __html: svg }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

