
import React, { useEffect, useRef } from 'react';
import anime from 'animejs';

interface AnimatedCounterProps {
    value: number;
    duration?: number;
    prefix?: string;
    suffix?: string;
    className?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
    value,
    duration = 1500,
    prefix = '',
    suffix = '',
    className = ''
}) => {
    const nodeRef = useRef<HTMLSpanElement>(null);
    const prevValueRef = useRef(0);

    useEffect(() => {
        const node = nodeRef.current;
        if (!node) return;

        // Animate from previous value to new value
        anime({
            targets: { val: prevValueRef.current },
            val: value,
            duration: duration,
            easing: 'easeOutExpo',
            round: 1,
            update: function (anim) {
                if (node) {
                    const val = Math.round(anim.animations[0].currentValue);
                    node.innerHTML = prefix + val.toLocaleString() + suffix;
                }
            },
            complete: function () {
                prevValueRef.current = value;
            }
        });

    }, [value, duration, prefix, suffix]);

    return <span ref={nodeRef} className={className}>{prefix}{value}{suffix}</span>;
};
