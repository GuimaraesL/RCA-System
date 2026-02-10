/**
 * Proposta: Componente de contador numérico animado.
 * Fluxo: Utiliza a função animateCounter para realizar a transição visual de um valor numérico do zero até o alvo, com suporte a prefixos customizados (ex: R$).
 */

import React, { useEffect, useRef } from 'react';
import { animateCounter } from '../../services/animations';
import { useLanguage } from '../../context/LanguageDefinition';

interface AnimatedCounterProps {
    value: number;
    prefix?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ value, prefix = '' }) => {
    const counterRef = useRef<HTMLSpanElement>(null);
    const { language } = useLanguage();

    useEffect(() => {
        if (counterRef.current) {
            const locale = language === 'pt' ? 'pt-BR' : 'en-US';
            animateCounter(counterRef.current, value, 1000, locale);
        }
    }, [value, language]);

    return (
        <span className="tabular-nums whitespace-nowrap">
            {prefix}<span ref={counterRef}>0</span>
        </span>
    );
};