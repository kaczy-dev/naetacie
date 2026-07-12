import { describe, it, expect, beforeEach } from 'vitest';
import { USER_AGENTS, getNextUserAgent, resetUserAgentRotation } from './user-agents';

describe('USER_AGENTS', () => {
  it('contains at least 5 entries', () => {
    expect(USER_AGENTS.length).toBeGreaterThanOrEqual(5);
  });

  it('contains only non-empty strings', () => {
    for (const ua of USER_AGENTS) {
      expect(ua.trim().length).toBeGreaterThan(0);
    }
  });

  it('contains unique entries', () => {
    const unique = new Set(USER_AGENTS);
    expect(unique.size).toBe(USER_AGENTS.length);
  });
});

describe('getNextUserAgent', () => {
  beforeEach(() => {
    resetUserAgentRotation();
  });

  it('returns a different User-Agent on each consecutive call', () => {
    const first = getNextUserAgent();
    const second = getNextUserAgent();
    expect(first).not.toBe(second);
  });

  it('cycles through all User-Agents in order', () => {
    const results: string[] = [];
    for (let i = 0; i < USER_AGENTS.length; i++) {
      results.push(getNextUserAgent());
    }
    expect(results).toEqual(USER_AGENTS);
  });

  it('wraps around after exhausting the list', () => {
    // Exhaust the full list
    for (let i = 0; i < USER_AGENTS.length; i++) {
      getNextUserAgent();
    }
    // Next call should return the first entry again
    const wrapped = getNextUserAgent();
    expect(wrapped).toBe(USER_AGENTS[0]);
  });

  it('works with a custom agent list', () => {
    const custom = ['Agent-A', 'Agent-B', 'Agent-C'];
    resetUserAgentRotation();
    expect(getNextUserAgent(custom)).toBe('Agent-A');
    expect(getNextUserAgent(custom)).toBe('Agent-B');
    expect(getNextUserAgent(custom)).toBe('Agent-C');
    expect(getNextUserAgent(custom)).toBe('Agent-A');
  });

  it('throws on empty agent list', () => {
    expect(() => getNextUserAgent([])).toThrow('User-Agent list must not be empty');
  });
});

describe('resetUserAgentRotation', () => {
  it('resets the rotation index to the beginning', () => {
    getNextUserAgent(); // advance
    getNextUserAgent(); // advance again
    resetUserAgentRotation();
    expect(getNextUserAgent()).toBe(USER_AGENTS[0]);
  });
});
