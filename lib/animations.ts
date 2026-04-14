import type { Variants } from 'framer-motion';

// Custom cubic bezier - must be typed as a const tuple for TS/Framer Motion compatibility
const easeOut = [0.22, 1, 0.36, 1] as [number, number, number, number];

export const fadeUp: Variants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: easeOut } },
};

export const fadeIn: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
};

export const scaleIn: Variants = {
    hidden: { opacity: 0, scale: 0.88 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.45, ease: easeOut } },
};

export const staggerContainer: Variants = {
    hidden: {},
    visible: {
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.05,
        },
    },
};

export const staggerItem: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.45, ease: easeOut },
    },
};

export const slideDown: Variants = {
    hidden: { opacity: 0, y: -16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: easeOut } },
    exit: { opacity: 0, y: -8, transition: { duration: 0.25, ease: 'easeIn' } },
};

export const popIn: Variants = {
    hidden: { opacity: 0, scale: 0.7 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: { type: 'spring', stiffness: 400, damping: 20 },
    },
};
