import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import { withErrorSanitization } from './errorSanitizer';

describe('withErrorSanitization', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the handler response when no error is thrown', async () => {
    const handler = async () =>
      NextResponse.json({ data: 'ok' }, { status: 200 });

    const wrapped = withErrorSanitization(handler);
    const response = await wrapped();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ data: 'ok' });
  });

  it('returns generic 500 response when handler throws an Error', async () => {
    const handler = async () => {
      throw new Error('Database connection failed at /src/db/pool.ts:42');
    };

    const wrapped = withErrorSanitization(handler);
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await wrapped();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: 'Internal server error' });
    consoleErrorSpy.mockRestore();
  });

  it('does not expose stack traces in the response', async () => {
    const error = new Error('secret query: SELECT * FROM users');
    error.stack = 'Error: secret\n    at /home/user/project/lib/db.ts:15:3';

    const handler = async () => {
      throw error;
    };

    const wrapped = withErrorSanitization(handler);
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await wrapped();
    const text = await response.text();

    expect(text).not.toContain('stack');
    expect(text).not.toContain('/home/user');
    expect(text).not.toContain('SELECT');
    expect(text).not.toContain('db.ts');

    consoleErrorSpy.mockRestore();
  });

  it('does not expose file paths in the response', async () => {
    const handler = async () => {
      throw new Error('ENOENT: no such file /app/config/secrets.json');
    };

    const wrapped = withErrorSanitization(handler);
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await wrapped();
    const text = await response.text();

    expect(text).not.toContain('/app/config');
    expect(text).not.toContain('secrets.json');
    expect(text).not.toContain('ENOENT');

    consoleErrorSpy.mockRestore();
  });

  it('logs the full error details server-side', async () => {
    const originalError = new Error('Internal failure details');
    const handler = async () => {
      throw originalError;
    };

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const wrapped = withErrorSanitization(handler);

    await wrapped();

    expect(consoleErrorSpy).toHaveBeenCalledWith('[API Error]', originalError);
    consoleErrorSpy.mockRestore();
  });

  it('handles non-Error throwables (string, object)', async () => {
    const handler = async () => {
      throw 'unexpected string error';
    };

    const wrapped = withErrorSanitization(handler);
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await wrapped();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: 'Internal server error' });

    consoleErrorSpy.mockRestore();
  });

  it('passes arguments through to the handler', async () => {
    const handler = async (request: Request) => {
      const url = new URL(request.url);
      return NextResponse.json({ path: url.pathname });
    };

    const wrapped = withErrorSanitization(handler);
    const request = new Request('http://localhost/api/test');
    const response = await wrapped(request);
    const body = await response.json();

    expect(body).toEqual({ path: '/api/test' });
  });
});
