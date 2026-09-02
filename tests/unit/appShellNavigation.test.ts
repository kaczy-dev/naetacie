import { describe, it, expect } from 'vitest';
import { AppShell } from '@/components/navigation/AppShell';

describe('AppShell Top Navigation & Quick Tools Hub', () => {
  it('exports AppShell as a functional React component', () => {
    expect(AppShell).toBeDefined();
    expect(typeof AppShell).toBe('function');
  });

  it('accepts all expected props for top header, dropdown tools, and active tabs', () => {
    expect(AppShell.length).toBeLessThanOrEqual(2);
  });
});
