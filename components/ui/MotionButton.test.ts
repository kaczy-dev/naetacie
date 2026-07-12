/**
 * Unit tests for the MotionButton component and micro-interactions module.
 *
 * Validates: Requirements 14.1, 14.5
 */

import { describe, it, expect } from 'vitest';
import {
  buttonTapAnimation,
  getButtonTapProps,
  tabIndicatorTransition,
  TAB_ICON_SCALE_ACTIVE,
  TAB_ICON_SCALE_INACTIVE,
  STAGGER_DELAY_MS,
  computeStaggerDelaySec,
  getListItemVariants,
  listItemVariants,
  listItemVariantsReduced,
} from '@/lib/animations/microInteractions';

describe('microInteractions module', () => {
  describe('buttonTapAnimation', () => {
    it('should have scale between 0.95 and 0.97', () => {
      expect(buttonTapAnimation.scale).toBeGreaterThanOrEqual(0.95);
      expect(buttonTapAnimation.scale).toBeLessThanOrEqual(0.97);
    });

    it('should have duration of 100ms (0.1 seconds)', () => {
      expect(buttonTapAnimation.transition.duration).toBe(0.1);
    });
  });

  describe('getButtonTapProps', () => {
    it('should return whileTap animation when reduced motion is false', () => {
      const props = getButtonTapProps(false);
      expect(props.whileTap).toEqual(buttonTapAnimation);
    });

    it('should return empty object when reduced motion is true', () => {
      const props = getButtonTapProps(true);
      expect(props.whileTap).toBeUndefined();
      expect(props).toEqual({});
    });

    it('should return whileTap animation when reduced motion is null (not resolved yet)', () => {
      const props = getButtonTapProps(null);
      expect(props.whileTap).toEqual(buttonTapAnimation);
    });
  });

  describe('tabIndicatorTransition', () => {
    it('should have 200ms duration (0.2 seconds)', () => {
      expect(tabIndicatorTransition.duration).toBe(0.2);
    });

    it('should use ease-out timing function', () => {
      expect(tabIndicatorTransition.ease).toBe('easeOut');
    });
  });

  describe('TAB_ICON_SCALE constants', () => {
    it('should have active scale greater than inactive', () => {
      expect(TAB_ICON_SCALE_ACTIVE).toBeGreaterThan(TAB_ICON_SCALE_INACTIVE);
    });

    it('should have inactive scale of 1.0', () => {
      expect(TAB_ICON_SCALE_INACTIVE).toBe(1.0);
    });

    it('should have active scale between 1.1 and 1.2', () => {
      expect(TAB_ICON_SCALE_ACTIVE).toBeGreaterThanOrEqual(1.1);
      expect(TAB_ICON_SCALE_ACTIVE).toBeLessThanOrEqual(1.2);
    });
  });

  describe('stagger animation utilities', () => {
    it('should have STAGGER_DELAY_MS set to 50', () => {
      expect(STAGGER_DELAY_MS).toBe(50);
    });

    it('should compute stagger delay in seconds from index', () => {
      expect(computeStaggerDelaySec(0)).toBe(0);
      expect(computeStaggerDelaySec(1)).toBe(0.05);
      expect(computeStaggerDelaySec(2)).toBe(0.1);
      expect(computeStaggerDelaySec(10)).toBe(0.5);
    });
  });

  describe('getListItemVariants', () => {
    it('should return full animation variants when reduced motion is false', () => {
      const variants = getListItemVariants(false);
      expect(variants).toBe(listItemVariants);
    });

    it('should return reduced motion variants when reduced motion is true', () => {
      const variants = getListItemVariants(true);
      expect(variants).toBe(listItemVariantsReduced);
    });

    it('reduced variants should show items without animation', () => {
      expect(listItemVariantsReduced.hidden).toEqual({ opacity: 1, y: 0 });
      expect(listItemVariantsReduced.visible).toEqual({ opacity: 1, y: 0 });
    });

    it('full variants hidden should start with opacity 0 and y offset', () => {
      expect(listItemVariants.hidden).toEqual({ opacity: 0, y: 8 });
    });
  });
});
