'use client';

/**
 * Reusable micro-interaction animation constants and utilities.
 *
 * Provides standardized motion presets for the app:
 * - Button press: scale-down 0.95-0.97 for 100ms, spring-back to 1.0
 * - Tab indicator: 200ms ease-out transition for color + scale
 * - List stagger: 50ms delay per item, fade-in + translateY(8px → 0)
 *
 * All animations respect prefers-reduced-motion via the `useReducedMotion()` hook.
 *
 * Validates: Requirements 14.1, 14.2, 14.3, 14.5
 */

import type { Variants, Transition } from 'framer-motion';

// ---------- Button Press Animation (Requirement 14.1) ----------

/**
 * Button press animation: scale-down to 0.96 for ~100ms duration,
 * then spring-back to 1.0.
 */
export const buttonTapAnimation = {
  scale: 0.96,
  transition: { duration: 0.1 },
};

/**
 * Reduced motion variant: no visual scale change on press.
 */
export const buttonTapAnimationReduced = undefined;

/**
 * Returns the appropriate whileTap prop for a motion element.
 * Respects prefers-reduced-motion.
 */
export function getButtonTapProps(prefersReducedMotion: boolean | null) {
  if (prefersReducedMotion) {
    return {};
  }
  return {
    whileTap: buttonTapAnimation,
  };
}

// ---------- Tab Indicator Animation (Requirement 14.2) ----------

/**
 * Active indicator animation transition for BottomNav tabs.
 * 200ms ease-out for color and icon scale changes.
 */
export const tabIndicatorTransition: Transition = {
  duration: 0.2,
  ease: 'easeOut',
};

/**
 * Scale values for tab icons.
 */
export const TAB_ICON_SCALE_ACTIVE = 1.15;
export const TAB_ICON_SCALE_INACTIVE = 1.0;

// ---------- List Stagger Animation (Requirement 14.3) ----------

/**
 * Stagger delay per item in milliseconds.
 */
export const STAGGER_DELAY_MS = 50;

/**
 * Computes stagger delay for a list item based on its index.
 * Returns delay in seconds for use with Framer Motion.
 */
export function computeStaggerDelaySec(index: number): number {
  return (index * STAGGER_DELAY_MS) / 1000;
}

/**
 * Card/list item entrance animation variants.
 * Fade-in + translateY(8px → 0) with stagger.
 */
export const listItemVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: computeStaggerDelaySec(index),
      duration: 0.3,
      ease: 'easeOut',
    },
  }),
};

/**
 * Reduced motion list item variants — instant appearance, no animation.
 */
export const listItemVariantsReduced: Variants = {
  hidden: { opacity: 1, y: 0 },
  visible: { opacity: 1, y: 0 },
};

/**
 * Returns appropriate list item animation variants based on motion preference.
 */
export function getListItemVariants(prefersReducedMotion: boolean | null): Variants {
  return prefersReducedMotion ? listItemVariantsReduced : listItemVariants;
}

// ---------- Toast Animation (Requirement 14.4) ----------

/**
 * Toast entrance animation: slide-in from top with spring.
 */
export const toastEnterVariants: Variants = {
  hidden: { y: -50, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
      duration: 0.3,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.2 },
  },
};

export const toastEnterVariantsReduced: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0 } },
  exit: { opacity: 0, transition: { duration: 0 } },
};
