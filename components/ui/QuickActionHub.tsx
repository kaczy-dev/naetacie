'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, Map, List, Sparkles, Command, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TabId } from '@/components/navigation/AppShell';

interface QuickActionHubProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onRefresh?: () => void;
  onOpenCommandPalette?: () => void;
}

export function QuickActionHub({
  activeTab,
  onTabChange,
  onRefresh,
  onOpenCommandPalette,
}: QuickActionHubProps) {
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-40 flex flex-col items-end gap-2.5 pointer-events-none">
      <AnimatePresence>
        {/* Back to Top Floating QOL Button */}
        {showBackToTop && (
          <motion.button
            key="quick-back-to-top"
            initial={{ scale: 0, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0, y: 10 }}
            onClick={scrollToTop}
            whileHover={{ scale: 1.1, y: -2 }}
            whileTap={{ scale: 0.9 }}
            className="pointer-events-auto p-3 rounded-full bg-card/90 backdrop-blur-md text-foreground border border-border/80 shadow-xl hover:bg-primary hover:text-primary-foreground transition-all duration-200"
            title="Wróć na górę"
            aria-label="Wróć na górę"
          >
            <ArrowUp className="w-4 h-4" />
          </motion.button>
        )}

        {/* View Toggle (Mapa ↔ Lista) Floating Hub */}
        <motion.div
          key="quick-view-toggle"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="pointer-events-auto flex items-center gap-1 p-1.5 rounded-2xl bg-card/85 backdrop-blur-xl border border-border/80 shadow-2xl"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => onTabChange(activeTab === 'map' ? 'list' : 'map')}
            className={cn(
              'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm',
              activeTab === 'map'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-500/25'
                : 'bg-primary text-primary-foreground shadow-primary/25'
            )}
          >
            {activeTab === 'map' ? (
              <>
                <List className="w-3.5 h-3.5" /> <span>Widok Listy</span>
              </>
            ) : (
              <>
                <Map className="w-3.5 h-3.5" /> <span>Widok Mapy 3D</span>
              </>
            )}
          </motion.button>

          {/* Quick Command Palette Button */}
          {onOpenCommandPalette && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onOpenCommandPalette}
              className="p-2 rounded-xl bg-accent/70 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title="Paleta Komend (Ctrl+K)"
            >
              <Command className="w-3.5 h-3.5" />
            </motion.button>
          )}

          {/* Refresh Button */}
          {onRefresh && (
            <motion.button
              whileHover={{ scale: 1.1, rotate: 180 }}
              transition={{ duration: 0.3 }}
              whileTap={{ scale: 0.9 }}
              onClick={onRefresh}
              className="p-2 rounded-xl bg-accent/70 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title="Odśwież oferty na żywo"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </motion.button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
