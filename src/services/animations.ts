/**
 * Proposta: Configuração central e funções utilitárias para animações da interface.
 * Fluxo: Utiliza a biblioteca Anime.js para orquestrar transições visuais, com suporte a detecção de ambiente de testes (Playwright) para desativação automática.
 */

import anime from 'animejs';

// Configuração central de animações para garantir consistência visual em todo o app
export const ANIMATION_CONFIG = {
    EASING_PREMIUM: 'cubicBezier(0.25, 1, 0.5, 1)',
    DURATION_SHORT: 400,
    DURATION_MEDIUM: 800,
    DURATION_LONG: 1200,
    STAGGER_DELAY: 50,
    SCALE_TINY: 0.95,
};

/**
 * Anima a entrada de múltiplos elementos de forma escalonada (staggered).
 */
export const animateEnterStaggered = (targets: any, delay: number = 0) => {
    if ((window as any).isPlaywright || navigator.userAgent.includes('Playwright')) {
        anime.set(targets, { opacity: 1, translateY: 0 });
        return;
    }
    return anime({
        targets,
        opacity: [0, 1],
        translateY: [20, 0],
        delay: anime.stagger(ANIMATION_CONFIG.STAGGER_DELAY, { start: delay }),
        duration: ANIMATION_CONFIG.DURATION_MEDIUM,
        easing: ANIMATION_CONFIG.EASING_PREMIUM,
    });
};

/**
 * Anima a entrada de janelas modais com efeito de escala e deslocamento.
 */
export const animateModalEnter = (target: any) => {
    if ((window as any).isPlaywright || navigator.userAgent.includes('Playwright')) {
        anime.set(target, { opacity: 1, scale: 1, translateY: 0 });
        return;
    }
    return anime({
        targets: target,
        opacity: [0, 1],
        scale: [0.9, 1],
        translateY: [50, 0],
        duration: 600,
        easing: 'cubicBezier(0.19, 1, 0.22, 1)', 
    });
};

/**
 * Anima contadores numéricos de 0 até o valor final.
 */
export const animateCounter = (
    target: any,
    value: number,
    duration: number = 1000
) => {
    if ((window as any).isPlaywright || navigator.userAgent.includes('Playwright')) {
        target.innerHTML = value;
        return;
    }
    return anime({
        targets: target,
        innerHTML: [0, value],
        round: 1, // Remove decimais durante a animação
        duration,
        easing: 'easeOutExpo',
    });
};