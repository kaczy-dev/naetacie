import { describe, it, expect } from 'vitest';
import {
  SPRING_PRESETS,
  computeCascadeStagger,
  cardEntranceVariants,
  modalMorphVariants,
  hoverTapScale,
} from '@/lib/motion/springs';
import {
  playUiSound,
  setUiSoundEnabled,
  isUiSoundEnabled,
} from '@/lib/motion/soundEngine';
import { fireConfetti } from '@/lib/motion/confettiEngine';

describe('Kinetic Motion Engine & Spring Physics', () => {
  describe('SPRING_PRESETS', () => {
    it('provides valid spring physics configurations', () => {
      expect(SPRING_PRESETS.snappy.stiffness).toBeGreaterThan(300);
      expect(SPRING_PRESETS.bouncy.damping).toBeLessThan(30);
      expect(SPRING_PRESETS.smooth.mass).toBe(1);
    });

    it('calculates cascade stagger with a max delay cap', () => {
      expect(computeCascadeStagger(0)).toBe(0);
      expect(computeCascadeStagger(2)).toBe(0.08);
      expect(computeCascadeStagger(20, 0.4)).toBe(0.4);
    });

    it('exposes Framer Motion variants with visible and hidden states', () => {
      expect(cardEntranceVariants.hidden.opacity).toBe(0);
      const visible = cardEntranceVariants.visible(1);
      expect(visible.opacity).toBe(1);
      expect(visible.scale).toBe(1);
    });

    it('defines modal morphing and scale presets', () => {
      expect(modalMorphVariants.hidden.opacity).toBe(0);
      expect(modalMorphVariants.visible.opacity).toBe(1);
      expect(hoverTapScale.hover.scale).toBe(1.025);
      expect(hoverTapScale.tap.scale).toBe(0.96);
    });
  });

  describe('Sound Synthesizer Engine & Confetti Burst', () => {
    it('allows toggling sound enabled state', () => {
      expect(isUiSoundEnabled()).toBe(true);
      setUiSoundEnabled(false);
      expect(isUiSoundEnabled()).toBe(false);
      setUiSoundEnabled(true);
      expect(isUiSoundEnabled()).toBe(true);
    });

    it('plays UI sounds safely without throwing', () => {
      expect(() => playUiSound('pop')).not.toThrow();
      expect(() => playUiSound('favorite')).not.toThrow();
      expect(() => playUiSound('success')).not.toThrow();
      expect(() => playUiSound('sparkle')).not.toThrow();
      expect(() => playUiSound('whoosh')).not.toThrow();
      expect(() => playUiSound('toggle')).not.toThrow();
    });

    it('fires confetti bursts without throwing in test environment', () => {
      expect(() => fireConfetti({ originX: 0.5, originY: 0.5, particleCount: 30 })).not.toThrow();
    });
  });
});
