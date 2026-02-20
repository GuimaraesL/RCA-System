/**
 * Proposta: Badge reutilizavel para exibicao de status de RCA, Trigger e Action.
 * Fluxo: Recebe o ID do status e o label traduzido, resolve automaticamente as classes visuais
 *        a partir do mapa centralizado em SystemConstants.
 */

import React from 'react';
import { getStatusBadgeStyle } from '../../constants/SystemConstants';

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    statusId: string;
    label: string;
    size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
    statusId,
    label,
    size = 'md',
    className = '',
    ...props
}) => {
    const baseStyles = 'inline-flex items-center justify-center font-black uppercase tracking-widest border';
    const colorStyles = getStatusBadgeStyle(statusId);

    const sizes = {
        sm: 'px-2.5 py-1 text-[9px] gap-1 rounded-lg',
        md: 'px-3 py-1.5 text-[10px] gap-1.5 rounded-lg',
    };

    return (
        <span
            className={`${baseStyles} ${colorStyles} ${sizes[size]} ${className}`}
            {...props}
        >
            {label}
        </span>
    );
};

StatusBadge.displayName = 'StatusBadge';
