
import { useEffect, useRef } from 'react';
import { animateEnterStaggered } from '../services/animations';

export const useEnterAnimation = (dependencies: any[] = []) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const hasAnimated = useRef(false);

    useEffect(() => {
        // Only run if we have elements and (optionally) if we haven't animated yet
        // For lists that update, we might want to re-run, so we reset on dependency change
        if (containerRef.current) {
            // Select direct children or specific class if needed
            // For now, assume direct children need staggering
            // We use a small timeout to ensure DOM is ready
            const timer = setTimeout(() => {
                if (containerRef.current?.children) {
                    animateEnterStaggered(Array.from(containerRef.current.children));
                }
            }, 50);

            return () => clearTimeout(timer);
        }
    }, dependencies); // Run when these dependencies change

    return containerRef;
};
