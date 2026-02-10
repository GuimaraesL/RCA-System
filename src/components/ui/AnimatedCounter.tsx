/**
 * Proposta: Componente de contador numérico animado.
 * Fluxo: Utiliza a função animateCounter para realizar a transição visual de um valor numérico do zero até o alvo, com suporte a prefixos customizados (ex: R$).
 */

import React, { useEffect, useRef } from 'react';
import { animateCounter } from '../../services/animations';

interface AnimatedCounterProps {
    value: number;
    prefix?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ value, prefix = '' }) => {
    const counterRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (counterRef.current) {
            animateCounter(counterRef.current, value);
        }
    }, [value]);

    return (
        <span className="tabular-nums">
            {prefix}<span ref={counterRef}>0</span>
        </span>
    );
};