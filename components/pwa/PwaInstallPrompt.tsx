'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Window {
    pwaDeferredPrompt?: BeforeInstallPromptEvent | null;
    triggerPwaInstall?: () => Promise<void>;
  }
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      const promptEvent = e as BeforeInstallPromptEvent;
      window.pwaDeferredPrompt = promptEvent;
      setDeferredPrompt(promptEvent);

      const dismissed = sessionStorage.getItem('naetacie_pwa_dismissed');
      if (!dismissed) {
        // Prevent default browser infobar to show custom PWA prompt UI
        e.preventDefault();
        setShowPrompt(true);
      }
    };

    window.triggerPwaInstall = async () => {
      const activePrompt = window.pwaDeferredPrompt || deferredPrompt;
      if (activePrompt) {
        try {
          await activePrompt.prompt();
          await activePrompt.userChoice;
        } catch {
          /* ignore error */
        }
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    const activePrompt = deferredPrompt || window.pwaDeferredPrompt;
    if (!activePrompt) return;
    try {
      setShowPrompt(false);
      await activePrompt.prompt();
      const { outcome } = await activePrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        window.pwaDeferredPrompt = null;
      }
    } catch (err) {
      console.warn('PWA install prompt error:', err);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('naetacie_pwa_dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:bottom-6 z-50 max-w-sm glass border border-primary/30 rounded-2xl p-4 shadow-2xl bg-card/95 backdrop-blur-xl"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-foreground">Zainstaluj NaEtacie</h4>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Dodaj aplikację do ekranu głównego dla powiadomień Push i szybkiego dostępu!
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-accent cursor-pointer"
              aria-label="Zamknij"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/40">
            <Button
              onClick={handleInstallClick}
              size="sm"
              className="flex-1 text-xs font-bold gap-1.5 h-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Zainstaluj teraz
            </Button>
            <Button
              onClick={handleDismiss}
              variant="outline"
              size="sm"
              className="text-xs font-semibold h-8 text-muted-foreground cursor-pointer"
            >
              Później
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

