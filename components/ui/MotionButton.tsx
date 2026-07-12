'use client';

/**
 * MotionButton - A reusable button wrapper with micro-interaction press feedback.
 *
 * Applies a scale-down animation (0.96) for 100ms on press, with spring-back to 1.0.
 * Respects prefers-reduced-motion by disabling animation when the user prefers reduced motion.
 *
 * This component wraps Framer Motion's motion.button so that all interactive buttons
 * in the app can have consistent press feedback without repeating animation logic.
 *
 * Validates: Requirements 14.1, 14.5
 */

import React, { forwardRef } from 'react';
import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion';
import { buttonTapAnimation } from '@/lib/animations/microInteractions';

export type MotionButtonProps = HTMLMotionProps<'button'> & {
  /** Override the whileTap scale value. Defaults to 0.96. */
  tapScale?: number;
  children: React.ReactNode;
};

/**
 * An animated button that provides haptic-style visual feedback on press.
 * Scale-down 0.95-0.97 for 100ms, spring-back to 1.0.
 * Automatically disabled when prefers-reduced-motion is set.
 */
const MotionButton = forwardRef<HTMLButtonElement, MotionButtonProps>(
  ({ tapScale, children, whileTap, ...props }, ref) => {
    const prefersReducedMotion = useReducedMotion();

    const tapAnimation = prefersReducedMotion
      ? undefined
      : whileTap ?? { scale: tapScale ?? buttonTapAnimation.scale, transition: { duration: 0.1 } };

    return (
      <motion.button
        ref={ref}
        whileTap={tapAnimation}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);

MotionButton.displayName = 'MotionButton';

export default MotionButton;
