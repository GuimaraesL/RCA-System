import React, { useEffect, useRef, useState } from 'react';
import { ResponsiveContainer, ResponsiveContainerProps } from 'recharts';

export const SafeResponsiveContainer = (props: ResponsiveContainerProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState<{ width: number, height: number } | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                if (width > 0 && height > 0) {
                    setDimensions({ width, height });
                }
            }
        });

        resizeObserver.observe(containerRef.current);

        return () => resizeObserver.disconnect();
    }, []);

    const { width, height, minWidth, minHeight, children, className, ...rest } = props;

    return (
        <div 
            ref={containerRef} 
            style={{ 
                width: width || '100%', 
                height: height || '100%', 
                minWidth: minWidth, 
                minHeight: minHeight 
            }} 
            className={className}
        >
            {dimensions && (
                <ResponsiveContainer 
                    {...rest}
                    width={dimensions.width} 
                    height={dimensions.height}
                >
                    {children}
                </ResponsiveContainer>
            )}
        </div>
    );
};
