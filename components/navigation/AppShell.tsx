'use client';

/**
 * App Shell - Main navigation layout with beautiful animations.
 * - Mobile: Bottom navigation with swipe gestures
 * - Desktop: Side navigation with hover effects
 * - Glassmorphism design, animated transitions
 */

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion, type PanInfo } from 'framer-motion';
import { Map, List, Bell, User, Wifi, WifiOff, Moon, Sun, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useOfflineSync } from '@/lib/hooks/useOfflineSync';
import { Logo, Wordmark } from '@/components/brand/Logo';
import { MotivationalTagline } from '@/components/brand/MotivationalTagline';

export type TabId = 'map' | 'list' | 'notifications' | 'profile';

interface AppShellProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  children: React.ReactNode;
  isLive?: boolean;
}

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'map', label: 'Mapa', icon: Map },
  { id: 'list', label: 'Lista', icon: List },
  { id: 'notifications', label: 'Powiadomienia', icon: Bell },
  { id: 'profile', label: 'Profil', icon: User },
];

const TAB_ORDER: TabId[] = ['map', 'list', 'notifications', 'profile'];
const SWIPE_VELOCITY = 300;
const SWIPE_DISTANCE = 80;

export function AppShell({ activeTab, onTabChange, children, isLive }: AppShellProps) {
  const prefersReducedMotion = useReducedMotion();
  const { isOnline } = useOfflineSync();
  const { mode, setMode } = useTheme();
  const prevIndexRef = useRef(TAB_ORDER.indexOf(activeTab));
  const currentIndex = TAB_ORDER.indexOf(activeTab);
  const direction = currentIndex > prevIndexRef.current ? 1 : -1;
  prevIndexRef.current = currentIndex;

  const [themeMenuOpen, setThemeMenuOpen] = useState(false);

  const handleSwipe = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const { offset, velocity } = info;
      let swipeDir: 'left' | 'right' | null = null;

      if (Math.abs(velocity.x) > SWIPE_VELOCITY) {
        swipeDir = velocity.x > 0 ? 'right' : 'left';
      } else if (Math.abs(offset.x) > SWIPE_DISTANCE) {
        swipeDir = offset.x > 0 ? 'right' : 'left';
      }

      if (!swipeDir) return;
      const idx = TAB_ORDER.indexOf(activeTab);
      if (swipeDir === 'left' && idx < TAB_ORDER.length - 1) onTabChange(TAB_ORDER[idx + 1]);
      if (swipeDir === 'right' && idx > 0) onTabChange(TAB_ORDER[idx - 1]);
    },
    [activeTab, onTabChange]
  );

  const contentVariants = prefersReducedMotion
    ? { enter: {}, center: {}, exit: {} }
    : {
        enter: (dir: number) => ({ x: dir > 0 ? '15%' : '-15%', opacity: 0, scale: 0.97 }),
        center: { x: 0, opacity: 1, scale: 1 },
        exit: (dir: number) => ({ x: dir < 0 ? '15%' : '-15%', opacity: 0, scale: 0.97 }),
      };

  const themeIcons = { light: Sun, dark: Moon, system: Monitor };

  return (
    <div className="flex min-h-[100dvh] max-w-[100vw] overflow-x-hidden bg-background">
      {/* Desktop Sidebar */}
      <nav className="hidden md:flex flex-col w-64 min-w-[256px] h-[100dvh] sticky top-0 border-r border-border/50 bg-card/80 glass z-50">
        {/* Logo + brand */}
        <div className="p-6 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <Logo size={34} />
            <Wordmark className="text-xl" />
          </div>
          <MotivationalTagline className="mt-3" />
        </div>

        {/* Nav items */}
        <div className="flex-1 py-4 px-3 space-y-1">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <motion.button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 touch-manipulation',
                  isActive
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
                whileHover={prefersReducedMotion ? undefined : { x: 4 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
              >
                <Icon className={cn('w-5 h-5', isActive && 'text-primary')} />
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-indicator"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Status & Theme */}
        <div className="p-4 border-t border-border/50 space-y-3">
          {/* Online status */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                <span>{isLive ? 'Na żywo' : 'Online'}</span>
                {isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-orange-500" />
                <span>Offline</span>
              </>
            )}
          </div>

          {/* Theme switcher */}
          <div className="relative">
            <button
              onClick={() => setThemeMenuOpen(!themeMenuOpen)}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full px-2 py-1.5 rounded-md hover:bg-accent"
            >
              {React.createElement(themeIcons[mode], { className: 'w-3.5 h-3.5' })}
              <span>{mode === 'system' ? 'Systemowy' : mode === 'dark' ? 'Ciemny' : 'Jasny'}</span>
            </button>
            {themeMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute bottom-full left-0 mb-1 w-full bg-popover border border-border rounded-lg shadow-lg p-1 z-50"
              >
                {(['light', 'dark', 'system'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => { setMode(m); setThemeMenuOpen(false); }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-xs rounded-md transition-colors',
                      mode === m ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/50'
                    )}
                  >
                    {React.createElement(themeIcons[m], { className: 'w-3.5 h-3.5' })}
                    {m === 'system' ? 'Systemowy' : m === 'dark' ? 'Ciemny' : 'Jasny'}
                  </button>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile top brand bar (sidebar is hidden on mobile) */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 glass border-b border-border/50 flex items-center gap-2 px-4 h-12">
        <Logo size={26} animated={false} />
        <Wordmark className="text-base" />
        {isLive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
      </div>

      {/* Main content */}
      <main className="flex-1 min-w-0 pt-12 md:pt-0 pb-[72px] md:pb-0 relative overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={activeTab}
            custom={direction}
            variants={contentVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 350, damping: 30 }}
            drag={prefersReducedMotion ? false : 'x'}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragEnd={handleSwipe}
            className="w-full min-h-[100dvh] md:min-h-0"
            style={{ touchAction: 'pan-y' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile bottom nav */}
      <motion.nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-border/50 safe-bottom"
        initial={prefersReducedMotion ? false : { y: 80 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        <div className="flex items-center justify-around h-[72px] px-2">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <motion.button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[44px] px-3 py-2 rounded-xl transition-colors touch-manipulation',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.9 }}
              >
                <motion.div
                  animate={prefersReducedMotion ? {} : { scale: isActive ? 1.1 : 1, y: isActive ? -2 : 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                </motion.div>
                <span className={cn('text-[10px] font-medium', isActive && 'font-semibold')}>
                  {tab.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="mobile-tab-indicator"
                    className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Offline indicator */}
        <AnimatePresence>
          {!isOnline && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-orange-500/10 border-t border-orange-500/20 text-center py-1"
            >
              <span className="text-[10px] text-orange-600 dark:text-orange-400 font-medium">
                Tryb offline — dane z pamięci podręcznej
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </div>
  );
}
