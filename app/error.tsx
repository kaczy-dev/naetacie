'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

/**
 * Global error boundary — catches runtime errors and shows a friendly UI
 * instead of a blank white page. Logs to console for debugging.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[NaEtacie] Runtime error:', error);
  }, [error]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6 bg-background">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">⚠️</div>
        <h1 className="text-xl font-bold text-foreground mb-2">
          Coś poszło nie tak
        </h1>
        <p className="text-muted-foreground text-sm mb-6">
          Wystąpił nieoczekiwany błąd. Spróbuj odświeżyć stronę.
        </p>
        <div className="flex flex-col gap-2">
          <Button onClick={reset}>Spróbuj ponownie</Button>
          <Button variant="outline" onClick={() => window.location.href = '/'}>
            Strona główna
          </Button>
        </div>
      </div>
    </div>
  );
}
