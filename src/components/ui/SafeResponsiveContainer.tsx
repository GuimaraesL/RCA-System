import React, { useEffect, useRef, useState } from 'react';
import { ResponsiveContainer, ResponsiveContainerProps } from 'recharts';

export const SafeResponsiveContainer = (props: ResponsiveContainerProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                if (width > 0 && height > 0) {
                    setShouldRender(true);
                } else {
                    // Optional: hide if it collapses, but usually we just want to wait for first valid size
                }
            }
        });

        resizeObserver.observe(containerRef.current);

        return () => resizeObserver.disconnect();
    }, []);

    return (
        <div ref={containerRef} style={{ width: props.width || '100%', height: props.height || '100%', minWidth: props.minWidth, minHeight: props.minHeight }} className={props.className}>
            {shouldRender && (
                <ResponsiveContainer {...props}>
                    {props.children}
                </ResponsiveContainer>
            )}
        </div>
    );
};
