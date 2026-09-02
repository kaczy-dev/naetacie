import { describe, it, expect } from 'vitest';
import { AdaptiveMobileTopBar } from '@/components/navigation/AdaptiveMobileTopBar';
import { isUiSoundEnabled, toggleUiSound, setUiSoundEnabled } from '@/lib/motion/soundEngine';

describe('AdaptiveMobileTopBar Component & Logic Unit Tests', () => {
  it('exports AdaptiveMobileTopBar component function', () => {
    expect(typeof AdaptiveMobileTopBar).toBe('function');
    expect(AdaptiveMobileTopBar.name).toBe('AdaptiveMobileTopBar');
  });

  it('handles sound toggle state correctly for the top bar', () => {
    setUiSoundEnabled(true);
    expect(isUiSoundEnabled()).toBe(true);

    const toggled = toggleUiSound();
    expect(toggled).toBe(false);
    expect(isUiSoundEnabled()).toBe(false);

    const reToggled = toggleUiSound();
    expect(reToggled).toBe(true);
    expect(isUiSoundEnabled()).toBe(true);
  });
});
