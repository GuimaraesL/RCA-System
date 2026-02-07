
import React from 'react';

interface SkeletonProps {
    className?: string;
    variant?: 'circle' | 'rect' | 'text';
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, variant = 'rect' }) => {
    const baseClasses = "bg-slate-200 animate-pulse";
    const variantClasses = {
        circle: "rounded-full",
        rect: "rounded-lg",
        text: "rounded h-4 w-full"
    };

    return (
        <div className={`${baseClasses} ${variantClasses[variant]} ${className}`} />
    );
};
