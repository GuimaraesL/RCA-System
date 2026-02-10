/**
 * Proposta: Componente de carregamento (Skeleton) para feedback visual de espera.
 * Fluxo: Renderiza blocos com animação de pulso para simular a estrutura do conteúdo durante a carga de dados.
 */

import React from 'react';

interface SkeletonProps {
    className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
    return (
        <div 
            className={`animate-pulse bg-slate-200 rounded-md ${className}`} 
            aria-hidden="true" 
        />
    );
};