'use client';

import { useCallback, useState } from 'react';

/**
 * Share an offer via the native Web Share API (mobile) with a clipboard
 * fallback (desktop). Returns a transient "copied" flag for UI feedback.
 */
export function useShare() {
  const [copied, setCopied] = useState(false);

  const share = useCallback(async (opts: { title: string; text?: string; url: string }) => {
    // Native share sheet (mobile browsers, some desktop)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: opts.title, text: opts.text, url: opts.url });
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard
      }
    }

    // Clipboard fallback
    try {
      await navigator.clipboard.writeText(`${opts.title}\n${opts.url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — last resort: nothing we can do silently
    }
  }, []);

  return { share, copied };
}
