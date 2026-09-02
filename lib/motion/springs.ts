/**
 * Na Etacie - Kinetic Motion & Spring Physics System (2026)
 * 
 * Provides unified, 60/120 FPS hardware-accelerated Framer Motion spring curves,
 * gesture damping constants, stagger cascades, and reduced-motion fallbacks.
 */

export const SPRING_PRESETS = {
  // Snappy for quick feedback: buttons, tabs, pill indicators
  snappy: {
    type: 'spring' as const,
    stiffness: 500,
    damping: 35,
    mass: 0.8,
  },
  // Bouncy for celebratory actions: likes, badges, sparkles
  bouncy: {
    type: 'spring' as const,
    stiffness: 420,
    damping: 22,
    mass: 0.9,
  },
  // Smooth for layout shifts: modals, drawers, collapsible accordions
  smooth: {
    type: 'spring' as const,
    stiffness: 280,
    damping: 30,
    mass: 1,
  },
  // Gentle for page transitions & background cards
  gentle: {
    type: 'spring' as const,
    stiffness: 180,
    damping: 24,
    mass: 1.1,
  },
  // Instant fallback for accessibility (prefers-reduced-motion)
  instant: {
    type: 'tween' as const,
    duration: 0.01,
  },
};

/**
 * Cascade stagger delay calculator.
 * Ensures items enter with progressive flow without causing frame drops.
 */
export function computeCascadeStagger(index: number, maxDelay = 0.4): number {
  return Math.min(index * 0.04, maxDelay);
}

/**
 * Standard card entrance animation variants.
 */
export const cardEntranceVariants = {
  hidden: {
    opacity: 0,
    y: 16,
    scale: 0.97,
  },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: computeCascadeStagger(index),
      ...SPRING_PRESETS.smooth,
    },
  }),
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.15 },
  },
};

/**
 * Modal & Sheet Morphing variants.
 */
export const modalMorphVariants = {
  hidden: {
    opacity: 0,
    scale: 0.92,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: SPRING_PRESETS.snappy,
  },
  exit: {
    opacity: 0,
    scale: 0.94,
    y: 15,
    transition: { duration: 0.16, ease: 'easeIn' },
  },
};

/**
 * Interactive Tap & Hover physical motion transforms.
 */
export const hoverTapScale = {
  hover: { scale: 1.025, transition: SPRING_PRESETS.snappy },
  tap: { scale: 0.96, transition: SPRING_PRESETS.snappy },
};

export const buttonPulseVariants = {
  initial: { scale: 1 },
  pulse: {
    scale: [1, 1.06, 1],
    transition: {
      duration: 0.4,
      repeat: 0,
      ease: 'easeOut',
    },
  },
};
