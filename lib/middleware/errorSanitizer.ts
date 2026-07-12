import { NextResponse } from 'next/server';

/**
 * Wraps a Next.js API route handler with error sanitization.
 *
 * - Catches any unhandled exception thrown by the handler
 * - Logs full error details server-side via console.error
 * - Returns a generic { error: "Internal server error" } response with status 500
 * - Never exposes stack traces, file paths, database queries, or internal identifiers
 */
export function withErrorSanitization<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>
): (...args: T) => Promise<NextResponse> {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error: unknown) {
      // Log full error details server-side for debugging
      console.error('[API Error]', error);

      // Always return a generic error response — never leak internal details
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}
