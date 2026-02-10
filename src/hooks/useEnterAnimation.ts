/**
 * Proposta: Hook para orquestração de animações de entrada (Fade-in/Slide-up).
 * Fluxo: Utiliza referências de DOM para capturar elementos filhos e aplicar animações escalonadas (staggered) através do serviço central de animações, garantindo que a interface seja fluida durante a carga de dados ou mudança de dependências.
 */

import { useEffect, useRef } from 'react';
import { animateEnterStaggered } from '../services/animations';

export const useEnterAnimation = (dependencies: any[] = []) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Executa a animação apenas se o container existir no DOM
        // Re-executa sempre que as dependências (ex: lista de dados) mudarem
        if (containerRef.current) {
            // Aplica um pequeno delay (50ms) para garantir que o DOM foi totalmente renderizado pelo React
            const timer = setTimeout(() => {
                if (containerRef.current?.children) {
                    // Transforma a HTMLCollection em Array para processamento pelo Anime.js
                    animateEnterStaggered(Array.from(containerRef.current.children));
                }
            }, 50);

            return () => clearTimeout(timer);
        }
    }, dependencies); 

    return containerRef;
};