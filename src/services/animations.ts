
import anime from 'animejs';

// Central configuration for animations to ensure consistency across the app
export const ANIMATION_CONFIG = {
    EASING_PREMIUM: 'cubicBezier(0.25, 1, 0.5, 1)',
    DURATION_SHORT: 400,
    DURATION_MEDIUM: 800,
    DURATION_LONG: 1200,
    STAGGER_DELAY: 50,
    SCALE_TINY: 0.95,
};

// Reusable animation functions
export const animateEnterStaggered = (targets: any, delay: number = 0) => {
    return anime({
        targets,
        opacity: [0, 1],
        translateY: [20, 0],
        delay: anime.stagger(ANIMATION_CONFIG.STAGGER_DELAY, { start: delay }),
        duration: ANIMATION_CONFIG.DURATION_MEDIUM,
        easing: ANIMATION_CONFIG.EASING_PREMIUM,
    });
};

export const animateModalEnter = (target: any) => {
    return anime({
        targets: target,
        opacity: [0, 1],
        scale: [0.9, 1],
        translateY: [50, 0],
        duration: 600,
        easing: 'cubicBezier(0.19, 1, 0.22, 1)', // Authentic spring-like feel
    });
};

export const animateCounter = (
    target: any,
    value: number,
    duration: number = 1000
) => {
    return anime({
        targets: target,
        innerHTML: [0, value],
        round: 1, // No decimals
        duration,
        easing: 'easeOutExpo',
    });
};
