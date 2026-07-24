import { describe, it, expect } from 'vitest';
import { CircuitBreaker } from './circuit-breaker';

describe('CircuitBreaker', () => {
  it('starts in CLOSED state and allows execution', () => {
    const cb = new CircuitBreaker();
    expect(cb.getState()).toBe('CLOSED');
    expect(cb.canExecute()).toBe(true);
  });

  it('opens after threshold failures', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, cooldownMs: 1000 });

    const failingTask = async () => {
      throw new Error('Network error');
    };

    await expect(cb.execute(failingTask)).rejects.toThrow('Network error');
    expect(cb.getState()).toBe('CLOSED');

    await expect(cb.execute(failingTask)).rejects.toThrow('Network error');
    expect(cb.getState()).toBe('OPEN');
    expect(cb.canExecute()).toBe(false);

    await expect(cb.execute(failingTask)).rejects.toThrow(/CircuitBreaker is OPEN/);
  });

  it('resets failure count on success', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 2 });

    await expect(cb.execute(async () => { throw new Error('fail'); })).rejects.toThrow();
    expect(cb.getState()).toBe('CLOSED');

    const result = await cb.execute(async () => 'ok');
    expect(result).toBe('ok');

    // After success, it needs 2 more failures to open
    await expect(cb.execute(async () => { throw new Error('fail'); })).rejects.toThrow();
    expect(cb.getState()).toBe('CLOSED');
  });
});
