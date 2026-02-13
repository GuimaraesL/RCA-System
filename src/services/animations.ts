/**
 * Proposta: Configuração central e funções utilitárias para animações da interface.
 * Fluxo: Utiliza a biblioteca Anime.js para orquestrar transições visuais complexas (stagger, counters),
 * enquanto animações de layout básicas (modais) foram migradas para CSS puro (Tailwind).
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
    if (!targets) return;
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
 * Anima contadores numéricos de 0 até o valor final com formatação de localidade.
 */
export const animateCounter = (
    target: HTMLElement | null,
    value: number,
    duration: number = 1000,
    locale: string = 'pt-BR'
) => {
    if (!target) return;
    if ((window as any).isPlaywright || navigator.userAgent.includes('Playwright')) {
        target.textContent = new Intl.NumberFormat(locale, {
            minimumFractionDigits: value % 1 !== 0 ? 1 : 0,
            maximumFractionDigits: 2
        }).format(value);
        return;
    }

    const obj = { val: 0 };
    return anime({
        targets: obj,
        val: value,
        duration,
        easing: 'easeOutExpo',
        update: () => {
            target.textContent = new Intl.NumberFormat(locale, {
                minimumFractionDigits: value % 1 !== 0 ? 1 : 0,
                maximumFractionDigits: 2
            }).format(obj.val);
        }
    });
};
